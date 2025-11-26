import { genSalt, hash } from 'bcryptjs';

export const hashPassword = async (
  password: string,
  saltRounds: number = 10,
): Promise<string> => {
  const salt = await genSalt(saltRounds);
  const hashed = await hash(password, salt);
  return hashed;
};
