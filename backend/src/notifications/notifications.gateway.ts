import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5137',
    credentials: true,
  },
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  handleConnection(client: Socket) {
    const userId =
      client.handshake.auth.userId || client.handshake.query.userId;

    if (userId) {
      this.userSockets.set(userId as string, client.id);
      this.logger.log(`✅ User ${userId} connected with socket ${client.id}`);

      // Відправляємо підтвердження підключення
      client.emit('connected', {
        message: 'Successfully connected to notifications',
        userId,
      });
    } else {
      this.logger.warn(`⚠️ Client ${client.id} connected without userId`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.userSockets.delete(userId);
      this.logger.log(`❌ User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.userId) {
      this.userSockets.set(data.userId, client.id);
      this.logger.log(`📝 User ${data.userId} registered manually`);

      return {
        event: 'registered',
        data: { success: true, userId: data.userId },
      };
    }
  }

  // Методи для відправки сповіщень
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);

    if (socketId) {
      this.server.to(socketId).emit(event, data);
      this.logger.log(`📤 Sent ${event} to user ${userId}`);
      return true;
    } else {
      this.logger.warn(`⚠️ User ${userId} not connected, cannot send ${event}`);
      return false;
    }
  }

  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`📢 Broadcast ${event} to all users`);
  }

  sendLoanReminder(userId: string, bookTitle: string, dueDate: Date) {
    return this.sendToUser(userId, 'loan-reminder', {
      type: 'loan-reminder',
      title: 'Нагадування про повернення',
      message: `Книга "${bookTitle}" має бути повернена до ${dueDate.toLocaleDateString()}`,
      bookTitle,
      dueDate,
      timestamp: new Date(),
    });
  }

  sendOverdueNotification(
    userId: string,
    bookTitle: string,
    daysOverdue: number,
  ) {
    return this.sendToUser(userId, 'overdue-notification', {
      type: 'overdue',
      title: 'Прострочена книга',
      message: `Книга "${bookTitle}" прострочена на ${daysOverdue} днів. Будь ласка, поверніть її якнайшвидше!`,
      bookTitle,
      daysOverdue,
      severity: 'error',
      timestamp: new Date(),
    });
  }

  sendFineNotification(userId: string, amount: number, bookTitle?: string) {
    return this.sendToUser(userId, 'fine-notification', {
      type: 'fine',
      title: 'Нараховано штраф',
      message: bookTitle
        ? `Нараховано штраф ${amount} грн за книгу "${bookTitle}"`
        : `Нараховано штраф ${amount} грн`,
      amount,
      bookTitle,
      severity: 'warning',
      timestamp: new Date(),
    });
  }

  sendReservationReady(userId: string, bookTitle: string, expiryDate: Date) {
    return this.sendToUser(userId, 'reservation-ready', {
      type: 'reservation-ready',
      title: 'Книга готова до отримання',
      message: `Книга "${bookTitle}" тепер доступна! Заберіть її до ${expiryDate.toLocaleDateString()}`,
      bookTitle,
      expiryDate,
      severity: 'success',
      timestamp: new Date(),
    });
  }

  sendReservationExpired(userId: string, bookTitle: string) {
    return this.sendToUser(userId, 'reservation-expired', {
      type: 'reservation-expired',
      title: 'Бронювання закінчилось',
      message: `Ваше бронювання книги "${bookTitle}" закінчилось`,
      bookTitle,
      severity: 'info',
      timestamp: new Date(),
    });
  }

  sendSystemMessage(message: string, userId?: string) {
    const data = {
      type: 'system',
      title: 'Системне повідомлення',
      message,
      timestamp: new Date(),
    };

    if (userId) {
      return this.sendToUser(userId, 'system-message', data);
    } else {
      this.sendToAll('system-message', data);
      return true;
    }
  }

  sendNewBookNotification(bookTitle: string, author: string) {
    this.sendToAll('new-book', {
      type: 'new-book',
      title: 'Нова книга в бібліотеці',
      message: `Додано нову книгу: "${bookTitle}" автора ${author}`,
      bookTitle,
      author,
      severity: 'info',
      timestamp: new Date(),
    });
  }

  // Отримати список підключених користувачів
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // Перевірити чи користувач підключений
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Відключити користувача
  disconnectUser(userId: string) {
    const socketId = this.userSockets.get(userId);

    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        this.logger.log(`🔌 Disconnected user ${userId}`);
      }
      this.userSockets.delete(userId);
    }
  }
}
