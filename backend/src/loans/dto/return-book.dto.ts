import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReturnBookDto {
  @ApiProperty()
  @IsUUID()
  loanId: string;
}
