import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalaryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate salary for a user for a given month
   * Formula: (SUM(Approved Orders) * ratePerOrder) - SUM(Deductions)
   */
  async calculateMonthlySalary(
    userId: string,
    monthKey: string, // YYYY-MM format
  ): Promise<{
    salary: Decimal;
    approvedOrdersCount: number;
    totalDeductions: Decimal;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ratePerOrder: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.ratePerOrder) {
      return {
        salary: new Decimal(0),
        approvedOrdersCount: 0,
        totalDeductions: new Decimal(0),
      };
    }

    // Get month boundaries (start and end of month in YYYY-MM-DD format)
    const { startDate, endDate } = this.getMonthBoundaries(monthKey);

    // Get all approved orders for the month
    const approvedOrders = await this.prisma.dailyOrderSubmission.findMany({
      where: {
        userId,
        status: 'APPROVED',
        dateKey: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        approvedCount: true,
      },
    });

    // Sum approved orders
    const approvedOrdersCount = approvedOrders.reduce(
      (sum, order) => sum + (order.approvedCount || 0),
      0,
    );

    // Get all deductions for the month
    // Use UTC dates for month boundaries
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
    
    const deductions = await this.prisma.deduction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        amount: true,
      },
    });

    // Sum deductions
    const totalDeductions = deductions.reduce(
      (sum, deduction) => sum.plus(deduction.amount),
      new Decimal(0),
    );

    // Calculate salary: (approved orders * rate) - deductions
    const salary = new Decimal(approvedOrdersCount)
      .times(user.ratePerOrder)
      .minus(totalDeductions);

    // Ensure salary doesn't go negative (or handle as per business logic)
    const finalSalary = salary.lessThan(0) ? new Decimal(0) : salary;

    return {
      salary: finalSalary,
      approvedOrdersCount,
      totalDeductions,
    };
  }

  /**
   * Get month boundaries in YYYY-MM-DD format
   * Handles timezone-safe logic by using UTC dates
   */
  private getMonthBoundaries(monthKey: string): {
    startDate: string;
    endDate: string;
  } {
    // Parse YYYY-MM format
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
}

