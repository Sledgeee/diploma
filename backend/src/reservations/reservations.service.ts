import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookStatus,
  LoanStatus,
  Reservation,
  ReservationStatus,
} from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from 'nestjs-prisma';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReservationsService {
  private readonly HOLD_DAYS = 3;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.HOLD_DAYS);
    return expiryDate;
  }

  async create(userId: string, bookId: string): Promise<Reservation> {
    return this.prisma
      .$transaction(async (tx) => {
        const [user, book] = await Promise.all([
          tx.user.findUnique({ where: { id: userId } }),
          tx.book.findUnique({ where: { id: bookId } }),
        ]);

        if (!user || !book) {
          throw new NotFoundException('User or book not found');
        }

        if (!user.isActive) {
          throw new BadRequestException('Your account is not active');
        }

        const existingReservation = await tx.reservation.findFirst({
          where: {
            userId,
            bookId,
            status: {
              in: [ReservationStatus.PENDING, ReservationStatus.READY],
            },
          },
        });

        if (existingReservation) {
          throw new BadRequestException(
            'You already have an active reservation for this book',
          );
        }

        const activeLoan = await tx.loan.findFirst({
          where: {
            userId,
            bookId,
            status: {
              in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE],
            },
          },
        });

        if (activeLoan) {
          throw new BadRequestException('You already borrowed this book');
        }

        const status =
          book.availableCopies > 0
            ? ReservationStatus.READY
            : ReservationStatus.PENDING;

        const reservation = await tx.reservation.create({
          data: {
            userId,
            bookId,
            status,
            expiryDate: this.getExpiryDate(),
          },
          include: {
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

        if (status === ReservationStatus.READY) {
          await tx.book.update({
            where: { id: bookId },
            data: {
              availableCopies: {
                decrement: 1,
              },
              status:
                book.availableCopies - 1 <= 0
                  ? BookStatus.RESERVED
                  : book.status,
            },
          });
        }

        return reservation;
      })
      .then(async (reservation) => {
        await this.cacheManager.del(`book:${bookId}`);
        await this.invalidateUserCache(userId);

        if (reservation.status === ReservationStatus.READY) {
          await this.notificationsService.sendReservationReady(
            reservation.userId,
            reservation.book.title,
            reservation.expiryDate,
          );
        }

        return reservation;
      });
  }

  async getUserReservations(userId: string, status?: ReservationStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.reservation.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
            availableCopies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelReservation(id: string, userId: string): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        book: true,
      },
    });

    if (!reservation || reservation.userId !== userId) {
      throw new NotFoundException('Reservation not found');
    }

    if (
      (
        [
          ReservationStatus.COMPLETED,
          ReservationStatus.CANCELLED,
        ] as ReservationStatus[]
      ).includes(reservation.status)
    ) {
      throw new BadRequestException('Reservation is already closed');
    }

    const updatedReservation = await this.prisma
      .$transaction(async (tx) => {
        const result = await tx.reservation.update({
          where: { id },
          data: { status: ReservationStatus.CANCELLED },
          include: {
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

        if (reservation.status === ReservationStatus.READY) {
          await tx.book.update({
            where: { id: reservation.bookId },
            data: {
              availableCopies: {
                increment: 1,
              },
              status: BookStatus.AVAILABLE,
            },
          });
        }

        return result;
      })
      .then(async (result) => {
        await this.cacheManager.del(`book:${reservation.bookId}`);
        await this.invalidateUserCache(userId);
        return result;
      });

    return updatedReservation;
  }

  async getAll(
    page: number = 1,
    limit: number = 20,
    status?: ReservationStatus,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverImage: true,
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { reservations, total, page, limit };
  }

  async activateNextReservation(bookId: string): Promise<Reservation[]> {
    const activated = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: bookId },
        select: {
          id: true,
          title: true,
          author: true,
          availableCopies: true,
          status: true,
        },
      });

      if (!book || book.availableCopies <= 0) {
        return [];
      }

      const pendingReservations = await tx.reservation.findMany({
        where: {
          bookId,
          status: ReservationStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
        take: book.availableCopies,
      });

      if (pendingReservations.length === 0) {
        return [];
      }

      const expiryDate = this.getExpiryDate();
      const updatedReservations = [];

      for (const pending of pendingReservations) {
        const updated = await tx.reservation.update({
          where: { id: pending.id },
          data: {
            status: ReservationStatus.READY,
            expiryDate,
          },
          include: {
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

        updatedReservations.push(updated);
      }

      await tx.book.update({
        where: { id: bookId },
        data: {
          availableCopies: {
            decrement: pendingReservations.length,
          },
          status:
            book.availableCopies - pendingReservations.length <= 0
              ? BookStatus.RESERVED
              : book.status,
        },
      });

      return updatedReservations;
    });

    for (const reservation of activated) {
      await this.cacheManager.del(`book:${bookId}`);
      await this.invalidateUserCache(reservation.userId);

      await this.notificationsService.sendReservationReady(
        reservation.userId,
        reservation.book.title,
        reservation.expiryDate,
      );
    }

    return activated;
  }

  async expireReadyReservations(): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.READY,
        expiryDate: {
          lt: now,
        },
      },
      include: {
        book: true,
      },
    });

    for (const reservation of expired) {
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.EXPIRED },
      });

      await this.prisma.book.update({
        where: { id: reservation.bookId },
        data: {
          availableCopies: {
            increment: 1,
          },
          status: BookStatus.AVAILABLE,
        },
      });

      await this.cacheManager.del(`book:${reservation.bookId}`);
      await this.invalidateUserCache(reservation.userId);

      await this.notificationsService.sendReservationExpired(
        reservation.userId,
        reservation.book.title,
      );
    }

    return expired.length;
  }

  async releaseExpiredForBook(bookId: string): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.reservation.findMany({
      where: {
        bookId,
        status: ReservationStatus.READY,
        expiryDate: {
          lt: now,
        },
      },
    });

    for (const reservation of expired) {
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.EXPIRED },
      });

      await this.prisma.book.update({
        where: { id: reservation.bookId },
        data: {
          availableCopies: {
            increment: 1,
          },
          status: BookStatus.AVAILABLE,
        },
      });

      await this.cacheManager.del(`book:${reservation.bookId}`);
      await this.invalidateUserCache(reservation.userId);
    }
  }

  async updateStatusByAdmin(
    reservationId: string,
    status: ReservationStatus,
  ): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { book: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === status) {
      return reservation;
    }

    if (
      !(
        [
          ReservationStatus.READY,
          ReservationStatus.CANCELLED,
          ReservationStatus.EXPIRED,
        ] as ReservationStatus[]
      ).includes(status)
    ) {
      throw new BadRequestException('Unsupported status change');
    }

    if (status === ReservationStatus.READY) {
      if (reservation.book.availableCopies <= 0) {
        throw new BadRequestException('No available copies to mark as ready');
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const res = await tx.reservation.update({
          where: { id: reservationId },
          data: {
            status: ReservationStatus.READY,
            expiryDate: this.getExpiryDate(),
          },
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
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
          },
        });

        await tx.book.update({
          where: { id: reservation.bookId },
          data: {
            availableCopies: {
              decrement: 1,
            },
            status:
              reservation.book.availableCopies - 1 <= 0
                ? BookStatus.RESERVED
                : reservation.book.status,
          },
        });

        return res;
      });

      await this.cacheManager.del(`book:${reservation.bookId}`);
      await this.invalidateUserCache(reservation.userId);

      await this.notificationsService.sendReservationReady(
        updated.userId,
        updated.book.title,
        updated.expiryDate,
      );

      return updated;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.reservation.update({
        where: { id: reservationId },
        data: { status },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverImage: true,
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
        },
      });

      if (reservation.status === ReservationStatus.READY) {
        await tx.book.update({
          where: { id: reservation.bookId },
          data: {
            availableCopies: {
              increment: 1,
            },
            status: BookStatus.AVAILABLE,
          },
        });
      }

      return res;
    });

    await this.cacheManager.del(`book:${reservation.bookId}`);
    await this.invalidateUserCache(reservation.userId);

    if (status === ReservationStatus.EXPIRED) {
      await this.notificationsService.sendReservationExpired(
        updated.userId,
        updated.book.title,
      );
    }

    return updated;
  }

  private async invalidateUserCache(userId: string) {
    await this.cacheManager.del(`reservations:user:${userId}:all`);
  }
}
