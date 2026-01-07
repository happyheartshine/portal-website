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
    // Verify user exists and is active
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (!targetUser.isActive) {
      throw new BadRequestException('Cannot issue warning to inactive user');
    }

    // Check team scoping
    const assignments = await this.prisma.teamAssignment.findMany({
      where: { managerId },
      select: { employeeId: true },
    });

    const hasAssignments = assignments.length > 0;
    if (hasAssignments) {
      const employeeIds = assignments.map((a) => a.employeeId);
      if (!employeeIds.includes(dto.userId)) {
        throw new ForbiddenException(
          'Cannot issue warning to employee outside your team',
        );
      }
    }

    // Create warning
    const warning = await this.prisma.warning.create({
      data: {
        userId: dto.userId,
        reason: dto.reason,
        note: dto.note,
        sourceRole: UserRole.MANAGER,
        sourceUserId: managerId,
        deductionAmount: dto.deductionAmount,
      },
    });

    // Create deduction if amount provided
    let deduction = null;
    if (dto.deductionAmount && dto.deductionAmount > 0) {
      deduction = await this.prisma.deduction.create({
        data: {
          userId: dto.userId,
          amount: dto.deductionAmount,
          reason: `Deduction from warning: ${dto.reason}`,
          sourceRole: UserRole.MANAGER,
          sourceUserId: managerId,
          warningId: warning.id,
        },
      });
    }

    // Audit log
    await this.auditService.log({
      action: 'warning_issued',
      performedByUserId: managerId,
      targetUserId: dto.userId,
      details: {
        warningId: warning.id,
        reason: dto.reason,
        deductionAmount: dto.deductionAmount,
        deductionId: deduction?.id,
      },
    });

    return {
      warning,
      deduction,
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

