import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ExtendLoanDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(14)
  @IsOptional()
  days?: number = 7;
}
