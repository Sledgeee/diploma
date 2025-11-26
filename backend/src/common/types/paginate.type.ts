import { Pagination } from '../dto';

export type ListResponse<T> = {
  list: T[];
  meta: Pagination;
};
