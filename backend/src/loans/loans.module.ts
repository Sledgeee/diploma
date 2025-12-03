import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { LoansTasksService } from './loans.tasks';
import { BullModule } from '@nestjs/bull';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    ReservationsModule,
  ],
  controllers: [LoansController],
  providers: [LoansService, LoansTasksService],
  exports: [LoansService],
})
export class LoansModule {}
