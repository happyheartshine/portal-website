import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogData {
  action: string;
  performedByUserId: string;
  targetUserId?: string;
  details?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async log(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        performedByUserId: data.performedByUserId,
        targetUserId: data.targetUserId,
        details: data.details || {},
      },
    });
  }

  /**
   * Get audit logs with optional filters
   */
  async getLogs(filters?: {
    action?: string;
    performedByUserId?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.performedByUserId) {
      where.performedByUserId = filters.performedByUserId;
    }

    if (filters?.targetUserId) {
      where.targetUserId = filters.targetUserId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        targetUser: {
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
  }
}
