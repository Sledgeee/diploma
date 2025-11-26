import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Book, Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

interface CreateBookDto {
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  genres?: string[];
  totalCopies: number;
}

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private elasticsearchService: ElasticsearchService,
  ) {}

  async create(data: CreateBookDto): Promise<Book> {
    const book = await this.prisma.book.create({
      data: {
        ...data,
        availableCopies: data.totalCopies || 0,
      },
    });

    // Індексуємо книгу в Elasticsearch
    await this.indexBook(book);

    // Інвалідуємо кеш списку книг
    await this.invalidateBooksListCache();

    return book;
  }

  async findAll(page: number = 1, limit: number = 20) {
    const cacheKey = `books:page:${page}:limit:${limit}`;

    // Перевіряємо кеш
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count(),
    ]);

    const result = { books, total };

    // Кешуємо результат на 5 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      5 * 60 * 1000,
    );

    return result;
  }

  async findOne(id: string): Promise<Book> {
    const cacheKey = `book:${id}`;

    // Перевіряємо кеш
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loans: true,
            reservations: true,
            reviews: true,
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Кешуємо книгу на 10 хвилин
    await this.cacheManager.set(cacheKey, JSON.stringify(book), 10 * 60 * 1000);

    return book;
  }

  async update(id: string, data: Partial<CreateBookDto>): Promise<Book> {
    const book = await this.prisma.book.update({
      where: { id },
      data,
    });

    // Оновлюємо індекс в Elasticsearch
    await this.indexBook(book);

    // Інвалідуємо кеш
    await this.cacheManager.del(`book:${id}`);
    await this.invalidateBooksListCache();

    return book;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.book.delete({
      where: { id },
    });

    // Видаляємо з Elasticsearch
    await this.elasticsearchService
      .delete({
        index: 'books',
        id: id,
      })
      .catch(() => {}); // Ігноруємо помилки якщо документ не знайдено

    // Інвалідуємо кеш
    await this.cacheManager.del(`book:${id}`);
    await this.invalidateBooksListCache();
  }

  async search(query: string, page: number = 1, limit: number = 20) {
    const cacheKey = `books:search:${query}:${page}:${limit}`;

    // Перевіряємо кеш
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    try {
      // Пошук через Elasticsearch
      const { hits } = await this.elasticsearchService.search({
        index: 'books',
        body: {
          from: (page - 1) * limit,
          size: limit,
          query: {
            multi_match: {
              query: query,
              fields: ['title^3', 'author^2', 'description', 'genres'],
              fuzziness: 'AUTO',
            },
          },
        },
      });

      const bookIds = hits.hits.map((hit) => hit._id);

      // Отримуємо повні дані книг з Prisma
      const books = await this.prisma.book.findMany({
        where: {
          id: {
            in: bookIds,
          },
        },
      });

      // Сортуємо книги в тому ж порядку, що й в Elasticsearch
      const sortedBooks = bookIds
        .map((id) => books.find((book) => book.id === id))
        .filter(Boolean);

      const result = {
        books: sortedBooks,
        total: typeof hits.total === 'number' ? hits.total : hits.total.value,
      };

      // Кешуємо результат на 3 хвилини
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(result),
        3 * 60 * 1000,
      );

      return result;
    } catch (error) {
      // Fallback на Prisma якщо Elasticsearch недоступний
      console.error('Elasticsearch error, falling back to Prisma:', error);

      const where: Prisma.BookWhereInput = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { author: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };

      const [books, total] = await Promise.all([
        this.prisma.book.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.book.count({ where }),
      ]);

      return { books, total };
    }
  }

  async getPopularBooks(limit: number = 10): Promise<Book[]> {
    const cacheKey = `books:popular:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const books = await this.prisma.book.findMany({
      orderBy: [{ borrowCount: 'desc' }, { averageRating: 'desc' }],
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

  async getBooksByGenre(genre: string, page: number = 1, limit: number = 20) {
    const cacheKey = `books:genre:${genre}:${page}:${limit}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where: {
          genres: {
            has: genre,
          },
        },
        skip,
        take: limit,
        orderBy: { averageRating: 'desc' },
      }),
      this.prisma.book.count({
        where: {
          genres: {
            has: genre,
          },
        },
      }),
    ]);

    const result = { books, total };

    // Кешуємо на 10 хвилин
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify(result),
      10 * 60 * 1000,
    );

    return result;
  }

  async updateAvailability(bookId: string, increment: number): Promise<void> {
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        availableCopies: {
          increment,
        },
      },
    });

    // Інвалідуємо кеш
    await this.cacheManager.del(`book:${bookId}`);
  }

  async updateBorrowCount(bookId: string): Promise<void> {
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        borrowCount: {
          increment: 1,
        },
      },
    });
  }

  async updateAverageRating(bookId: string): Promise<void> {
    const result = await this.prisma.review.aggregate({
      where: { bookId },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const averageRating = result._avg.rating || 0;

    await this.prisma.book.update({
      where: { id: bookId },
      data: { averageRating },
    });

    // Інвалідуємо кеш
    await this.cacheManager.del(`book:${bookId}`);

    console.log(
      `✅ Updated average rating for book ${bookId}: ${averageRating.toFixed(2)} (${result._count.rating} reviews)`,
    );
  }

  private async indexBook(book: Book): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: 'books',
        id: book.id,
        body: {
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          description: book.description,
          genres: book.genres,
          publisher: book.publisher,
          publishYear: book.publishYear,
          averageRating: book.averageRating,
          borrowCount: book.borrowCount,
        },
      });
    } catch (error) {
      console.error('Failed to index book in Elasticsearch:', error);
    }
  }

  private async invalidateBooksListCache(): Promise<void> {
    const patterns = ['books:page:*', 'books:popular:*', 'books:genre:*'];

    for (const pattern of patterns) {
      try {
        // Redis SCAN для пошуку ключів за патерном
        const keys = this.cacheManager.stores[0]?.iterator;
        if (keys) {
          for await (const key of keys(pattern)) {
            await this.cacheManager.del(key);
          }
        }
      } catch (error) {
        console.error(
          `Error invalidating cache for pattern ${pattern}:`,
          error,
        );
      }
    }
  }
}
