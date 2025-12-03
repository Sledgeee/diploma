import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationsService } from './reservations.service';

@Injectable()
export class ReservationsTasksService {
  private readonly logger = new Logger(ReservationsTasksService.name);

  constructor(private readonly reservationsService: ReservationsService) {}

  // Перевіряємо прострочені бронювання кожні 30 хвилин
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleExpireReservations() {
    this.logger.log('⏰ Checking expired reservations...');

    try {
      const count = await this.reservationsService.expireReadyReservations();
      if (count > 0) {
        this.logger.warn(`⚠️ Marked ${count} reservations as expired`);
      } else {
        this.logger.log('✅ No expired reservations found');
      }
    } catch (error) {
      this.logger.error('❌ Error expiring reservations', error);
    }
  }
}
