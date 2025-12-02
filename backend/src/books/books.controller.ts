// backend/src/books/books.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { multerConfig } from '../common/config';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LIBRARIAN')
  @UseInterceptors(FileInterceptor('coverImage', multerConfig))
  async create(
    @Body() body: any, // Приймаємо як any для FormData
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Створюємо CreateBookDto вручну з правильними типами
    const createBookDto: CreateBookDto = {
      isbn: body.isbn,
      title: body.title,
      author: body.author,
      publisher: body.publisher || '',
      description: body.description || '',
      publishYear: body.publishYear ? parseInt(body.publishYear) : undefined,
      totalCopies: parseInt(body.totalCopies) || 1,
      genres:
        typeof body.genres === 'string' ? JSON.parse(body.genres) : body.genres,
      coverImage: '',
    };

    // Якщо завантажено файл, зберігаємо шлях
    if (file) {
      createBookDto.coverImage = `/uploads/book-covers/${file.filename}`;
    }

    return this.booksService.create(createBookDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LIBRARIAN')
  @UseInterceptors(FileInterceptor('coverImage', multerConfig))
  async update(
    @Param('id') id: string,
    @Body() body: any, // Приймаємо як any для FormData
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Створюємо UpdateBookDto вручну з правильними типами
    const updateBookDto: UpdateBookDto = {};

    if (body.title) updateBookDto.title = body.title;
    if (body.author) updateBookDto.author = body.author;
    if (body.publisher) updateBookDto.publisher = body.publisher;
    if (body.description) updateBookDto.description = body.description;

    // Конвертуємо числові поля
    if (body.publishYear) {
      updateBookDto.publishYear = parseInt(body.publishYear);
    }
    if (body.totalCopies) {
      updateBookDto.totalCopies = parseInt(body.totalCopies);
    }

    // Парсинг genres
    if (body.genres) {
      updateBookDto.genres =
        typeof body.genres === 'string' ? JSON.parse(body.genres) : body.genres;
    }

    // Якщо завантажено новий файл
    if (file) {
      updateBookDto.coverImage = `/uploads/book-covers/${file.filename}`;
    }

    return this.booksService.update(id, updateBookDto);
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.booksService.findAll(page, limit);
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.booksService.search(query, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.booksService.delete(id);
  }
}
