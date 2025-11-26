import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getPersonalizedRecommendations(userId: string, limit: number = 10) {
    const cacheKey = `recommendations:user:${userId}:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // Отримуємо історію позик користувача
    const userLoans = await this.prisma.loan.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { borrowDate: 'desc' },
      take: 20,
    });

    if (userLoans.length === 0) {
      return this.getNewUserRecommendations(limit);
    }

    // Збираємо всі жанри з прочитаних книг
    const allGenres = userLoans
      .flatMap((loan) => loan.book.genres)
      .filter(Boolean);

    const genreCounts = allGenres.reduce(
      (acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    // Знаходимо книги з улюбленими жанрами, які користувач ще не читав
    const readBookIds = userLoans.map((loan) => loan.bookId);

    const recommendations = await this.prisma.book.findMany({
      where: {
        AND: [
          { id: { notIn: readBookIds } },
          { availableCopies: { gt: 0 } },
          { genres: { hasSome: topGenres } },
        ],
      },
      orderBy: [{ averageRating: 'desc' }, { borrowCount: 'desc' }],
      take: limit,
    });

    // Кешуємо на 1 годину
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(recommendations),
      60 * 60 * 1000,
    );

    return recommendations;
  }

  async getSimilarBooks(bookId: string, limit: number = 5) {
    const cacheKey = `recommendations:similar:${bookId}:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return [];
    }

    // Шукаємо книги того ж автора або з такими ж жанрами
    const similarBooks = await this.prisma.book.findMany({
      where: {
        AND: [
          { id: { not: bookId } },
          {
            OR: [{ author: book.author }, { genres: { hasSome: book.genres } }],
          },
        ],
      },
      orderBy: [{ averageRating: 'desc' }, { borrowCount: 'desc' }],
      take: limit,
    });

    // Кешуємо на 2 години
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(similarBooks),
      2 * 60 * 60 * 1000,
    );

    return similarBooks;
  }

  async getTrendingBooks(limit: number = 10) {
    const cacheKey = `recommendations:trending:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Книги з найбільшою кількістю позик за останній місяць
    const trendingBooks = await this.prisma.book.findMany({
      where: {
        loans: {
          some: {
            borrowDate: {
              gte: oneMonthAgo,
            },
          },
        },
      },
      orderBy: [{ borrowCount: 'desc' }, { averageRating: 'desc' }],
      take: limit,
    });

    // Кешуємо на 30 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(trendingBooks),
      30 * 60 * 1000,
    );

    return trendingBooks;
  }

  async getNewUserRecommendations(limit: number = 10) {
    const cacheKey = `recommendations:new-user:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const topBooks = await this.prisma.book.findMany({
      where: { availableCopies: { gt: 0 } },
      orderBy: [{ averageRating: 'desc' }, { borrowCount: 'desc' }],
      take: limit,
    });

    // Кешуємо на 6 годин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(topBooks),
      6 * 60 * 60 * 1000,
    );

    return topBooks;
  }

  async getByGenre(genre: string, userId: string, limit: number = 10) {
    const cacheKey = `recommendations:genre:${genre}:user:${userId}:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // Отримуємо книги які користувач вже читав
    const userLoans = await this.prisma.loan.findMany({
      where: { userId },
      select: { bookId: true },
    });

    const readBookIds = userLoans.map((loan) => loan.bookId);

    // Знаходимо книги з цього жанру, які користувач не читав
    const books = await this.prisma.book.findMany({
      where: {
        AND: [
          { genres: { has: genre } },
          { id: { notIn: readBookIds } },
          { availableCopies: { gt: 0 } },
        ],
      },
      orderBy: [{ averageRating: 'desc' }, { borrowCount: 'desc' }],
      take: limit,
    });

    // Кешуємо на 30 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(books),
      30 * 60 * 1000,
    );

    return books;
  }
}
