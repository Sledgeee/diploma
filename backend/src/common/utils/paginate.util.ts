import { ListResponse } from '../types';

type PaginateParams<T> = {
  data: Array<T>;
  count: number;
  page: number;
  perPage: number;
};

export const getTakeSkip = (params: { page: number; perPage: number }) => ({
  take: params.perPage,
  skip: (params.page - 1) * params.perPage,
});

export const paginate = <T>({
  data,
  count,
  page,
  perPage,
}: PaginateParams<T>): ListResponse<T> => {
  const pageCount = Math.ceil(count / perPage);

  const paginated: ListResponse<T> = {
    list: data,
    meta: {
      page,
      pageCount,
      perPage,
      total: count,
    },
  };

  if (page > 1 && page <= pageCount) {
    paginated.meta.prevPage = page - 1;
  }

  if (page < pageCount) {
    paginated.meta.nextPage = page + 1;
  }

  return paginated;
};
