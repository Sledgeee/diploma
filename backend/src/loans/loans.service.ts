import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookStatus, FineStatus, Loan, LoanStatus } from '@prisma/client';
import { Queue } from 'bull';
import { Cache } from 'cache-manager';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class LoansService {
  private readonly LOAN_PERIOD_DAYS = 14;
  private readonly FINE_PER_DAY = 5;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications')
    private notificationsQueue: Queue,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async borrowBook(userId: string, bookId: string): Promise<Loan> {
    // Використовуємо транзакцію для атомарності операції
    return await this.prisma
      .$transaction(async (tx) => {
        // Перевіряємо наявність користувача та книги
        const [user, book] = await Promise.all([
          tx.user.findUnique({ where: { id: userId } }),
          tx.book.findUnique({ where: { id: bookId } }),
        ]);

        if (!user || !book) {
          throw new NotFoundException('User or book not found');
        }

        // Перевіряємо чи користувач активний
        if (!user.isActive) {
          throw new BadRequestException('Your account is not active');
        }

        // Перевіряємо чи користувач не має прострочених книг
        const overdueLoans = await tx.loan.count({
          where: {
            userId,
            status: LoanStatus.OVERDUE,
          },
        });

        if (overdueLoans > 0) {
          throw new BadRequestException(
            'You have overdue books. Please return them first.',
          );
        }

        // Перевіряємо чи є неоплачені штрафи
        const unpaidFines = await tx.fine.count({
          where: {
            userId,
            status: FineStatus.PENDING,
          },
        });

        if (unpaidFines > 0) {
          throw new BadRequestException(
            'You have unpaid fines. Please pay them first.',
          );
        }

        // Перевіряємо доступність книги
        if (book.availableCopies <= 0) {
          throw new BadRequestException('Book is not available for borrowing');
        }

        // Перевіряємо чи користувач не взяв вже цю книгу
        const activeLoans = await tx.loan.count({
          where: {
            userId,
            bookId,
            status: LoanStatus.ACTIVE,
          },
        });

        if (activeLoans > 0) {
          throw new BadRequestException('You already borrowed this book');
        }

        const borrowDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + this.LOAN_PERIOD_DAYS);

        // Створюємо позику
        const loan = await tx.loan.create({
          data: {
            userId,
            bookId,
            borrowDate,
            dueDate,
            status: LoanStatus.ACTIVE,
          },
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
                isbn: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Оновлюємо доступність книги
        await tx.book.update({
          where: { id: bookId },
          data: {
            availableCopies: {
              decrement: 1,
            },
            borrowCount: {
              increment: 1,
            },
            status:
              book.availableCopies - 1 === 0
                ? BookStatus.BORROWED
                : book.status,
          },
        });

        return loan;
      })
      .then(async (loan) => {
        // Після успішної транзакції додаємо задачу для сповіщення
        const reminderDate = new Date(loan.dueDate);
        reminderDate.setDate(reminderDate.getDate() - 2);

        const delay = Math.max(0, reminderDate.getTime() - Date.now());

        await this.notificationsQueue.add(
          'loan-reminder',
          {
            loanId: loan.id,
            userId: loan.userId,
            bookTitle: loan.book.title,
          },
          { delay },
        );

        // Інвалідуємо кеш
        await this.invalidateLoansCache(userId);
        await this.cacheManager.del(`book:${bookId}`);

        return loan;
      });
  }

  async returnBook(loanId: string): Promise<Loan> {
    return await this.prisma
      .$transaction(async (tx) => {
        const loan = await tx.loan.findUnique({
          where: { id: loanId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
              },
            },
          },
        });

        if (!loan) {
          throw new NotFoundException('Loan not found');
        }

        if (loan.status === LoanStatus.RETURNED) {
          throw new BadRequestException('Book already returned');
        }

        const returnDate = new Date();

        // Оновлюємо позику
        const updatedLoan = await tx.loan.update({
          where: { id: loanId },
          data: {
            returnDate,
            status: LoanStatus.RETURNED,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
              },
            },
          },
        });

        // Перевіряємо чи є прострочення
        if (returnDate > loan.dueDate) {
          const daysOverdue = Math.ceil(
            (returnDate.getTime() - loan.dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          const fineAmount = daysOverdue * this.FINE_PER_DAY;

          // Створюємо штраф
          const fine = await tx.fine.create({
            data: {
              userId: loan.userId,
              loanId: loan.id,
              amount: fineAmount,
              reason: `Book returned ${daysOverdue} day(s) late`,
              status: FineStatus.PENDING,
            },
          });

          // Додаємо задачу для сповіщення про штраф
          await this.notificationsQueue.add('fine-notification', {
            userId: loan.userId,
            loanId: loan.id,
            fineId: fine.id,
            amount: fineAmount,
          });
        }

        // Оновлюємо доступність книги
        await tx.book.update({
          where: { id: loan.bookId },
          data: {
            availableCopies: {
              increment: 1,
            },
            status: BookStatus.AVAILABLE,
          },
        });

        return updatedLoan;
      })
      .then(async (loan) => {
        // Інвалідуємо кеш
        await this.invalidateLoansCache(loan.userId);
        await this.cacheManager.del(`book:${loan.bookId}`);

        return loan;
      });
  }

  async getUserLoans(userId: string, status?: LoanStatus) {
    const cacheKey = `loans:user:${userId}:${status || 'all'}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
            isbn: true,
          },
        },
        fine: {
          select: {
            id: true,
            amount: true,
            status: true,
            reason: true,
            createdAt: true,
          },
        },
      },
      orderBy: { borrowDate: 'desc' },
    });

    // Кешуємо на 2 хвилини
    await this.cacheManager.set(cacheKey, JSON.stringify(loans), 2 * 60 * 1000);

    return loans;
  }

  async getLoanById(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
            isbn: true,
            publisher: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        fine: {
          select: {
            id: true,
            amount: true,
            status: true,
            reason: true,
            paidDate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return loan;
  }

  async getAllLoans(page: number = 1, limit: number = 20, status?: LoanStatus) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [loans, total] = await Promise.all([
      this.prisma.loan.findMany({
        where,
        skip,
        take: limit,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              isbn: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          fine: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { borrowDate: 'desc' },
      }),
      this.prisma.loan.count({ where }),
    ]);

    return { loans, total, page, limit };
  }

  async checkOverdueLoans(): Promise<number> {
    const now = new Date();

    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        status: LoanStatus.ACTIVE,
        dueDate: {
          lt: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
      },
    });

    for (const loan of overdueLoans) {
      // Оновлюємо статус позики
      await this.prisma.loan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.OVERDUE },
      });

      // Додаємо задачу для сповіщення про прострочення
      await this.notificationsQueue.add('overdue-notification', {
        userId: loan.userId,
        loanId: loan.id,
        bookTitle: loan.book.title,
      });

      // Інвалідуємо кеш
      await this.invalidateLoansCache(loan.userId);
    }

    console.log(`✅ Checked and updated ${overdueLoans.length} overdue loans`);
    return overdueLoans.length;
  }

  async getLoanStatistics() {
    const cacheKey = 'loans:statistics';

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const [
      totalLoans,
      activeLoans,
      overdueLoans,
      returnedLoans,
      todayLoans,
      thisWeekLoans,
      thisMonthLoans,
    ] = await Promise.all([
      this.prisma.loan.count(),
      this.prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
      this.prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
      this.prisma.loan.count({ where: { status: LoanStatus.RETURNED } }),
      this.prisma.loan.count({
        where: {
          borrowDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.loan.count({
        where: {
          borrowDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.loan.count({
        where: {
          borrowDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const statistics = {
      totalLoans,
      activeLoans,
      overdueLoans,
      returnedLoans,
      todayLoans,
      thisWeekLoans,
      thisMonthLoans,
    };

    // Кешуємо на 5 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(statistics),
      5 * 60 * 1000,
    );

    return statistics;
  }

  async extendLoan(loanId: string, days: number = 7) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException('Can only extend active loans');
    }

    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + days);

    const updatedLoan = await this.prisma.loan.update({
      where: { id: loanId },
      data: { dueDate: newDueDate },
      include: {
        book: true,
        user: true,
      },
    });

    // Інвалідуємо кеш
    await this.invalidateLoansCache(loan.userId);

    return updatedLoan;
  }

  private async invalidateLoansCache(userId: string): Promise<void> {
    const statuses = [
      LoanStatus.ACTIVE,
      LoanStatus.OVERDUE,
      LoanStatus.RETURNED,
    ];

    await this.cacheManager.del(`loans:user:${userId}:all`);

    for (const status of statuses) {
      await this.cacheManager.del(`loans:user:${userId}:${status}`);
    }

    await this.cacheManager.del('loans:statistics');
  }
}
