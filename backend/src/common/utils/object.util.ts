import { Prisma } from '@prisma/client';

export const listNonUndefinedFields = (obj: object): string[] => {
  const keys: string[] = [];

  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      keys.push(key);
    }
  });

  return keys;
};
