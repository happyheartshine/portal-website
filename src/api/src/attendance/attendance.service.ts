import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mark attendance for today (idempotent)
   * Returns existing attendance if already marked for today
   */
  async markAttendance(userId: string) {
    const today = this.getTodayDateKey();
    const now = new Date();

    // Check if attendance already exists for today
    const existing = await this.prisma.attendance.findUnique({
      where: {
        userId_dateKey: {
          userId,
          dateKey: today,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new attendance
    return this.prisma.attendance.create({
      data: {
        userId,
        timestamp: now,
        dateKey: today,
      },
    });
  }

  /**
   * Get attendance list for a month
   */
  async getAttendanceForMonth(userId: string, monthKey: string) {
    const { startDate, endDate } = this.getMonthBoundaries(monthKey);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        userId,
        dateKey: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        dateKey: true,
        timestamp: true,
        createdAt: true,
      },
      orderBy: {
        dateKey: 'asc',
      },
    });

    return attendances;
  }

  /**
   * Get today's date key in YYYY-MM-DD format (UTC)
   */
  private getTodayDateKey(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
}

