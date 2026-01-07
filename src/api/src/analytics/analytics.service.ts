import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

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

    // Get all approved orders in range
    const orders = await this.prisma.dailyOrderSubmission.findMany({
      where: {
        status: 'APPROVED',
        dateKey: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      select: {
        dateKey: true,
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

    // Calculate totalOrdersSeries (sum approved orders per day)
    const ordersByDate = new Map<string, number>();
    orders.forEach((order) => {
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
    orders.forEach((order) => {
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
      totalRefundsAmount,
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
      totalIssuedAmount,
      totalRedeemedAmount,
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
}
