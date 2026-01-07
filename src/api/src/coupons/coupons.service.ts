import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateCouponDto } from './dto/generate-coupon.dto';
import { HonorCouponDto } from './dto/honor-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a new coupon
   * Format: CP-YYYYMMDD-XXXX (where XXXX is random 4-digit code)
   */
  async generateCoupon(userId: string, dto: GenerateCouponDto) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const code = `CP-${dateStr}-${randomCode}`;

    // Ensure code is unique (retry if collision)
    let attempts = 0;
    let finalCode = code;
    while (attempts < 10) {
      const existing = await this.prisma.coupon.findUnique({
        where: { code: finalCode },
      });

      if (!existing) {
        break;
      }

      // Regenerate random code
      const newRandomCode = Math.floor(1000 + Math.random() * 9000).toString();
      finalCode = `CP-${dateStr}-${newRandomCode}`;
      attempts++;
    }

    if (attempts >= 10) {
      throw new BadRequestException('Failed to generate unique coupon code');
    }

    return this.prisma.coupon.create({
      data: {
        code: finalCode,
        issuedByUserId: userId,
        issuedAt: new Date(),
        customerName: dto.customerName,
        server: dto.server,
        category: dto.category,
        reason: dto.reason,
        zelleName: dto.zelleName,
        amount: dto.amount,
        status: 'ISSUED',
      },
    });
  }

  /**
   * Honor a coupon (mark as USED)
   */
  async honorCoupon(userId: string, dto: HonorCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
      include: {
        usedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    if (coupon.status === 'USED') {
      const usedByName = coupon.usedBy?.name || 'Unknown';
      const usedAt = coupon.usedAt
        ? new Date(coupon.usedAt).toLocaleDateString()
        : 'Unknown date';
      throw new ConflictException(
        `This coupon was already honoured by ${usedByName} on ${usedAt}`,
      );
    }

    if (coupon.status !== 'ISSUED') {
      throw new BadRequestException('Coupon is not in ISSUED status');
    }

    return this.prisma.coupon.update({
      where: { code: dto.code },
      data: {
        status: 'USED',
        usedByUserId: userId,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Get coupon history (issued + honored by user)
   */
  async getCouponHistory(userId: string) {
    const [issued, honored] = await Promise.all([
      // Coupons issued by user
      this.prisma.coupon.findMany({
        where: {
          issuedByUserId: userId,
        },
        include: {
          usedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          issuedAt: 'desc',
        },
      }),
      // Coupons honored by user
      this.prisma.coupon.findMany({
        where: {
          usedByUserId: userId,
        },
        include: {
          issuedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          usedAt: 'desc',
        },
      }),
    ]);

    return {
      issued,
      honored,
    };
  }
}

