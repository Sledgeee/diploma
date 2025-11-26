import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { BullModule } from '@nestjs/bull';
import { NotificationsProcessor } from './processors';
import { LoansTasksService } from './loans.tasks';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [LoansController],
  providers: [LoansService, LoansTasksService, NotificationsProcessor],
  exports: [LoansService],
})
export class LoansModule {}
