import { Prisma, PrismaClient } from '@prisma/client';

export type PrismaTx = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never, any>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
