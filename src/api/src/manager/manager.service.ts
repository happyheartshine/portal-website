import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApproveOrderDto } from './dto/approve-order.dto';
import { CreateWarningDto } from './dto/create-warning.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ManagerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get pending orders for manager's team
   * If team assignments exist, only show assigned employees
   * If no assignments exist, show all employees
   */
  async getPendingOrders(managerId: string) {
    // Check if manager has any team assignments
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;

    // Build where clause
    const where: any = {
      status: 'PENDING',
    };

    if (hasAssignments) {
      // Only show assigned employees
      const employeeIds = assignments.map((a) => a.employeeId);
      where.userId = { in: employeeIds };
    }
    // If no assignments, show all (manager can act on all employees)

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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders;
  }

  /**
   * Approve or reject an order
   * Enforces team scoping if assignments exist
   */
  async approveOrder(
    managerId: string,
    orderId: string,
    dto: ApproveOrderDto,
  ) {
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

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order is not pending');
    }

    // Check team scoping
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;
    if (hasAssignments) {
      const employeeIds = assignments.map((a) => a.employeeId);
      if (!employeeIds.includes(order.userId)) {
        throw new ForbiddenException(
          'Cannot approve order for employee outside your team',
        );
      }
    }

    // Update order
    const updatedOrder = await this.prisma.dailyOrderSubmission.update({
      where: { id: orderId },
      data: {
        status: dto.action === 'approve' ? 'APPROVED' : 'REJECTED',
        approvedCount:
          dto.action === 'approve' ? dto.approvedCount : null,
        managerId: dto.action === 'approve' ? managerId : null,
        approvedAt: dto.action === 'approve' ? new Date() : null,
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'order_approved',
      performedByUserId: managerId,
      targetUserId: order.userId,
      details: {
        orderId: order.id,
        action: dto.action,
        submittedCount: order.submittedCount,
        approvedCount: dto.approvedCount,
        dateKey: order.dateKey,
      },
    });

    return updatedOrder;
  }

  /**
   * Get pending refund requests for manager's team
   * If team assignments exist, only show assigned employees
   * If no assignments exist, show all employees
   */
  async getPendingRefunds(managerId: string) {
    // Check if manager has any team assignments
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;

    // Build where clause
    const where: any = {
      status: 'PENDING',
    };

    if (hasAssignments) {
      // Only show assigned employees
      const employeeIds = assignments.map((a) => a.employeeId);
      where.requestedByUserId = { in: employeeIds };
    }
    // If no assignments, show all (manager can act on all employees)

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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return refunds;
  }

  /**
   * Process refund request (mark as DONE)
   * Enforces team scoping if assignments exist
   */
  async processRefund(managerId: string, refundId: string) {
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

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Refund request is not pending');
    }

    // Check team scoping
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;
    if (hasAssignments) {
      const employeeIds = assignments.map((a) => a.employeeId);
      if (!employeeIds.includes(refund.requestedByUserId)) {
        throw new ForbiddenException(
          'Cannot process refund for employee outside your team',
        );
      }
    }

    // Update refund
    const updatedRefund = await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: 'DONE',
        processedByManagerId: managerId,
        processedAt: new Date(),
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'refund_processed',
      performedByUserId: managerId,
      targetUserId: refund.requestedByUserId,
      details: {
        refundId: refund.id,
        amount: refund.amount,
        status: 'DONE',
      },
    });

    return updatedRefund;
  }

  /**
   * Get manager dashboard stats
   */
  async getDashboardStats(managerId: string) {
    // Check if manager has any team assignments
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;

    // Build where clauses
    const orderWhere: any = { status: 'PENDING' };
    const refundWhere: any = { status: 'PENDING' };

    if (hasAssignments) {
      const employeeIds = assignments.map((a) => a.employeeId);
      orderWhere.userId = { in: employeeIds };
      refundWhere.requestedByUserId = { in: employeeIds };
    }

    const [pendingOrdersCount, pendingRefundsCount] = await Promise.all([
      this.prisma.dailyOrderSubmission.count({ where: orderWhere }),
      this.prisma.refundRequest.count({ where: refundWhere }),
    ]);

    return {
      pendingOrdersCount,
      pendingRefundsCount,
    };
  }

  /**
   * Issue a warning (and optional deduction) by manager
   * Enforces team scoping if assignments exist
   */
  async issueWarning(managerId: string, dto: CreateWarningDto) {
    // Verify employee exists and is active
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.employeeId },
    });

    if (!targetUser) {
      throw new NotFoundException('Employee not found');
    }

    if (!targetUser.isActive) {
      throw new BadRequestException('Cannot issue warning to inactive employee');
    }

    if (targetUser.role !== 'EMPLOYEE') {
      throw new BadRequestException('Can only issue warnings to employees');
    }

    // Check team scoping
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;
    if (hasAssignments) {
      const employeeIds = assignments.map((a) => a.employeeId);
      if (!employeeIds.includes(dto.employeeId)) {
        throw new ForbiddenException(
          'Cannot issue warning to employee outside your team',
        );
      }
    }

    // Create warning
    // Store message as reason (note can be null)
    const warning = await this.prisma.warning.create({
      data: {
        userId: dto.employeeId,
        reason: dto.message,
        note: null,
        sourceRole: UserRole.MANAGER,
        sourceUserId: managerId,
        deductionAmount: null, // Deductions are created separately via /management/deductions
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'warning_issued',
      performedByUserId: managerId,
      targetUserId: dto.employeeId,
      details: {
        warningId: warning.id,
        message: dto.message,
      },
    });

    return {
      warning,
    };
  }

  /**
   * Get team attendance for today or specific date
   * Enforces team scoping if assignments exist
   */
  async getTeamAttendance(managerId: string, dateKey?: string) {
    // Use today if no date provided
    const targetDate = dateKey || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Check if manager has any team assignments
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const hasAssignments = assignments.length > 0;
    let teamMembers: Array<{ id: string; name: string; email: string; role: string }>;

    if (hasAssignments) {
      // Only show assigned employees
      teamMembers = assignments.map((a) => a.employee);
    } else {
      // Show all employees and managers
      teamMembers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: [UserRole.EMPLOYEE, UserRole.MANAGER] },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    }

    // Get attendance records for the date
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        dateKey: targetDate,
        userId: { in: teamMembers.map((m) => m.id) },
      },
      select: {
        userId: true,
        timestamp: true,
        dateKey: true,
      },
    });

    // Build attendance map
    const attendanceMap = new Map(
      attendanceRecords.map((record) => [record.userId, record]),
    );

    // Combine team members with attendance status
    return teamMembers.map((member) => {
      const attendance = attendanceMap.get(member.id);
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        hasMarkedAttendance: !!attendance,
        markedAt: attendance?.timestamp || null,
      };
    });
  }

  /**
   * Get warnings issued by manager to their team
   * Supports tab filtering (recent/archive) and cursor pagination
   */
  async getWarnings(
    managerId: string,
    tab: 'recent' | 'archive' = 'recent',
    cursor?: string,
    limit: number = 20,
  ) {
    // Check if manager has any team assignments
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;
    let employeeIds: string[];

    if (hasAssignments) {
      employeeIds = assignments.map((a) => a.employeeId);
    } else {
      // If no assignments, get all employees
      const allEmployees = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: UserRole.EMPLOYEE,
        },
        select: { id: true },
      });
      employeeIds = allEmployees.map((e) => e.id);
    }

    if (employeeIds.length === 0) {
      return {
        items: [],
        nextCursor: null,
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Lazy-archive: Update warnings older than 30 days
    await this.prisma.warning.updateMany({
      where: {
        userId: { in: employeeIds },
        sourceUserId: managerId,
        createdAt: {
          lte: thirtyDaysAgo,
        },
        archivedAt: null,
      },
      data: {
        archivedAt: now,
      },
    });

    // Build base where clause - warnings issued by this manager to team members
    const baseConditions = {
      sourceUserId: managerId,
      userId: { in: employeeIds },
    };

    let baseWhere: any;
    if (tab === 'recent') {
      // Recent: archivedAt IS NULL and createdAt within 30 days
      baseWhere = {
        ...baseConditions,
        archivedAt: null,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      };
    } else {
      // Archive: archivedAt IS NOT NULL OR createdAt older than 30 days
      baseWhere = {
        AND: [
          baseConditions,
          {
            OR: [
              {
                archivedAt: {
                  not: null,
                },
              },
              {
                createdAt: {
                  lt: thirtyDaysAgo,
                },
              },
            ],
          },
        ],
      };
    }

    // Cursor pagination
    let where: any = baseWhere;
    if (cursor) {
      try {
        const cursorData = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8'),
        );
        const cursorConditions = {
          OR: [
            {
              createdAt: {
                lt: new Date(cursorData.createdAt),
              },
            },
            {
              AND: [
                {
                  createdAt: {
                    equals: new Date(cursorData.createdAt),
                  },
                },
                {
                  id: {
                    lt: cursorData.id,
                  },
                },
              ],
            },
          ],
        };
        where = {
          AND: [baseWhere, cursorConditions],
        };
      } catch (e) {
        // Invalid cursor, ignore it
      }
    }

    const warnings = await this.prisma.warning.findMany({
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

    const hasMore = warnings.length > limit;
    const items = hasMore ? warnings.slice(0, limit) : warnings;

    // Format response
    const formattedItems = items.map((warning) => ({
      id: warning.id,
      message: warning.reason,
      reason: warning.reason,
      note: warning.note,
      employee: {
        id: warning.user.id,
        name: warning.user.name,
        email: warning.user.email,
      },
      employeeName: warning.user.name,
      createdAt: warning.createdAt,
      readAt: warning.readAt,
      archivedAt: warning.archivedAt,
      isRead: warning.isRead,
      deductionAmount: warning.deductionAmount,
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
   * Search for a coupon by code (global search across all employees)
   * Returns full coupon lifecycle
   */
  async searchCoupon(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        issuedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        usedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return {
      id: coupon.id,
      code: coupon.code,
      customerName: coupon.customerName,
      server: coupon.server,
      category: coupon.category,
      reason: coupon.reason,
      zelleName: coupon.zelleName,
      amount: coupon.amount,
      status: coupon.status,
      issuedAt: coupon.issuedAt,
      issuedBy: coupon.issuedBy,
      usedAt: coupon.usedAt,
      usedBy: coupon.usedBy,
    };
  }
}

