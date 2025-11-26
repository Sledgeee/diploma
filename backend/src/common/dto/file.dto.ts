import { ApiProperty } from '@nestjs/swagger';

export class FileDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export class FilesDto {
  @ApiProperty({ isArray: true, type: 'string', format: 'binary' })
  files: Express.Multer.File[];
}
