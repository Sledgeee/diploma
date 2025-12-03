import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { PrismaService } from 'nestjs-prisma';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ReservationsService } from '../reservations/reservations.service';
import { getQueueToken } from '@nestjs/bull';

describe('LoansService', () => {
  let service: LoansService;
  const prismaMock = {
    loan: { findUnique: jest.fn() },
    book: { findUnique: jest.fn() },
    fine: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const cacheMock = { del: jest.fn(), get: jest.fn(), set: jest.fn() };
  const reservationsMock = {
    releaseExpiredForBook: jest.fn(),
    activateNextReservation: jest.fn(),
  };
  const queueMock = { add: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CACHE_MANAGER, useValue: cacheMock },
        { provide: ReservationsService, useValue: reservationsMock },
        { provide: getQueueToken('notifications'), useValue: queueMock },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returnBook throws when not found', async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn({ loan: prismaMock.loan, book: {}, fine: {} }),
    );
    prismaMock.loan.findUnique.mockResolvedValue(null);
    await expect(service.returnBook('missing')).rejects.toBeDefined();
  });
});
