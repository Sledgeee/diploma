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
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Get('my')
  async getMyReviews(@Request() req) {
    return this.reviewsService.getUserReviews(req.user.id);
  }

  @Get('book/:bookId')
  async getBookReviews(
    @Param('bookId') bookId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewsService.getBookReviews(
      bookId,
      Number(page),
      Number(limit),
    );
  }

  @Get('book/:bookId/stats')
  async getBookReviewStats(@Param('bookId') bookId: string) {
    return this.reviewsService.getReviewStats(bookId);
  }

  @Get('top-reviewed')
  async getTopReviewedBooks(@Query('limit') limit: number = 10) {
    return this.reviewsService.getTopReviewedBooks(Number(limit));
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.reviewsService.delete(id, req.user.id);
  }
}
