import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalaryService } from '../salary/salary.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LiabilityService {
  constructor(
    private prisma: PrismaService,
    private salaryService: SalaryService,
  ) {}

  /**
   * Calculate total pending salary for all active users for a month
   */
  async getPendingSalary(monthKey: string) {
    // Get all active users
    const activeUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    // Calculate salary for each user
    const salaryPromises = activeUsers.map((user) =>
      this.salaryService.calculateMonthlySalary(user.id, monthKey),
    );

    const salaries = await Promise.all(salaryPromises);

    // Sum all salaries
    const totalPendingSalary = salaries.reduce(
      (sum, salaryData) => sum.plus(salaryData.salary),
      new Decimal(0),
    );

    return {
      totalPendingSalary,
      month: monthKey,
      userCount: activeUsers.length,
    };
  }
}
