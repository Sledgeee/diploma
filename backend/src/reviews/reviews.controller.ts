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
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';

@ApiBearerAuth()
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async create(@CurrentUser() user, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Get('my')
  async getMyReviews(@CurrentUser() user) {
    return this.reviewsService.getUserReviews(user.id);
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
    @CurrentUser() user,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user) {
    return this.reviewsService.delete(id, user.id);
  }
}
