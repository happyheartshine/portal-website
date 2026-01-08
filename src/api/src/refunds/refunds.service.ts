import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class RefundsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Create a refund request with screenshot upload
   * Sets editableUntil = createdAt + 12 hours
   */
  async createRefundRequest(
    userId: string,
    dto: CreateRefundDto,
    screenshotFile?: Express.Multer.File,
  ) {
    let screenshotUrl: string | null = null;

    if (screenshotFile) {
      // Upload screenshot using storage service
      screenshotUrl = await this.storageService.uploadFile(
        screenshotFile,
        'refunds',
      );
    }

    const now = new Date();
    const editableUntil = new Date(now.getTime() + 12 * 60 * 60 * 1000); // +12 hours

    return this.prisma.refundRequest.create({
      data: {
        requestedByUserId: userId,
        customerName: dto.customerName,
        zelleSenderName: dto.zelleSenderName,
        server: dto.server,
        category: dto.category,
        reason: dto.reason,
        amount: dto.amount,
        screenshotUrl,
        status: 'PENDING',
        editableUntil,
      },
    });
  }

  /**
   * Get refund requests with optional status filter and cursor pagination
   */
  async getRefundRequests(
    userId: string,
    status?: string,
    cursor?: string,
    limit: number = 10,
  ) {
    const where: any = {
      requestedByUserId: userId,
    };

    if (status) {
      if (!['PENDING', 'DONE', 'ARCHIVED'].includes(status.toUpperCase())) {
        throw new BadRequestException(
          'Invalid status. Must be one of: pending, done, archived',
        );
      }
      where.status = status.toUpperCase();
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

    // Add editable flag, refundedAmountUSD, and canArchive flag
    const now = new Date();
    const formattedItems = items.map((refund) => {
      const requestedAmount = Number(refund.amount);
      const refundedAmount = Number(refund.refundedAmountUSD || 0);
      const isPartial = refundedAmount > 0 && refundedAmount < requestedAmount;
      const isFullyRefunded = refundedAmount >= requestedAmount;
      const canArchive =
        refund.status === 'DONE' || (isFullyRefunded && refund.status !== 'ARCHIVED');

      return {
        ...refund,
        requestedAmountUSD: requestedAmount,
        refundedAmountUSD: refundedAmount,
        isPartial,
        canArchive,
        editable:
          refund.status === 'PENDING' && new Date(refund.editableUntil) > now,
        editableUntil: refund.editableUntil.toISOString(),
      };
    });

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
   * Update refund request (only pending + within 12h)
   */
  async updateRefund(
    userId: string,
    refundId: string,
    dto: UpdateRefundDto,
    screenshotFile?: Express.Multer.File,
  ) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    // Verify ownership
    if (refund.requestedByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Only allowed if status == PENDING
    if (refund.status !== 'PENDING') {
      throw new ForbiddenException(
        'Can only update refunds with PENDING status',
      );
    }

    // Check if still editable (within 12 hours)
    const now = new Date();
    if (now >= refund.editableUntil) {
      throw new ForbiddenException(
        'Refund can only be edited within 12 hours of creation',
      );
    }

    let screenshotUrl = refund.screenshotUrl;
    if (screenshotFile) {
      screenshotUrl = await this.storageService.uploadFile(
        screenshotFile,
        'refunds',
      );
    }

    return this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        customerName: dto.customerName,
        zelleSenderName: dto.zelleSenderName,
        server: dto.server,
        category: dto.category,
        reason: dto.reason,
        amount: dto.amount,
        screenshotUrl,
      },
    });
  }

  /**
   * Search refunds across statuses
   */
  async searchRefunds(
    userId: string,
    q?: string,
    amount?: string,
    cursor?: string,
    limit: number = 10,
  ) {
    const where: any = {
      requestedByUserId: userId,
    };

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

    // Add editable flag, refundedAmountUSD, and canArchive flag
    const now = new Date();
    const formattedItems = items.map((refund) => {
      const requestedAmount = Number(refund.amount);
      const refundedAmount = Number(refund.refundedAmountUSD || 0);
      const isPartial = refundedAmount > 0 && refundedAmount < requestedAmount;
      const isFullyRefunded = refundedAmount >= requestedAmount;
      const canArchive =
        refund.status === 'DONE' || (isFullyRefunded && refund.status !== 'ARCHIVED');

      return {
        id: refund.id,
        customerName: refund.customerName,
        amount: refund.amount,
        requestedAmountUSD: requestedAmount,
        refundedAmountUSD: refundedAmount,
        isPartial,
        canArchive,
        status: refund.status,
        createdAt: refund.createdAt,
        editable:
          refund.status === 'PENDING' && new Date(refund.editableUntil) > now,
        editableUntil: refund.editableUntil.toISOString(),
      };
    });

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
   * Confirm refund request is informed (move to ARCHIVED)
   * Only allowed if status == DONE
   */
  async confirmInformed(userId: string, refundId: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    // Verify ownership
    if (refund.requestedByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if fully refunded
    const requestedAmount = Number(refund.amount);
    const refundedAmount = Number(refund.refundedAmountUSD || 0);
    const isFullyRefunded = refundedAmount >= requestedAmount;

    // Only allow if status is DONE OR if fully refunded
    // Enforce: if partial, archive endpoint returns 403
    if (refund.status !== 'DONE' && !isFullyRefunded) {
      throw new ForbiddenException(
        'Cannot archive refund until it is fully refunded. Partial amount refunded: ' +
          `${refundedAmount} out of ${requestedAmount}`,
      );
    }

    const now = new Date();
    return this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: 'ARCHIVED',
        employeeConfirmedAt: now,
        archivedAt: now,
      },
    });
  }

  /**
   * Confirm refund request is informed (move to ARCHIVED) - for managers
   * Allows managers to confirm refunds for their team members
   */
  async confirmInformedForManager(managerId: string, refundId: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        requestedBy: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    // Check if refund is already archived
    if (refund.status === 'ARCHIVED') {
      throw new BadRequestException('Refund is already archived');
    }

    // Check if user is a manager
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { role: true },
    });

    if (!manager || manager.role !== 'MANAGER') {
      throw new ForbiddenException('Only managers can use this endpoint');
    }

    // Check if refund belongs to manager's team
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;
    let isTeamMember = false;

    if (hasAssignments) {
      // Check if refund requester is in manager's assigned team
      isTeamMember = assignments.some(
        (a) => a.employeeId === refund.requestedByUserId,
      );
    } else {
      // If no assignments, manager can access all employees
      // Add null check for requestedBy
      if (!refund.requestedBy) {
        throw new ForbiddenException('Access denied - refund requester not found');
      }
      isTeamMember = refund.requestedBy.role === 'EMPLOYEE';
    }

    if (!isTeamMember) {
      throw new ForbiddenException('Access denied - refund does not belong to your team');
    }

    // Check if fully refunded
    const requestedAmount = Number(refund.amount);
    const refundedAmount = Number(refund.refundedAmountUSD || 0);
    const isFullyRefunded = refundedAmount >= requestedAmount;

    // Only allow if status is DONE OR if fully refunded
    // Managers can archive refunds that are in DONE status, regardless of refunded amount
    if (refund.status !== 'DONE' && !isFullyRefunded) {
      throw new ForbiddenException(
        `Cannot archive refund. Status: ${refund.status}, Refunded: ${refundedAmount} out of ${requestedAmount}. ` +
          'Refund must be in DONE status or fully refunded to archive.',
      );
    }

    const now = new Date();
    return this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: 'ARCHIVED',
        employeeConfirmedAt: now,
        archivedAt: now,
      },
    });
  }
}

