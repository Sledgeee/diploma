import { CanBeUndefined } from '../decorators';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class PaginateDto {
  @ApiProperty({ required: false })
  @CanBeUndefined()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => +value)
  public readonly page: number = 1;

  @ApiProperty({ required: false })
  @CanBeUndefined()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => +value)
  public readonly perPage: number = 50;
}

export class Pagination {
  @ApiProperty()
  page: number;

  @ApiProperty()
  perPage: number;

  @ApiProperty()
  pageCount: number;

  @ApiProperty({ required: false })
  prevPage?: number;

  @ApiProperty({ required: false })
  nextPage?: number;

  @ApiProperty()
  total: number;
}

export class PaginationMetaDto {
  @ApiProperty()
  @Type(() => Pagination)
  meta: Pagination;
}
