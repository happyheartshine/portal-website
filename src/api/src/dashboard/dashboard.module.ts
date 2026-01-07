import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SalaryModule } from '../salary/salary.module';

@Module({
  imports: [SalaryModule],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

