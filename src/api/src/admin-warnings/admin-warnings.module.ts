import { Module } from '@nestjs/common';
import { AdminWarningsService } from './admin-warnings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [AdminWarningsService],
  exports: [AdminWarningsService],
})
export class AdminWarningsModule {}

