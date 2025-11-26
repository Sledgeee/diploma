import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBookDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  author?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  publisher?: string;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  publishYear?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  genres?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalCopies?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  availableCopies?: number;
}
