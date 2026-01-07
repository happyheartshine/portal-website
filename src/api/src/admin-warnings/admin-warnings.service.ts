import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWarningDto } from './dto/create-warning.dto';

@Injectable()
export class AdminWarningsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Issue a warning (and optional deduction) by admin
   */
  async issueWarning(adminId: string, dto: CreateWarningDto) {
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

    // Create warning
    const warning = await this.prisma.warning.create({
      data: {
        userId: dto.userId,
        reason: dto.reason,
        note: dto.note,
        sourceRole: 'ADMIN',
        sourceUserId: adminId,
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
          sourceRole: 'ADMIN',
          sourceUserId: adminId,
          warningId: warning.id,
        },
      });
    }

    // Audit log
    await this.auditService.log({
      action: 'warning_issued',
      performedByUserId: adminId,
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
}
