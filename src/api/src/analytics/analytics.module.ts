import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { OrdersAnalyticsController } from './orders-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController, OrdersAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
