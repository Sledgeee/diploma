import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { LoansTasksService } from './loans.tasks';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [LoansController],
  providers: [LoansService, LoansTasksService],
  exports: [LoansService],
})
export class LoansModule {}
