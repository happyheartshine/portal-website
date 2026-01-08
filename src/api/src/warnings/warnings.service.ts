import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarningsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get warnings for employee with tab filtering (recent/archive)
   * Implements lazy-archive: automatically archives warnings older than 30 days
   */
  async getWarnings(
    userId: string,
    tab: 'recent' | 'archive' = 'recent',
    cursor?: string,
    limit: number = 10,
  ) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Lazy-archive: Update warnings older than 30 days
    await this.prisma.warning.updateMany({
      where: {
        userId,
        createdAt: {
          lte: thirtyDaysAgo,
        },
        archivedAt: null,
      },
      data: {
        archivedAt: now,
      },
    });

    // Build base where clause
    const baseWhere: any = {
      userId,
    };

    if (tab === 'recent') {
      // Recent: archivedAt IS NULL and createdAt within 30 days
      baseWhere.archivedAt = null;
      baseWhere.createdAt = {
        gte: thirtyDaysAgo,
      };
    } else {
      // Archive: archivedAt IS NOT NULL OR createdAt older than 30 days
      baseWhere.OR = [
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
      ];
    }

    // Cursor pagination - combine with base conditions using AND
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
              createdAt: new Date(cursorData.createdAt),
              id: {
                lt: cursorData.id,
              },
            },
          ],
        };
        // Combine base conditions with cursor using AND
        where = {
          AND: [
            baseWhere,
            cursorConditions,
          ],
        };
      } catch (e) {
        // Invalid cursor, ignore it
      }
    }

    const warnings = await this.prisma.warning.findMany({
      where,
      include: {
        sourceUser: {
          select: {
            name: true,
            role: true,
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
      message: warning.reason + (warning.note ? `: ${warning.note}` : ''),
      createdAt: warning.createdAt,
      readAt: warning.readAt,
      archivedAt: warning.archivedAt,
      isRead: warning.isRead,
      sourceTag: this.getSourceTag(warning.sourceRole, warning.sourceUser),
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
   * Mark warning as read
   */
  async markAsRead(userId: string, warningId: string) {
    const warning = await this.prisma.warning.findFirst({
      where: {
        id: warningId,
        userId,
      },
    });

    if (!warning) {
      throw new NotFoundException('Warning not found');
    }

    return this.prisma.warning.update({
      where: { id: warningId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Generate source tag string for warnings
   */
  private getSourceTag(
    sourceRole: string,
    sourceUser: { name: string; role: string } | null,
  ): string {
    if (sourceRole === 'ADMIN') {
      return 'Warning from Admin';
    } else if (sourceRole === 'MANAGER' && sourceUser) {
      return `Warning from Manager ${sourceUser.name}`;
    } else if (sourceRole === 'MANAGER') {
      return 'Warning from Manager';
    }
    return 'Warning';
  }
}

