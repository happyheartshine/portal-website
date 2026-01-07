import { Module } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}

