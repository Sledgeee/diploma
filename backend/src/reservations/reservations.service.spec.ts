import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { PrismaModule, PrismaService } from 'nestjs-prisma';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;
  const prismaMock = {
    reservation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    book: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    loan: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const cacheMock = { del: jest.fn() };
  const notificationsMock = {
    sendReservationReady: jest.fn(),
    sendReservationExpired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule.forRoot()],
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CACHE_MANAGER, useValue: cacheMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create throws when user not found', async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn({
        user: prismaMock.user,
        book: prismaMock.book,
        reservation: prismaMock.reservation,
        loan: prismaMock.loan,
      }),
    );
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.book.findUnique.mockResolvedValue({
      id: 'b1',
      availableCopies: 1,
    });

    await expect(service.create('u1', 'b1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cancelReservation throws when not owner', async () => {
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: 'r1',
      userId: 'other',
      status: 'PENDING',
    });
    await expect(service.cancelReservation('r1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
