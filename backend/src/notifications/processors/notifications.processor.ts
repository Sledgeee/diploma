import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';

@Processor('notifications')
@Injectable()
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('loan-reminder')
  async handleLoanReminder(job: Job) {
    const { userId, bookTitle } = job.data;

    this.logger.log(
      `📚 Sending loan reminder to user ${userId} for book "${bookTitle}"`,
    );

    await this.notificationsService.sendOverdueNotification(
      userId,
      bookTitle,
      1,
    );

    // Тут можна додати відправку email через nodemailer
    // await this.mailerService.sendLoanReminder(userId, bookTitle);

    return { success: true, userId, bookTitle };
  }

  @Process('overdue-notification')
  async handleOverdueNotification(job: Job) {
    const { userId, bookTitle } = job.data;

    this.logger.warn(
      `⚠️ Sending overdue notification to user ${userId} for book "${bookTitle}"`,
    );

    await this.notificationsService.sendOverdueNotification(
      userId,
      bookTitle,
      1,
    );

    // Відправка email про прострочення
    // await this.mailerService.sendOverdueNotification(userId, bookTitle);

    return { success: true, userId, bookTitle };
  }

  @Process('fine-notification')
  async handleFineNotification(job: Job) {
    const { userId, amount } = job.data;

    this.logger.warn(
      `💰 Sending fine notification to user ${userId}, amount: ${amount} грн`,
    );

    // Відправка email про штраф
    // await this.mailerService.sendFineNotification(userId, amount);

    return { success: true, userId, amount };
  }

  @Process('reservation-ready')
  async handleReservationReady(job: Job) {
    const { userId, bookTitle } = job.data;

    this.logger.log(`✅ Book "${bookTitle}" is ready for user ${userId}`);

    // Відправка email про готовність книги
    // await this.mailerService.sendReservationReady(userId, bookTitle);

    return { success: true, userId, bookTitle };
  }
}
