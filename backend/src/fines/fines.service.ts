import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FineStatus } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class FinesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserFines(userId: string, status?: FineStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.fine.findMany({
      where,
      include: {
        loan: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllFines(page: number = 1, limit: number = 20, status?: FineStatus) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [fines, total] = await Promise.all([
      this.prisma.fine.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          loan: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  author: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fine.count({ where }),
    ]);

    return { fines, total };
  }

  async payFine(fineId: string, userId: string) {
    const fine = await this.prisma.fine.findUnique({
      where: { id: fineId },
      include: { user: true },
    });

    if (!fine) {
      throw new NotFoundException('Fine not found');
    }

    if (fine.userId !== userId) {
      throw new BadRequestException('This is not your fine');
    }

    if (fine.status === FineStatus.PAID) {
      throw new BadRequestException('Fine already paid');
    }

    // Оновлюємо статус штрафу
    const updatedFine = await this.prisma.fine.update({
      where: { id: fineId },
      data: {
        status: FineStatus.PAID,
        paidDate: new Date(),
      },
    });

    // Оновлюємо баланс користувача
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          decrement: Number(fine.amount),
        },
      },
    });

    return updatedFine;
  }

  async waiveFine(fineId: string) {
    const fine = await this.prisma.fine.findUnique({ where: { id: fineId } });

    if (!fine) {
      throw new NotFoundException('Fine not found');
    }

    return this.prisma.fine.update({
      where: { id: fineId },
      data: { status: FineStatus.WAIVED },
    });
  }

  async getFineStatistics() {
    const [total, pending, paid, waived, totalAmount, pendingAmount] = await Promise.all([
      this.prisma.fine.count(),
      this.prisma.fine.count({ where: { status: FineStatus.PENDING } }),
      this.prisma.fine.count({ where: { status: FineStatus.PAID } }),
      this.prisma.fine.count({ where: { status: FineStatus.WAIVED } }),
      this.prisma.fine.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.fine.aggregate({
        where: { status: FineStatus.PENDING },
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      pending,
      paid,
      waived,
      totalAmount: totalAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
    };
  }
}
