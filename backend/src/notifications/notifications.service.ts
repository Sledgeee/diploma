import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  async sendLoanReminder(userId: string, bookTitle: string, dueDate: Date) {
    return this.notificationsGateway.sendLoanReminder(userId, bookTitle, dueDate);
  }

  async sendOverdueNotification(userId: string, bookTitle: string, daysOverdue: number) {
    return this.notificationsGateway.sendOverdueNotification(userId, bookTitle, daysOverdue);
  }

  async sendFineNotification(userId: string, amount: number, bookTitle?: string) {
    return this.notificationsGateway.sendFineNotification(userId, amount, bookTitle);
  }

  async sendReservationReady(userId: string, bookTitle: string, expiryDate: Date) {
    return this.notificationsGateway.sendReservationReady(userId, bookTitle, expiryDate);
  }

  async sendReservationExpired(userId: string, bookTitle: string) {
    return this.notificationsGateway.sendReservationExpired(userId, bookTitle);
  }

  async sendSystemMessage(message: string, userId?: string) {
    return this.notificationsGateway.sendSystemMessage(message, userId);
  }

  async sendNewBookNotification(bookTitle: string, author: string) {
    return this.notificationsGateway.sendNewBookNotification(bookTitle, author);
  }

  getConnectedUsers(): string[] {
    return this.notificationsGateway.getConnectedUsers();
  }

  isUserConnected(userId: string): boolean {
    return this.notificationsGateway.isUserConnected(userId);
  }
}