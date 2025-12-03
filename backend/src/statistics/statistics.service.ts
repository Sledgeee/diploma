import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getDashboardStats() {
    const cacheKey = 'statistics:dashboard';

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const [
      totalUsers,
      activeUsers,
      totalBooks,
      activeLoans,
      totalRevenue,
      overdueLoans,
      pendingReservations,
      totalReviews,
      availableBooks,
      totalFines,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.book.count(),
      this.prisma.loan.count({ where: { status: 'ACTIVE' } }),
      this.prisma.fine.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.loan.count({ where: { status: 'OVERDUE' } }),
      this.prisma.reservation.count({ where: { status: 'PENDING' } }),
      this.prisma.review.count(),
      this.prisma.book.aggregate({
        _sum: { availableCopies: true },
      }),
      this.prisma.fine.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      totalBooks,
      activeLoans,
      totalRevenue: totalRevenue._sum.amount || 0,
      overdueLoans,
      pendingReservations,
      totalReviews,
      availableBooks: availableBooks._sum.availableCopies || 0,
      pendingFines: totalFines._sum.amount || 0,
    };

    // Кешуємо на 5 хвилин
    await this.cacheManager.set(cacheKey, JSON.stringify(stats), 5 * 60 * 1000);

    return stats;
  }

  async getPopularGenres(limit: number = 10) {
    const cacheKey = `statistics:popular-genres:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const books = await this.prisma.book.findMany({
      select: {
        genres: true,
        borrowCount: true,
        averageRating: true,
      },
    });

    const genreStats = books.reduce(
      (acc, book) => {
        book.genres.forEach((genre) => {
          if (!acc[genre]) {
            acc[genre] = {
              genre,
              booksCount: 0,
              totalBorrows: 0,
              averageRating: 0,
              ratingSum: 0,
            };
          }
          acc[genre].booksCount += 1;
          acc[genre].totalBorrows += book.borrowCount;
          acc[genre].ratingSum += Number(book.averageRating);
        });
        return acc;
      },
      {} as Record<string, any>,
    );

    const result = Object.values(genreStats)
      .map((stat: any) => ({
        genre: stat.genre,
        booksCount: stat.booksCount,
        totalBorrows: stat.totalBorrows,
        averageRating: (stat.ratingSum / stat.booksCount).toFixed(2),
      }))
      .sort((a: any, b: any) => b.totalBorrows - a.totalBorrows)
      .slice(0, limit);

    // Кешуємо на 1 годину
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      60 * 60 * 1000,
    );

    return result;
  }

  async getMonthlyStats(months: number = 6) {
    const cacheKey = `statistics:monthly:${months}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const [loans, registrations] = await Promise.all([
      this.prisma.loan.findMany({
        where: {
          borrowDate: {
            gte: startDate,
          },
        },
        select: {
          borrowDate: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
        },
      }),
    ]);

    const monthlyData: Record<
      string,
      { loans: number; registrations: number }
    > = {};

    // Ініціалізуємо всі місяці
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyData[monthKey] = { loans: 0, registrations: 0 };
    }

    // Рахуємо позики
    loans.forEach((loan) => {
      const month = loan.borrowDate.toISOString().slice(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].loans += 1;
      }
    });

    // Рахуємо реєстрації
    registrations.forEach((user) => {
      const month = user.createdAt.toISOString().slice(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].registrations += 1;
      }
    });

    const result = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        loans: data.loans,
        registrations: data.registrations,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Кешуємо на 1 годину
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      60 * 60 * 1000,
    );

    return result;
  }

  async getTopReaders(limit: number = 10) {
    const cacheKey = `statistics:top-readers:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const topReaders = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: 'READER',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            loans: {
              where: {
                status: 'RETURNED',
              },
            },
          },
        },
      },
      orderBy: {
        loans: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    const result = topReaders.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      booksRead: user._count.loans,
    }));

    // Кешуємо на 30 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      30 * 60 * 1000,
    );

    return result;
  }

  async getOverdueBooks() {
    const cacheKey = 'statistics:overdue-books';

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        status: 'OVERDUE',
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
            coverImage: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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
      orderBy: {
        dueDate: 'asc',
      },
    });

    const result = overdueLoans.map((loan) => {
      const now = new Date();
      const daysOverdue = Math.ceil(
        (now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        loanId: loan.id,
        book: loan.book,
        user: loan.user,
        borrowDate: loan.borrowDate,
        dueDate: loan.dueDate,
        daysOverdue,
        fine: loan.fine,
      };
    });

    // Кешуємо на 5 хвилин (часто міняється)
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      5 * 60 * 1000,
    );

    return result;
  }

  async getRevenueStats() {
    const cacheKey = 'statistics:revenue';

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const [totalRevenue, pendingRevenue, thisMonthRevenue] = await Promise.all([
      this.prisma.fine.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.fine.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.fine.aggregate({
        where: {
          status: 'PAID',
          paidDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const monthlyRevenue = await this.getMonthlyRevenue();

    const result = {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalPaidFines: totalRevenue._count,
      pendingRevenue: pendingRevenue._sum.amount || 0,
      pendingFines: pendingRevenue._count,
      thisMonthRevenue: thisMonthRevenue._sum.amount || 0,
      monthlyRevenue,
    };

    // Кешуємо на 10 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      10 * 60 * 1000,
    );

    return result;
  }

  private async getMonthlyRevenue() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const fines = await this.prisma.fine.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        amount: true,
        paidDate: true,
      },
    });

    const monthlyData: Record<string, number> = {};

    fines.forEach((fine) => {
      if (fine.paidDate) {
        const month = fine.paidDate.toISOString().slice(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + Number(fine.amount);
      }
    });

    return Object.entries(monthlyData)
      .map(([month, amount]) => ({
        month,
        revenue: amount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getBooksStatistics() {
    const cacheKey = 'statistics:books';

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const [
      totalBooks,
      availableBooks,
      borrowedBooks,
      mostBorrowedBook,
      highestRatedBook,
    ] = await Promise.all([
      this.prisma.book.count(),
      this.prisma.book.count({
        where: { availableCopies: { gt: 0 } },
      }),
      this.prisma.book.count({
        where: { availableCopies: 0 },
      }),
      this.prisma.book.findFirst({
        orderBy: { borrowCount: 'desc' },
        select: {
          id: true,
          title: true,
          author: true,
          borrowCount: true,
        },
      }),
      this.prisma.book.findFirst({
        where: {
          reviews: {
            some: {},
          },
        },
        orderBy: { averageRating: 'desc' },
        select: {
          id: true,
          title: true,
          author: true,
          averageRating: true,
          _count: {
            select: { reviews: true },
          },
        },
      }),
    ]);

    const result = {
      totalBooks,
      availableBooks,
      borrowedBooks,
      mostBorrowedBook,
      highestRatedBook,
    };

    // Кешуємо на 15 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      15 * 60 * 1000,
    );

    return result;
  }
}
