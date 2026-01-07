import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { AdminWarningsModule } from '../admin-warnings/admin-warnings.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, AdminWarningsModule, PrismaModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

