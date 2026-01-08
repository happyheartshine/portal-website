import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsController, RefundsPublicController } from './refunds.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [RefundsController, RefundsPublicController],
  providers: [RefundsService],
})
export class RefundsModule {}

