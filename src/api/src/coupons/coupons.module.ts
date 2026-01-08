import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController, CouponsPublicController } from './coupons.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CouponsController, CouponsPublicController],
  providers: [CouponsService],
})
export class CouponsModule {}

