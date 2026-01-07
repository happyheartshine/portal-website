import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TrendRange } from '../user/dto/trends-query.dto';
import { MonthQueryDto } from '../common/dto/month-query.dto';
import { UserRole } from '@prisma/client';

@ApiTags('admin-analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('orders')
  @ApiOperation({ summary: 'Get order analytics for a date range' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: TrendRange,
    description: 'Number of days for analysis',
    example: TrendRange.SEVEN_DAYS,
  })
  @ApiResponse({
    status: 200,
    description: 'Order analytics',
    schema: {
      type: 'object',
      properties: {
        totalOrdersSeries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2024-01-15' },
              total: { type: 'number' },
            },
          },
        },
        perEmployeeBar: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              employeeName: { type: 'string' },
              employeeEmail: { type: 'string' },
              totalApprovedOrders: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getOrderAnalytics(@Query('range') range?: TrendRange) {
    const rangeValue = range || TrendRange.SEVEN_DAYS;
    return this.analyticsService.getOrderAnalytics(rangeValue);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Get refund analytics for a month' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month in YYYY-MM format (defaults to current month)',
    example: '2024-01',
  })
  @ApiQuery({
    name: 'byEmployee',
    required: false,
    type: Boolean,
    description: 'Include breakdown by employee',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund analytics',
    schema: {
      type: 'object',
      properties: {
        totalRefundsAmount: { type: 'number' },
        count: { type: 'number' },
        byEmployee: {
          type: 'array',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              employeeName: { type: 'string' },
              employeeEmail: { type: 'string' },
              totalAmount: { type: 'number' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getRefundAnalytics(
    @Query() query: MonthQueryDto,
    @Query('byEmployee') byEmployee?: string,
  ) {
    const monthKey =
      query.month || new Date().toISOString().slice(0, 7); // YYYY-MM format
    const includeByEmployee = byEmployee === 'true' || byEmployee === '1';
    return this.analyticsService.getRefundAnalytics(monthKey, includeByEmployee);
  }

  @Get('credits')
  @ApiOperation({ summary: 'Get coupon/credit analytics for a month' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month in YYYY-MM format (defaults to current month)',
    example: '2024-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit analytics',
    schema: {
      type: 'object',
      properties: {
        totalIssuedAmount: { type: 'number' },
        totalRedeemedAmount: { type: 'number' },
        issuedCount: { type: 'number' },
        redeemedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getCreditAnalytics(@Query() query: MonthQueryDto) {
    const monthKey =
      query.month || new Date().toISOString().slice(0, 7); // YYYY-MM format
    return this.analyticsService.getCreditAnalytics(monthKey);
  }
}
