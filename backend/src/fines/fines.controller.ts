import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FineStatus, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { FinesService } from './fines.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('fines')
@UseGuards(JwtAuthGuard)
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  @Get('my')
  async getMyFines(@Request() req, @Query('status') status?: FineStatus) {
    return this.finesService.getUserFines(req.user.id, status);
  }

  @Post(':id/pay')
  async payFine(@Param('id') id: string, @Request() req) {
    return this.finesService.payFine(id, req.user.id);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async getStatistics() {
    return this.finesService.getFineStatistics();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async getAllFines(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: FineStatus,
  ) {
    return this.finesService.getAllFines(Number(page), Number(limit), status);
  }

  @Patch(':id/waive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async waiveFine(@Param('id') id: string) {
    return this.finesService.waiveFine(id);
  }
}
