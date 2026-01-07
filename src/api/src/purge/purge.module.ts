import { Module } from '@nestjs/common';
import { PurgeService } from './purge.service';
import { PurgeController } from './purge.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, AuditModule, StorageModule],
  controllers: [PurgeController],
  providers: [PurgeService],
})
export class PurgeModule {}
