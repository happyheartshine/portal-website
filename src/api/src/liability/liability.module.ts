import { Module } from '@nestjs/common';
import { LiabilityService } from './liability.service';
import { LiabilityController } from './liability.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SalaryModule } from '../salary/salary.module';

@Module({
  imports: [PrismaModule, SalaryModule],
  controllers: [LiabilityController],
  providers: [LiabilityService],
})
export class LiabilityModule {}

