import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationStatus, UserRole } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto';
import { ReservationsService } from './reservations.service';

@ApiBearerAuth()
@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  async create(@CurrentUser() user, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(user.id, dto.bookId);
  }

  @Get('my')
  async getMy(
    @CurrentUser() user,
    @Query('status') status?: ReservationStatus,
  ) {
    return this.reservationsService.getUserReservations(user.id, status);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @CurrentUser() user) {
    return this.reservationsService.cancelReservation(id, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: ReservationStatus,
  ) {
    return this.reservationsService.getAll(Number(page), Number(limit), status);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.reservationsService.updateStatusByAdmin(id, dto.status);
  }
}
