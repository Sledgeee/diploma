import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BorrowBookDto {
  @ApiProperty()
  @IsUUID()
  bookId: string;
}
