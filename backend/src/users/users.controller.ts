import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { UsersService } from './users.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('role') role?: UserRole,
  ) {
    return this.usersService.findAll(Number(page), Number(limit), role);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user) {
    return this.usersService.findOne(user.id);
  }

  @Put('profile')
  async updateProfile(@CurrentUser() user, @Body() data: any) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateRole(@Param('id') id: string, @Body() data: { role: UserRole }) {
    return this.usersService.updateRole(id, data.role);
  }

  @Put(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }
}
