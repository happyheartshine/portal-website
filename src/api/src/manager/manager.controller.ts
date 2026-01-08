import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ManagerService } from './manager.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApproveOrderDto } from './dto/approve-order.dto';
import { CreateWarningDto } from './dto/create-warning.dto';
import { UserRole } from '@prisma/client';

@ApiTags('manager')
@Controller('manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@ApiBearerAuth()
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get manager dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
    schema: {
      type: 'object',
      properties: {
        pendingOrdersCount: { type: 'number' },
        pendingRefundsCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getDashboardStats(@CurrentUser() user: any) {
    return this.managerService.getDashboardStats(user.userId);
  }

  @Get('orders/pending')
  @ApiOperation({ summary: 'Get pending orders for manager team' })
  @ApiResponse({
    status: 200,
    description: 'List of pending orders',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          dateKey: { type: 'string' },
          submittedCount: { type: 'number' },
          status: { type: 'string', enum: ['PENDING'] },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getPendingOrders(@CurrentUser() user: any) {
    return this.managerService.getPendingOrders(user.userId);
  }

  @Post('orders/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject an order' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: 'clxxx...',
  })
  @ApiResponse({
    status: 200,
    description: 'Order approved/rejected successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        dateKey: { type: 'string' },
        submittedCount: { type: 'number' },
        status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
        approvedCount: { type: 'number', nullable: true },
        managerId: { type: 'string', nullable: true },
        approvedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async approveOrder(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
    @Body() dto: ApproveOrderDto,
  ) {
    return this.managerService.approveOrder(user.userId, orderId, dto);
  }

  @Get('refunds/pending')
  @ApiOperation({ summary: 'Get pending refund requests for manager team' })
  @ApiResponse({
    status: 200,
    description: 'List of pending refund requests',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          requestedByUserId: { type: 'string' },
          customerName: { type: 'string' },
          zelleSenderName: { type: 'string' },
          server: { type: 'string' },
          category: { type: 'string' },
          reason: { type: 'string' },
          amount: { type: 'number' },
          screenshotUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING'] },
          createdAt: { type: 'string', format: 'date-time' },
          requestedBy: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getPendingRefunds(@CurrentUser() user: any) {
    return this.managerService.getPendingRefunds(user.userId);
  }

  @Post('refunds/:id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process refund request (mark as DONE)' })
  @ApiParam({
    name: 'id',
    description: 'Refund request ID',
    example: 'clxxx...',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        requestedByUserId: { type: 'string' },
        status: { type: 'string', enum: ['DONE'] },
        processedByManagerId: { type: 'string' },
        processedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async processRefund(
    @CurrentUser() user: any,
    @Param('id') refundId: string,
  ) {
    return this.managerService.processRefund(user.userId, refundId);
  }

  @Get('warnings')
  @ApiOperation({ summary: 'Get warnings issued by manager to their team' })
  @ApiQuery({
    name: 'tab',
    required: false,
    enum: ['recent', 'archive'],
    description: 'Filter by tab (recent or archive)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of warnings with pagination',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
              reason: { type: 'string' },
              note: { type: 'string', nullable: true },
              employee: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              employeeName: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              readAt: { type: 'string', format: 'date-time', nullable: true },
              archivedAt: { type: 'string', format: 'date-time', nullable: true },
              isRead: { type: 'boolean' },
              deductionAmount: { type: 'number', nullable: true },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getWarnings(
    @CurrentUser() user: any,
    @Query('tab') tab?: 'recent' | 'archive',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.managerService.getWarnings(
      user.userId,
      tab || 'recent',
      cursor,
      limitNum,
    );
  }

  @Post('warnings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a warning to an employee (Manager only)' })
  @ApiResponse({
    status: 201,
    description: 'Warning issued successfully',
    schema: {
      type: 'object',
      properties: {
        warning: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            reason: { type: 'string' },
            note: { type: 'string', nullable: true },
            sourceRole: { type: 'string', enum: ['MANAGER'] },
            deductionAmount: { type: 'number', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        deduction: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            amount: { type: 'number' },
            reason: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async issueWarning(
    @Body() dto: CreateWarningDto,
    @CurrentUser() user: any,
  ) {
    return this.managerService.issueWarning(user.userId, dto);
  }

  @Get('attendance/today')
  @ApiOperation({ summary: 'Get team attendance for today' })
  @ApiResponse({
    status: 200,
    description: 'Team attendance list',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['EMPLOYEE', 'MANAGER'] },
          hasMarkedAttendance: { type: 'boolean' },
          markedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getTeamAttendanceToday(@CurrentUser() user: any) {
    return this.managerService.getTeamAttendance(user.userId);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get team attendance for a specific date' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date in YYYY-MM-DD format (defaults to today)',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Team attendance list',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['EMPLOYEE', 'MANAGER'] },
          hasMarkedAttendance: { type: 'boolean' },
          markedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getTeamAttendance(
    @CurrentUser() user: any,
    @Query('date') date?: string,
  ) {
    return this.managerService.getTeamAttendance(user.userId, date);
  }

  @Get('coupons/search')
  @ApiOperation({ summary: 'Search for a coupon by code (global search)' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Coupon code to search',
    example: 'CP-20240115-1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Coupon details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        customerName: { type: 'string' },
        server: { type: 'string' },
        category: { type: 'string' },
        reason: { type: 'string' },
        zelleName: { type: 'string' },
        amount: { type: 'number' },
        status: { type: 'string', enum: ['ISSUED', 'USED'] },
        issuedAt: { type: 'string', format: 'date-time' },
        issuedBy: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
        usedAt: { type: 'string', format: 'date-time', nullable: true },
        usedBy: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async searchCoupon(
    @CurrentUser() user: any,
    @Query('code') code: string,
  ) {
    if (!code) {
      throw new BadRequestException('Coupon code is required');
    }
    return this.managerService.searchCoupon(code);
  }
}

