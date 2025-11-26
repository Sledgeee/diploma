import { isNumberString } from 'class-validator';

export const prismaSearchByBigInt = (search: string) =>
  isNumberString(search) ? [{ id: BigInt(search) }] : [];
