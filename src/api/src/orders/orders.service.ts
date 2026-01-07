import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create or update daily order submission
   * - If exists for dateKey and still PENDING, allow update
   * - If APPROVED, do not allow changes
   */
  async createOrUpdateOrder(userId: string, dto: CreateOrderDto) {
    // Check if order already exists for this dateKey
    const existing = await this.prisma.dailyOrderSubmission.findUnique({
      where: {
        userId_dateKey: {
          userId,
          dateKey: dto.dateKey,
        },
      },
    });

    if (existing) {
      // If approved, do not allow changes
      if (existing.status === 'APPROVED') {
        throw new ForbiddenException(
          'Cannot modify approved order submission',
        );
      }

      // If pending, allow update
      if (existing.status === 'PENDING') {
        return this.prisma.dailyOrderSubmission.update({
          where: { id: existing.id },
          data: {
            submittedCount: dto.submittedCount,
          },
        });
      }

      // If rejected, allow update (treat as new submission)
      return this.prisma.dailyOrderSubmission.update({
        where: { id: existing.id },
        data: {
          submittedCount: dto.submittedCount,
          status: 'PENDING',
          approvedCount: null,
          managerId: null,
          approvedAt: null,
        },
      });
    }

    // Create new submission
    return this.prisma.dailyOrderSubmission.create({
      data: {
        userId,
        dateKey: dto.dateKey,
        submittedCount: dto.submittedCount,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get orders for a month
   */
  async getOrdersForMonth(userId: string, monthKey: string) {
    const { startDate, endDate } = this.getMonthBoundaries(monthKey);

    const orders = await this.prisma.dailyOrderSubmission.findMany({
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
        submittedCount: true,
        status: true,
        approvedCount: true,
        createdAt: true,
      },
      orderBy: {
        dateKey: 'asc',
      },
    });

    return orders;
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

