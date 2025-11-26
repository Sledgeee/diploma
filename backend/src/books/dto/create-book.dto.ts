import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  MaxLength,
  IsISBN,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty()
  @IsISBN()
  isbn: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  author: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  publisher?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(1000)
  publishYear?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  genres?: string[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalCopies: number;
}
