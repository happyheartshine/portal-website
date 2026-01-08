import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreateDeductionDto } from './dto/create-deduction.dto';

@Injectable()
export class ManagementService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get management dashboard summary
   * Returns pending refunds, refund analytics, and credit analytics
   */
  async getDashboardSummary() {
    // Pending refunds
    const pendingRefunds = await this.prisma.refundRequest.findMany({
      where: { status: 'PENDING' },
      select: {
        amount: true,
      },
    });

    const pendingRefundsCount = pendingRefunds.length;
    const pendingRefundsTotal = pendingRefunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );

    // Refund analytics (all refunds - or last 30 days if convention exists)
    // Using ALL as per requirements
    const allRefunds = await this.prisma.refundRequest.findMany({
      select: {
        amount: true,
      },
    });

    const refundAnalyticsCount = allRefunds.length;
    const refundAnalyticsTotal = allRefunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );

    // Credit analytics (coupons: ACTIVE + USED + EXPIRED)
    const allCoupons = await this.prisma.coupon.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'USED', 'EXPIRED'],
        },
      },
      select: {
        amount: true,
      },
    });

    const creditAnalyticsCount = allCoupons.length;
    const creditAnalyticsTotal = allCoupons.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );

    return {
      pendingRefunds: {
        count: pendingRefundsCount,
        totalAmountUSD: pendingRefundsTotal,
      },
      refundAnalytics: {
        count: refundAnalyticsCount,
        totalAmountUSD: refundAnalyticsTotal,
      },
      creditAnalytics: {
        count: creditAnalyticsCount,
        totalAmountUSD: creditAnalyticsTotal,
      },
    };
  }

  /**
   * Get orders with filters (manager can view all employees)
   */
  async getOrders(
    status?: string,
    employeeId?: string,
    from?: string,
    to?: string,
    cursor?: string,
    limit: number = 10,
  ) {
    const where: any = {};

    if (status) {
      const statusUpper = status.toUpperCase();
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(statusUpper)) {
        throw new BadRequestException(
          'Invalid status. Must be one of: PENDING, APPROVED, REJECTED',
        );
      }
      where.status = statusUpper;
    }

    if (employeeId) {
      where.userId = employeeId;
    }

    if (from || to) {
      where.dateKey = {};
      if (from) {
        where.dateKey.gte = from;
      }
      if (to) {
        where.dateKey.lte = to;
      }
    }

    // Cursor pagination
    if (cursor) {
      try {
        const cursorData = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8'),
        );
        where.OR = [
          {
            createdAt: {
              lt: new Date(cursorData.createdAt),
            },
          },
          {
            createdAt: new Date(cursorData.createdAt),
            id: {
              lt: cursorData.id,
            },
          },
        ];
      } catch (e) {
        // Invalid cursor, ignore it
      }
    }

    const orders = await this.prisma.dailyOrderSubmission.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: limit + 1,
    });

    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;

    // Next cursor
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      const cursorData = {
        createdAt: lastItem.createdAt.toISOString(),
        id: lastItem.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    return {
      items,
      nextCursor,
    };
  }

  /**
   * Approve an order (idempotent)
   */
  async approveOrder(managerId: string, orderId: string) {
    const order = await this.prisma.dailyOrderSubmission.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Idempotency: if already approved by this manager, return as-is
    if (order.status === 'APPROVED' && order.managerId === managerId) {
      return order;
    }

    // Update order
    const updatedOrder = await this.prisma.dailyOrderSubmission.update({
      where: { id: orderId },
      data: {
        status: 'APPROVED',
        approvedCount: order.submittedCount, // Default to submitted count if not specified
        managerId: managerId,
        approvedAt: new Date(),
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'order_approved',
      performedByUserId: managerId,
      targetUserId: order.userId,
      details: {
        orderId: order.id,
        submittedCount: order.submittedCount,
        approvedCount: updatedOrder.approvedCount,
        dateKey: order.dateKey,
      },
    });

    return updatedOrder;
  }

  /**
   * Get refunds with search filters
   */
  async getRefunds(
    status?: string,
    q?: string,
    amount?: string,
    cursor?: string,
    limit: number = 10,
  ) {
    const where: any = {};

    if (status) {
      const statusUpper = status.toUpperCase();
      if (!['PENDING', 'DONE', 'ARCHIVED'].includes(statusUpper)) {
        throw new BadRequestException(
          'Invalid status. Must be one of: PENDING, DONE, ARCHIVED',
        );
      }
      where.status = statusUpper;
    }

    if (q) {
      where.customerName = {
        contains: q,
        mode: 'insensitive',
      };
    }

    if (amount) {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum)) {
        where.amount = amountNum;
      }
    }

    // Cursor pagination
    if (cursor) {
      try {
        const cursorData = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8'),
        );
        where.OR = [
          {
            createdAt: {
              lt: new Date(cursorData.createdAt),
            },
          },
          {
            createdAt: new Date(cursorData.createdAt),
            id: {
              lt: cursorData.id,
            },
          },
        ];
      } catch (e) {
        // Invalid cursor, ignore it
      }
    }

    const refunds = await this.prisma.refundRequest.findMany({
      where,
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: limit + 1,
    });

    const hasMore = refunds.length > limit;
    const items = hasMore ? refunds.slice(0, limit) : refunds;

    // Format response with requestedAmountUSD and refundedAmountUSD
    const formattedItems = items.map((refund) => ({
      ...refund,
      requestedAmountUSD: refund.amount,
      refundedAmountUSD: refund.refundedAmountUSD,
    }));

    // Next cursor
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      const cursorData = {
        createdAt: lastItem.createdAt.toISOString(),
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
   * Process refund (partial or full)
   * Input refundedAmountUSD is treated as TOTAL refunded so far
   */
  async processRefund(
    managerId: string,
    refundId: string,
    dto: ProcessRefundDto,
  ) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    const requestedAmount = Number(refund.amount);
    const refundedAmount = dto.refundedAmountUSD;

    // Validate: refundedAmount must be > 0
    if (refundedAmount <= 0) {
      throw new BadRequestException(
        'Refunded amount must be greater than 0',
      );
    }

    // Validate: refundedAmount must not exceed requestedAmount
    if (refundedAmount > requestedAmount) {
      throw new BadRequestException(
        `Refunded amount (${refundedAmount}) cannot exceed requested amount (${requestedAmount})`,
      );
    }

    const isFullRefund = refundedAmount >= requestedAmount;
    const now = new Date();

    // Update refund
    const updateData: any = {
      refundedAmountUSD: new Decimal(refundedAmount),
      processedByManagerId: managerId,
      processedAt: now,
    };

    if (isFullRefund) {
      updateData.status = 'DONE';
      updateData.fullyRefundedAt = now;
    } else {
      // Partial refund: keep status as PENDING
      updateData.status = 'PENDING';
    }

    const updatedRefund = await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: updateData,
    });

    // Audit log
    await this.auditService.log({
      action: 'refund_processed',
      performedByUserId: managerId,
      targetUserId: refund.requestedByUserId,
      details: {
        refundId: refund.id,
        requestedAmountUSD: requestedAmount,
        refundedAmountUSD: refundedAmount,
        isFullRefund,
        status: updatedRefund.status,
      },
    });

    return updatedRefund;
  }

  /**
   * Get deduction reasons (fixed enum list)
   */
  getDeductionReasons() {
    return [
      { key: 'late_submission', label: 'Late Submission' },
      { key: 'quality_issue', label: 'Quality Issue' },
      { key: 'attendance', label: 'Attendance Violation' },
      { key: 'policy_violation', label: 'Policy Violation' },
      { key: 'other', label: 'Other' },
    ];
  }

  /**
   * Create a deduction
   */
  async createDeduction(managerId: string, dto: CreateDeductionDto) {
    // Verify employee exists
    const employee = await this.prisma.user.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.role !== 'EMPLOYEE') {
      throw new BadRequestException('Can only create deductions for employees');
    }

    // Validate amount
    if (dto.amountINR <= 0) {
      throw new BadRequestException('Deduction amount must be greater than 0');
    }

    // Get reason label
    const reasons = this.getDeductionReasons();
    const reasonObj = reasons.find((r) => r.key === dto.reasonKey);
    const reasonLabel = reasonObj?.label || dto.reasonKey;

    // Create deduction
    const deduction = await this.prisma.deduction.create({
      data: {
        userId: dto.employeeId,
        amount: new Decimal(dto.amountINR),
        reason: `${reasonLabel}: ${dto.reasonKey}`,
        sourceRole: 'MANAGER',
        sourceUserId: managerId,
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'deduction_created',
      performedByUserId: managerId,
      targetUserId: dto.employeeId,
      details: {
        deductionId: deduction.id,
        amountINR: dto.amountINR,
        reasonKey: dto.reasonKey,
      },
    });

    return deduction;
  }

}

