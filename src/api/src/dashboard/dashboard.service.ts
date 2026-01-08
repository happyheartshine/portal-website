import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalaryService } from '../salary/salary.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private salaryService: SalaryService,
  ) {}

  /**
   * Get dashboard data for a user for a given month
   */
  async getDashboardData(userId: string, monthKey: string) {
    const { startDate, endDate } = this.getMonthBoundaries(monthKey);

    // Calculate salary
    const salaryData = await this.salaryService.calculateMonthlySalary(
      userId,
      monthKey,
    );

    // Get ongoing refunds (PENDING + DONE but not ARCHIVED)
    const ongoingRefunds = await this.prisma.refundRequest.count({
      where: {
        requestedByUserId: userId,
        status: {
          in: ['PENDING', 'DONE'],
        },
        archivedAt: null,
      },
    });

    // Get unread warnings count and recent warnings
    const thirtyDaysAgo = new Date(
      new Date().getTime() - 30 * 24 * 60 * 60 * 1000,
    );

    // Lazy-archive: Update warnings older than 30 days
    await this.prisma.warning.updateMany({
      where: {
        userId,
        createdAt: {
          lte: thirtyDaysAgo,
        },
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    // Get recent unread warnings (not archived, within 30 days)
    const recentWarnings = await this.prisma.warning.findMany({
      where: {
        userId,
        isRead: false,
        archivedAt: null,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        reason: true,
        note: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Limit to 5 most recent for dashboard
    });

    const unreadWarnings = recentWarnings.length;

    // Format warnings for response
    const warnings = recentWarnings.map((w) => ({
      id: w.id,
      message: w.reason + (w.note ? `: ${w.note}` : ''),
      createdAt: w.createdAt,
    }));

    return {
      month: monthKey,
      salary: Number(salaryData.salary),
      totalDeductions: Number(salaryData.totalDeductions),
      approvedOrders: salaryData.approvedOrdersCount,
      ongoingRefunds,
      unreadWarnings,
      warnings,
    };
  }

  /**
   * Get order trends for a user over a date range
   */
  async getOrderTrends(userId: string, range: number) {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    // Format dates as YYYY-MM-DD
    const startDateStr = this.formatDateKey(startDate);
    const endDateStr = this.formatDateKey(endDate);

    // Get all order submissions in the range
    const orders = await this.prisma.dailyOrderSubmission.findMany({
      where: {
        userId,
        dateKey: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      select: {
        dateKey: true,
        submittedCount: true,
        approvedCount: true,
        status: true,
      },
      orderBy: {
        dateKey: 'asc',
      },
    });

    // Group by date and aggregate
    const trendsMap = new Map<string, { submitted: number; approved: number }>();

    // Initialize all dates in range with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = this.formatDateKey(currentDate);
      trendsMap.set(dateKey, { submitted: 0, approved: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill in actual data
    orders.forEach((order) => {
      const existing = trendsMap.get(order.dateKey) || { submitted: 0, approved: 0 };
      existing.submitted += order.submittedCount;
      if (order.status === 'APPROVED' && order.approvedCount) {
        existing.approved += order.approvedCount;
      }
      trendsMap.set(order.dateKey, existing);
    });

    // Convert to array format
    const trends = Array.from(trendsMap.entries()).map(([date, data]) => ({
      date,
      submitted: data.submitted,
      approved: data.approved,
    }));

    return trends;
  }

  /**
   * Get warnings for a user with source tags
   */
  async getWarnings(userId: string) {
    const warnings = await this.prisma.warning.findMany({
      where: {
        userId,
      },
      include: {
        sourceUser: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return warnings.map((warning) => ({
      id: warning.id,
      reason: warning.reason,
      note: warning.note,
      sourceTag: this.getSourceTag(warning.sourceRole, warning.sourceUser),
      deductionAmount: warning.deductionAmount,
      isRead: warning.isRead,
      createdAt: warning.createdAt,
      readAt: warning.readAt,
    }));
  }

  /**
   * Mark a warning as read
   */
  async markWarningAsRead(userId: string, warningId: string) {
    // Verify warning belongs to user
    const warning = await this.prisma.warning.findFirst({
      where: {
        id: warningId,
        userId,
      },
    });

    if (!warning) {
      throw new Error('Warning not found');
    }

    return this.prisma.warning.update({
      where: { id: warningId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Generate source tag string for warnings
   */
  private getSourceTag(
    sourceRole: string,
    sourceUser: { name: string; role: string } | null,
  ): string {
    if (sourceRole === 'ADMIN') {
      return 'Warning from Admin';
    } else if (sourceRole === 'MANAGER' && sourceUser) {
      return `Warning from Manager ${sourceUser.name}`;
    } else if (sourceRole === 'MANAGER') {
      return 'Warning from Manager';
    }
    return 'Warning';
  }

  /**
   * Get month boundaries in YYYY-MM-DD format
   * Handles timezone-safe logic by using UTC dates
   */
  private getMonthBoundaries(monthKey: string): {
    startDate: string;
    endDate: string;
  } {
    const [year, month] = monthKey.split('-').map(Number);

    if (!year || !month || month < 1 || month > 12) {
      throw new Error('Invalid month format. Expected YYYY-MM');
    }

    // Start date is always the 1st of the month
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;

    // End date is the last day of the month
    // Using next month, day 0 gives last day of current month
    const endDate = new Date(Date.UTC(year, month, 0));
    const day = endDate.getUTCDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
    };
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDateKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

