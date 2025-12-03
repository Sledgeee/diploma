import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';

@ApiBearerAuth()
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('personal')
  async getPersonalRecommendations(
    @CurrentUser() user,
    @Query('limit') limit: number = 10,
  ) {
    return this.recommendationsService.getPersonalizedRecommendations(
      user.id,
      Number(limit),
    );
  }

  @Get('similar/:bookId')
  async getSimilarBooks(
    @Param('bookId') bookId: string,
    @Query('limit') limit: number = 5,
  ) {
    return this.recommendationsService.getSimilarBooks(bookId, Number(limit));
  }

  @Get('trending')
  async getTrendingBooks(@Query('limit') limit: number = 10) {
    return this.recommendationsService.getTrendingBooks(Number(limit));
  }

  @Get('new-user')
  async getNewUserRecommendations(@Query('limit') limit: number = 10) {
    return this.recommendationsService.getNewUserRecommendations(Number(limit));
  }

  @Get('by-genre/:genre')
  async getRecommendationsByGenre(
    @Param('genre') genre: string,
    @CurrentUser() user,
    @Query('limit') limit: number = 10,
  ) {
    return this.recommendationsService.getByGenre(
      genre,
      user.id,
      Number(limit),
    );
  }

  @Get('for-user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async getRecommendationsForUser(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.recommendationsService.getPersonalizedRecommendations(
      userId,
      Number(limit),
    );
  }
}
