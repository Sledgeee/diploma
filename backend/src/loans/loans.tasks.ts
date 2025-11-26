import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoansService } from './loans.service';

@Injectable()
export class LoansTasksService {
  private readonly logger = new Logger(LoansTasksService.name);

  constructor(private readonly loansService: LoansService) {}

  // Перевірка прострочених книг щодня о 00:00
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCheckOverdueLoans() {
    this.logger.log('🔍 Checking for overdue loans...');

    try {
      await this.loansService.checkOverdueLoans();
      this.logger.log('✅ Overdue loans check completed');
    } catch (error) {
      this.logger.error('❌ Error checking overdue loans', error);
    }
  }

  // Очищення старих завершених позик (опціонально)
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleCleanupOldLoans() {
    this.logger.log('🧹 Cleaning up old returned loans...');

    // Тут можна додати логіку архівування старих позик
  }
}
