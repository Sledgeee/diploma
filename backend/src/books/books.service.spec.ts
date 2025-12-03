import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaModule, PrismaService } from 'nestjs-prisma';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ElasticsearchService } from '@nestjs/elasticsearch';

describe('BooksService', () => {
  let service: BooksService;
  const prismaMock = {
    book: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
    },
  };
  const cacheMock = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const esMock = { search: jest.fn(), index: jest.fn(), delete: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule.forRoot()],
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CACHE_MANAGER, useValue: cacheMock },
        { provide: ElasticsearchService, useValue: esMock },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return books from findAll', async () => {
    prismaMock.book.findMany.mockResolvedValue([{ id: '1' }]);
    prismaMock.book.count.mockResolvedValue(1);

    const result = await service.findAll(1, 2);

    expect(prismaMock.book.findMany).toHaveBeenCalled();
    expect(result.total).toBe(1);
  });
});
