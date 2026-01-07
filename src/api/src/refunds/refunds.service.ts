import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class RefundsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Create a refund request with screenshot upload
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
      },
    });
  }

  /**
   * Get refund requests with optional status filter
   */
  async getRefundRequests(userId: string, status?: string) {
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

    return this.prisma.refundRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
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

    // Only allow if status is DONE
    if (refund.status !== 'DONE') {
      throw new BadRequestException(
        'Can only confirm informed for refunds with DONE status',
      );
    }

    return this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });
  }
}

