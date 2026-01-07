import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PurgeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private storageService: StorageService,
  ) {}

  /**
   * Purge refund and coupon data for a specific month
   */
  async purgeMonthData(monthKey: string, performedByAdminId: string) {
    // Validate month format
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException('Invalid month format. Expected YYYY-MM');
    }

    const { startDate, endDate } = this.getMonthBoundaries(monthKey);
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);

    const tablesPurged: string[] = [];

    // Delete refund requests for the month
    const refundsToDelete = await this.prisma.refundRequest.findMany({
      where: {
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        id: true,
        screenshotUrl: true,
      },
    });

    // Delete screenshot files
    for (const refund of refundsToDelete) {
      if (refund.screenshotUrl) {
        try {
          await this.storageService.deleteFile(refund.screenshotUrl);
        } catch (error) {
          // Log but don't fail if file doesn't exist
          console.warn(`Failed to delete file: ${refund.screenshotUrl}`, error);
        }
      }
    }

    const refundDeleteResult = await this.prisma.refundRequest.deleteMany({
      where: {
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
    });

    if (refundDeleteResult.count > 0) {
      tablesPurged.push('refund_requests');
    }

    // Delete coupons for the month (both issued and used)
    const couponDeleteResult = await this.prisma.coupon.deleteMany({
      where: {
        OR: [
          {
            issuedAt: {
              gte: startDateTime,
              lte: endDateTime,
            },
          },
          {
            usedAt: {
              gte: startDateTime,
              lte: endDateTime,
            },
          },
        ],
      },
    });

    if (couponDeleteResult.count > 0) {
      tablesPurged.push('coupons');
    }

    // Create data purge log
    await this.prisma.dataPurgeLog.create({
      data: {
        monthKey,
        performedByAdminId,
        tablesPurged: tablesPurged,
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'purge',
      performedByUserId: performedByAdminId,
      details: {
        monthKey,
        tablesPurged,
        refundsDeleted: refundDeleteResult.count,
        couponsDeleted: couponDeleteResult.count,
      },
    });

    return {
      monthKey,
      tablesPurged,
      refundsDeleted: refundDeleteResult.count,
      couponsDeleted: couponDeleteResult.count,
    };
  }

  /**
   * Get month boundaries in YYYY-MM-DD format
   */
  private getMonthBoundaries(monthKey: string): {
    startDate: string;
    endDate: string;
  } {
    const [year, month] = monthKey.split('-').map(Number);

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;

    const endDate = new Date(Date.UTC(year, month, 0));
    const day = endDate.getUTCDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
    };
  }
}
