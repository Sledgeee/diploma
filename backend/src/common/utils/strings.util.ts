export const randomString = (length: number) =>
  Array.from(Array(length), () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('');
