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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ManagementService } from './management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreateDeductionDto } from './dto/create-deduction.dto';

@ApiTags('management')
@Controller('management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@ApiBearerAuth()
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get management dashboard summary' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary with pending refunds, refund analytics, and credit analytics',
    schema: {
      type: 'object',
      properties: {
        pendingRefunds: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            totalAmountUSD: { type: 'number' },
          },
        },
        refundAnalytics: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            totalAmountUSD: { type: 'number' },
          },
        },
        creditAnalytics: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            totalAmountUSD: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getDashboardSummary() {
    return this.managementService.getDashboardSummary();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get orders with filters (manager can view all employees)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10 })
  @ApiResponse({
    status: 200,
    description: 'Cursor-paginated list of orders',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getOrders(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.managementService.getOrders(
      status,
      employeeId,
      from,
      to,
      cursor,
      limitNum,
    );
  }

  @Post('orders/:orderId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an order (idempotent)' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order approved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async approveOrder(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string,
  ) {
    return this.managementService.approveOrder(user.userId, orderId);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Get refunds with search filters' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'DONE', 'ARCHIVED'] })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by customer name' })
  @ApiQuery({ name: 'amount', required: false, type: String, description: 'Exact match for requestedAmountUSD' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10 })
  @ApiResponse({
    status: 200,
    description: 'Cursor-paginated list of refunds',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getRefunds(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('amount') amount?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.managementService.getRefunds(status, q, amount, cursor, limitNum);
  }

  @Post('refunds/:refundId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process refund (partial or full)' })
  @ApiParam({ name: 'refundId', description: 'Refund request ID' })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request (e.g., over-refund)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async processRefund(
    @CurrentUser() user: any,
    @Param('refundId') refundId: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.managementService.processRefund(user.userId, refundId, dto);
  }

  @Get('deductions/reasons')
  @ApiOperation({ summary: 'Get deduction reasons list' })
  @ApiResponse({
    status: 200,
    description: 'List of deduction reasons',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async getDeductionReasons() {
    return this.managementService.getDeductionReasons();
  }

  @Post('deductions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a deduction for an employee' })
  @ApiResponse({
    status: 201,
    description: 'Deduction created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async createDeduction(
    @CurrentUser() user: any,
    @Body() dto: CreateDeductionDto,
  ) {
    return this.managementService.createDeduction(user.userId, dto);
  }
}

