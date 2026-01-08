import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  istNow,
  istStartOfDay,
  istStartOfMonth,
  formatISTDate,
  formatISTMonth,
  istTodayKey,
  istCurrentMonthKey,
  parseISTDate,
} from '../common/utils/ist-timezone.util';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get order analytics for a date range
   */
  async getOrderAnalytics(range: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    const startDateStr = this.formatDateKey(startDate);
    const endDateStr = this.formatDateKey(endDate);

    // Get all orders in range (all statuses)
    const allOrders = await this.prisma.dailyOrderSubmission.findMany({
      where: {
        dateKey: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      select: {
        dateKey: true,
        status: true,
        submittedCount: true,
        approvedCount: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate summary statistics
    let totalOrders = 0;
    let approvedOrders = 0;
    let pendingOrders = 0;
    let rejectedOrders = 0;

    allOrders.forEach((order) => {
      totalOrders += order.submittedCount || 0;
      if (order.status === 'APPROVED') {
        approvedOrders += order.approvedCount || 0;
      } else if (order.status === 'PENDING') {
        pendingOrders += order.submittedCount || 0;
      } else if (order.status === 'REJECTED') {
        rejectedOrders += order.submittedCount || 0;
      }
    });

    // Calculate totalOrdersSeries (sum approved orders per day)
    const ordersByDate = new Map<string, number>();
    allOrders
      .filter((order) => order.status === 'APPROVED')
      .forEach((order) => {
        const count = ordersByDate.get(order.dateKey) || 0;
        ordersByDate.set(order.dateKey, count + (order.approvedCount || 0));
      });

    // Initialize all dates in range with 0
    const totalOrdersSeries: Array<{ date: string; total: number }> = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = this.formatDateKey(currentDate);
      totalOrdersSeries.push({
        date: dateKey,
        total: ordersByDate.get(dateKey) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate perEmployeeBar (approved orders per employee)
    const ordersByEmployee = new Map<
      string,
      { name: string; email: string; total: number }
    >();
    allOrders
      .filter((order) => order.status === 'APPROVED')
      .forEach((order) => {
        const existing = ordersByEmployee.get(order.userId) || {
          name: order.user.name,
          email: order.user.email,
          total: 0,
        };
        existing.total += order.approvedCount || 0;
        ordersByEmployee.set(order.userId, existing);
      });

    const perEmployeeBar = Array.from(ordersByEmployee.values()).map(
      (emp) => ({
        employeeName: emp.name,
        employeeEmail: emp.email,
        totalApprovedOrders: emp.total,
      }),
    );

    return {
      // Summary stats for dashboard
      totalOrders,
      approvedOrders,
      pendingOrders,
      rejectedOrders,
      // Detailed data for charts
      totalOrdersSeries,
      perEmployeeBar,
    };
  }

  /**
   * Get refund analytics for a month
   */
  async getRefundAnalytics(monthKey: string, byEmployee: boolean = false) {
    const { startDate, endDate } = this.getMonthBoundaries(monthKey);
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);

    const refunds = await this.prisma.refundRequest.findMany({
      where: {
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        amount: true,
        status: true,
        requestedByUserId: true,
        requestedBy: byEmployee
          ? {
              select: {
                name: true,
                email: true,
              },
            }
          : undefined,
      },
    });

    const totalRefundsAmount = refunds.reduce(
      (sum, refund) => sum.plus(refund.amount),
      new Decimal(0),
    );

    const count = refunds.length;
    const averageAmount =
      count > 0 ? totalRefundsAmount.dividedBy(count) : new Decimal(0);

    // Calculate byStatus breakdown
    const byStatus: Record<string, number> = {};
    refunds.forEach((refund) => {
      const status = refund.status || 'UNKNOWN';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    let byEmployeeData = null;
    if (byEmployee) {
      const refundsByEmployee = new Map<
        string,
        { name: string; email: string; amount: Decimal; count: number }
      >();

      refunds.forEach((refund) => {
        const existing = refundsByEmployee.get(refund.requestedByUserId) || {
          name: refund.requestedBy?.name || 'Unknown',
          email: refund.requestedBy?.email || 'Unknown',
          amount: new Decimal(0),
          count: 0,
        };
        existing.amount = existing.amount.plus(refund.amount);
        existing.count += 1;
        refundsByEmployee.set(refund.requestedByUserId, existing);
      });

      byEmployeeData = Array.from(refundsByEmployee.values()).map((emp) => ({
        employeeName: emp.name,
        employeeEmail: emp.email,
        totalAmount: emp.amount,
        count: emp.count,
      }));
    }

    return {
      // Summary stats for dashboard (matching frontend expectations)
      totalRefunds: count,
      totalAmount: totalRefundsAmount.toNumber(),
      averageAmount: averageAmount.toNumber(),
      byStatus,
      // Legacy fields for backward compatibility
      totalRefundsAmount: totalRefundsAmount.toNumber(),
      count,
      byEmployee: byEmployeeData,
    };
  }

  /**
   * Get coupon/credit analytics for a month
   */
  async getCreditAnalytics(monthKey: string) {
    const { startDate, endDate } = this.getMonthBoundaries(monthKey);
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);

    // Get all coupons issued in the month
    const issuedCoupons = await this.prisma.coupon.findMany({
      where: {
        issuedAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        amount: true,
      },
    });

    // Get all coupons used in the month
    const usedCoupons = await this.prisma.coupon.findMany({
      where: {
        usedAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        amount: true,
      },
    });

    const totalIssuedAmount = issuedCoupons.reduce(
      (sum, coupon) => sum.plus(coupon.amount),
      new Decimal(0),
    );

    const totalRedeemedAmount = usedCoupons.reduce(
      (sum, coupon) => sum.plus(coupon.amount),
      new Decimal(0),
    );

    return {
      // Summary stats for dashboard (matching frontend expectations)
      totalCredits: issuedCoupons.length,
      totalAmount: totalIssuedAmount.toNumber(),
      // Detailed stats
      totalIssuedAmount: totalIssuedAmount.toNumber(),
      totalRedeemedAmount: totalRedeemedAmount.toNumber(),
      issuedCount: issuedCoupons.length,
      redeemedCount: usedCoupons.length,
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

    if (!year || !month || month < 1 || month > 12) {
      throw new Error('Invalid month format. Expected YYYY-MM');
    }

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;

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

  /**
   * Get daily orders for ongoing month (day 1..today inclusive, IST)
   * Returns: { data: [{ date: "YYYY-MM-DD", count: number }] }
   */
  async getDailyOrdersThisMonth() {
    const todayIST = istNow();
    const monthStart = istStartOfMonth(todayIST);
    const todayKey = istTodayKey();
    const monthStartKey = formatISTDate(monthStart);

    // Get all approved orders from month start to today (IST)
    const orders = await this.prisma.dailyOrderSubmission.findMany({
      where: {
        status: 'APPROVED',
        dateKey: {
          gte: monthStartKey,
          lte: todayKey,
        },
      },
      select: {
        dateKey: true,
        approvedCount: true,
      },
    });

    // Aggregate by date
    const ordersByDate = new Map<string, number>();
    orders.forEach((order) => {
      const count = ordersByDate.get(order.dateKey) || 0;
      ordersByDate.set(
        order.dateKey,
        count + (order.approvedCount || 0),
      );
    });

    // Fill all dates from 1st to today with zero counts if missing
    const data: Array<{ date: string; count: number }> = [];
    const startDate = parseISTDate(monthStartKey);
    const endDate = parseISTDate(todayKey);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = formatISTDate(currentDate);
      data.push({
        date: dateKey,
        count: ordersByDate.get(dateKey) || 0,
      });
      currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return { data };
  }

  /**
   * Get monthly orders for last 3 completed months
   * Returns: { data: [{ month: "YYYY-MM", label: "Oct 2025", count: number }] }
   */
  async getMonthlyOrdersLast3() {
    const todayIST = istNow();
    const currentMonthKey = istCurrentMonthKey();
    const [currentYear, currentMonth] = currentMonthKey.split('-').map(Number);

    // Calculate last 3 completed months (not including current month)
    const months: Array<{ month: string; label: string; startDate: string; endDate: string }> = [];
    for (let i = 1; i <= 3; i++) {
      let year = currentYear;
      let month = currentMonth - i;
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthStart = `${monthKey}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

      // Format label (e.g., "Oct 2025")
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const label = `${monthNames[month - 1]} ${year}`;

      months.push({
        month: monthKey,
        label,
        startDate: monthStart,
        endDate: monthEnd,
      });
    }

    // Get orders for these months
    const orders = await this.prisma.dailyOrderSubmission.findMany({
      where: {
        status: 'APPROVED',
        dateKey: {
          gte: months[2].startDate, // oldest month
          lte: months[0].endDate, // newest month
        },
      },
      select: {
        dateKey: true,
        approvedCount: true,
      },
    });

    // Aggregate by month
    const ordersByMonth = new Map<string, number>();
    orders.forEach((order) => {
      const monthKey = order.dateKey.substring(0, 7); // YYYY-MM
      if (months.some((m) => m.month === monthKey)) {
        const count = ordersByMonth.get(monthKey) || 0;
        ordersByMonth.set(monthKey, count + (order.approvedCount || 0));
      }
    });

    // Build response in reverse order (newest first)
    const data = months.map((m) => ({
      month: m.month,
      label: m.label,
      count: ordersByMonth.get(m.month) || 0,
    }));

    return { data };
  }

  /**
   * Get recent daily orders trend (7-14 days, default 14)
   * Returns: { data: [{ date: "YYYY-MM-DD", count: number }] }
   */
  async getDailyOrdersRecent(days: number = 14) {
    if (days < 7 || days > 31) {
      throw new BadRequestException('Days must be between 7 and 31');
    }

    const todayIST = istNow();
    const todayKey = istTodayKey();
    const startDate = new Date(todayIST);
    startDate.setTime(startDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const startKey = formatISTDate(startDate);

    // Get all approved orders in range
    const orders = await this.prisma.dailyOrderSubmission.findMany({
      where: {
        status: 'APPROVED',
        dateKey: {
          gte: startKey,
          lte: todayKey,
        },
      },
      select: {
        dateKey: true,
        approvedCount: true,
      },
    });

    // Aggregate by date
    const ordersByDate = new Map<string, number>();
    orders.forEach((order) => {
      const count = ordersByDate.get(order.dateKey) || 0;
      ordersByDate.set(
        order.dateKey,
        count + (order.approvedCount || 0),
      );
    });

    // Fill all dates in range with zero counts if missing
    const data: Array<{ date: string; count: number }> = [];
    const startDateParsed = parseISTDate(startKey);
    const endDateParsed = parseISTDate(todayKey);
    const currentDate = new Date(startDateParsed);

    while (currentDate <= endDateParsed) {
      const dateKey = formatISTDate(currentDate);
      data.push({
        date: dateKey,
        count: ordersByDate.get(dateKey) || 0,
      });
      currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return { data };
  }
}
