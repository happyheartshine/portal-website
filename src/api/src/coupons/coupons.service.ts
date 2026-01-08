import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateCouponDto } from './dto/generate-coupon.dto';
import { HonorCouponDto } from './dto/honor-coupon.dto';
import { ClearCouponDto } from './dto/clear-coupon.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a new coupon
   * Format: CP-YYYYMMDD-XXXX (where XXXX is random 4-digit code)
   * Sets remainingBalance = amount, expiresAt = issuedAt + 90 days, status = ACTIVE
   */
  async generateCoupon(userId: string, dto: GenerateCouponDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

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

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setDate(expiresAt.getDate() + 90); // +90 days

    // Get user name for issuedByName
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return this.prisma.coupon.create({
      data: {
        code: finalCode,
        issuedByUserId: userId,
        issuedAt,
        customerName: dto.customerName,
        server: dto.server,
        category: dto.category,
        reason: dto.reason,
        zelleName: dto.zelleName,
        amount: dto.amount,
        remainingBalance: dto.amount,
        expiresAt,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Honor a coupon (mark as USED) - legacy method
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

    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestException('Coupon is not active');
    }

    return this.prisma.coupon.update({
      where: { code: dto.code },
      data: {
        status: 'USED',
        usedByUserId: userId,
        usedAt: new Date(),
        remainingBalance: 0,
      },
    });
  }

  /**
   * Get coupon info / balance check
   * Updates status to EXPIRED if now > expiresAt
   */
  async getCoupon(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        issuedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    // Check if expired
    const now = new Date();
    if (now > coupon.expiresAt && coupon.status === 'ACTIVE') {
      // Update status to EXPIRED
      await this.prisma.coupon.update({
        where: { code },
        data: { status: 'EXPIRED' },
      });
      coupon.status = 'EXPIRED';
    }

    return {
      code: coupon.code,
      originalAmountUSD: coupon.amount,
      remainingBalanceUSD: coupon.remainingBalance,
      issuedAt: coupon.issuedAt,
      issuedByName: coupon.issuedBy.name,
      expiresAt: coupon.expiresAt,
      status: coupon.status,
    };
  }

  /**
   * Clear full balance only
   * Rejects if expired or amount doesn't match remainingBalance exactly
   */
  async clearFullBalance(
    userId: string,
    code: string,
    dto: ClearCouponDto,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    // Check if expired
    const now = new Date();
    if (now > coupon.expiresAt) {
      throw new BadRequestException('Cannot clear expired coupon');
    }

    if (coupon.status === 'EXPIRED') {
      throw new BadRequestException('Cannot clear expired coupon');
    }

    if (coupon.status === 'USED') {
      // Get history to show who cleared it
      const history = await this.prisma.couponHistory.findFirst({
        where: { couponCode: code },
        orderBy: { clearedAt: 'desc' },
        include: {
          clearedBy: {
            select: { name: true },
          },
        },
      });

      const clearedByName = history?.clearedBy?.name || 'Unknown';
      const clearedAt = history?.clearedAt
        ? new Date(history.clearedAt).toLocaleDateString()
        : 'Unknown date';

      throw new ConflictException(
        `Already used – at this time by: ${clearedByName}`,
      );
    }

    // Check if amount matches remainingBalance exactly (decimal-safe comparison)
    const requestedAmount = new Decimal(dto.amountUSD);
    const remainingBalance = new Decimal(coupon.remainingBalance);

    if (!requestedAmount.equals(remainingBalance)) {
      throw new BadRequestException(
        `Amount must equal remaining balance exactly. Remaining: ${remainingBalance.toString()}`,
      );
    }

    // Get user name
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Update coupon and create history
    await this.prisma.$transaction([
      this.prisma.coupon.update({
        where: { code },
        data: {
          remainingBalance: 0,
          status: 'USED',
          usedByUserId: userId,
          usedAt: now,
        },
      }),
      this.prisma.couponHistory.create({
        data: {
          couponCode: code,
          clearedAt: now,
          clearedByUserId: userId,
          clearedByName: user.name,
          clearedAmount: requestedAmount,
        },
      }),
    ]);

    return {
      message: `Already used – at this time by: ${user.name}`,
      clearedAt: now.toISOString(),
      clearedByName: user.name,
    };
  }

  /**
   * Get coupon clear history with pagination
   */
  async getCouponClearHistory(cursor?: string, limit: number = 10) {
    const where: any = {};

    // Cursor pagination
    if (cursor) {
      try {
        const cursorData = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8'),
        );
        where.OR = [
          {
            clearedAt: {
              lt: new Date(cursorData.clearedAt),
            },
          },
          {
            clearedAt: new Date(cursorData.clearedAt),
            id: {
              lt: cursorData.id,
            },
          },
        ];
      } catch (e) {
        // Invalid cursor, ignore it
      }
    }

    const history = await this.prisma.couponHistory.findMany({
      where,
      include: {
        clearedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          clearedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: limit + 1,
    });

    const hasMore = history.length > limit;
    const items = hasMore ? history.slice(0, limit) : history;

    const formattedItems = items.map((item) => ({
      couponCode: item.couponCode,
      clearedAt: item.clearedAt,
      clearedByName: item.clearedByName,
      clearedAmountUSD: item.clearedAmount,
    }));

    // Next cursor
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      const cursorData = {
        clearedAt: lastItem.clearedAt.toISOString(),
        id: lastItem.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    return {
      items: formattedItems,
      nextCursor,
    };
  }

  /**
   * Send coupon (stub - TODO: integrate with notification system)
   */
  async sendCoupon(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestException('Coupon is not active');
    }

    // TODO: Integrate with notification/ticketing system
    return { ok: true };
  }

  /**
   * Send coupon credit (stub - TODO: integrate with notification system)
   */
  async sendCouponCredit(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestException('Coupon is not active');
    }

    // TODO: Integrate with notification/ticketing system
    return { ok: true };
  }

  /**
   * Get coupon history (issued + honored by user)
   */
  async getUserCouponHistory(userId: string) {
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

