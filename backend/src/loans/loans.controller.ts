import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LoanStatus, UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { BorrowBookDto, ExtendLoanDto } from './dto';
import { LoansService } from './loans.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('borrow')
  async borrowBook(@CurrentUser() user, @Body() dto: BorrowBookDto) {
    return this.loansService.borrowBook(user.id, dto.bookId);
  }

  @Post(':id/return')
  async returnBook(@Param('id') id: string) {
    return this.loansService.returnBook(id);
  }

  @Patch(':id/extend')
  async extendLoan(@Param('id') id: string, @Body() dto: ExtendLoanDto) {
    return this.loansService.extendLoan(id, dto.days || 7);
  }

  @Get('my')
  async getMyLoans(@CurrentUser() user, @Query('status') status?: LoanStatus) {
    return this.loansService.getUserLoans(user.id, status);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async getStatistics() {
    return this.loansService.getLoanStatistics();
  }

  @Get(':id')
  async getLoanById(@Param('id') id: string) {
    return this.loansService.getLoanById(id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async getAllLoans(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: LoanStatus,
  ) {
    return this.loansService.getAllLoans(Number(page), Number(limit), status);
  }

  @Post('check-overdue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  async checkOverdueLoans() {
    const count = await this.loansService.checkOverdueLoans();
    return {
      message: `Checked overdue loans`,
      count,
    };
  }
}
