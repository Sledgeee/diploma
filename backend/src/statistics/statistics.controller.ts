import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.statisticsService.getDashboardStats();
  }

  @Get('popular-genres')
  async getPopularGenres(@Query('limit') limit: number = 10) {
    return this.statisticsService.getPopularGenres(Number(limit));
  }

  @Get('monthly')
  async getMonthlyStats(@Query('months') months: number = 6) {
    return this.statisticsService.getMonthlyStats(Number(months));
  }

  @Get('top-readers')
  async getTopReaders(@Query('limit') limit: number = 10) {
    return this.statisticsService.getTopReaders(Number(limit));
  }

  @Get('overdue-books')
  async getOverdueBooks() {
    return this.statisticsService.getOverdueBooks();
  }
}
