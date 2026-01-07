import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { AttendanceModule } from './attendance/attendance.module';
import { OrdersModule } from './orders/orders.module';
import { CouponsModule } from './coupons/coupons.module';
import { RefundsModule } from './refunds/refunds.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LiabilityModule } from './liability/liability.module';
import { PurgeModule } from './purge/purge.module';
import { AuditModule } from './audit/audit.module';
import { ManagerModule } from './manager/manager.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    UserModule,
    AttendanceModule,
    OrdersModule,
    CouponsModule,
    RefundsModule,
    AnalyticsModule,
    LiabilityModule,
    PurgeModule,
    AuditModule,
    ManagerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

