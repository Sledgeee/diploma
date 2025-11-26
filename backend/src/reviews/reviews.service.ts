import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { BooksService } from '../books/books.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from 'nestjs-prisma';

interface CreateReviewDto {
  bookId: string;
  rating: number;
  comment?: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booksService: BooksService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    // Перевіряємо чи існує книга
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Перевіряємо чи користувач брав цю книгу та повернув її
    const hasReturnedLoan = await this.prisma.loan.findFirst({
      where: {
        userId,
        bookId: dto.bookId,
        status: 'RETURNED',
      },
    });

    if (!hasReturnedLoan) {
      throw new BadRequestException(
        'You must borrow and return this book before reviewing it',
      );
    }

    // Перевіряємо чи вже є відгук
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: dto.bookId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this book');
    }

    // Валідація рейтингу
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Створюємо відгук
    const review = await this.prisma.review.create({
      data: {
        userId,
        bookId: dto.bookId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: {
          select: {
            id: true,
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

    // Оновлюємо середній рейтинг книги
    await this.booksService.updateAverageRating(dto.bookId);

    // Інвалідуємо кеш
    await this.invalidateReviewsCache(dto.bookId);
    await this.cacheManager.del(`book:${dto.bookId}`);

    return review;
  }

  async getBookReviews(bookId: string, page: number = 1, limit: number = 10) {
    const cacheKey = `reviews:book:${bookId}:${page}:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: { bookId },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { bookId } }),
      this.getReviewStats(bookId),
    ]);

    const result = { reviews, total, stats };

    // Кешуємо на 5 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      5 * 60 * 1000,
    );

    return result;
  }

  async getUserReviews(userId: string) {
    const cacheKey = `reviews:user:${userId}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const reviews = await this.prisma.review.findMany({
      where: { userId },
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
      orderBy: { createdAt: 'desc' },
    });

    // Кешуємо на 5 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(reviews),
      5 * 60 * 1000,
    );

    return reviews;
  }

  async update(
    reviewId: string,
    userId: string,
    dto: Partial<CreateReviewDto>,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('You can only edit your own reviews');
    }

    // Валідація рейтингу якщо він передається
    if (dto.rating && (dto.rating < 1 || dto.rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: {
          select: {
            id: true,
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

    // Оновлюємо середній рейтинг книги
    await this.booksService.updateAverageRating(review.bookId);

    // Інвалідуємо кеш
    await this.invalidateReviewsCache(review.bookId);
    await this.cacheManager.del(`reviews:user:${userId}`);
    await this.cacheManager.del(`book:${review.bookId}`);

    return updatedReview;
  }

  async delete(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Оновлюємо середній рейтинг книги
    await this.booksService.updateAverageRating(review.bookId);

    // Інвалідуємо кеш
    await this.invalidateReviewsCache(review.bookId);
    await this.cacheManager.del(`reviews:user:${userId}`);
    await this.cacheManager.del(`book:${review.bookId}`);

    return { message: 'Review deleted successfully' };
  }

  async getReviewStats(bookId: string) {
    const stats = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { bookId },
      _count: {
        rating: true,
      },
    });

    // Форматуємо статистику
    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => {
      const stat = stats.find((s) => s.rating === rating);
      return {
        rating,
        count: stat?._count.rating || 0,
      };
    });

    const totalReviews = stats.reduce(
      (sum, stat) => sum + stat._count.rating,
      0,
    );
    const averageRating = await this.prisma.review.aggregate({
      where: { bookId },
      _avg: { rating: true },
    });

    return {
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution,
    };
  }

  async getTopReviewedBooks(limit: number = 10) {
    const cacheKey = `reviews:top-reviewed:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const books = await this.prisma.book.findMany({
      include: {
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: {
        reviews: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    // Кешуємо на 1 годину
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(books),
      60 * 60 * 1000,
    );

    return books;
  }

  private async invalidateReviewsCache(bookId: string): Promise<void> {
    const keys = [`reviews:book:${bookId}:*`, 'reviews:top-reviewed:*'];
    for (const pattern of keys) {
      const cacheKeys = this.cacheManager.stores[0]?.iterator;
      if (cacheKeys) {
        for await (const key of cacheKeys(pattern)) {
          await this.cacheManager.del(key);
        }
      }
    }
  }
}
