import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateSystemMessageDto } from './dto';

@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('connected-users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  getConnectedUsers() {
    const users = this.notificationsService.getConnectedUsers();
    return {
      count: users.length,
      users,
    };
  }

  @Get('check/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  checkUserConnection(@Param('userId') userId: string) {
    const isConnected = this.notificationsService.isUserConnected(userId);
    return {
      userId,
      connected: isConnected,
    };
  }

  @Post('system-message')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async sendSystemMessage(@Body() data: CreateSystemMessageDto) {
    const sent = await this.notificationsService.sendSystemMessage(
      data.message,
      data.userId,
    );

    return {
      success: sent,
      message: data.userId
        ? `Sent to user ${data.userId}`
        : 'Broadcast to all users',
    };
  }

  @Post('test/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async sendTestNotification(@Param('userId') userId: string) {
    const sent = await this.notificationsService.sendSystemMessage(
      'Це тестове повідомлення від системи',
      userId,
    );

    return {
      success: sent,
      userId,
      message: sent ? 'Test notification sent' : 'User not connected',
    };
  }
}
