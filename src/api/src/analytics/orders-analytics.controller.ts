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
import { UserRole } from '@prisma/client';

@ApiTags('analytics')
@Controller('analytics/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.ADMIN)
@ApiBearerAuth()
export class OrdersAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('daily-this-month')
  @ApiOperation({
    summary: 'Get daily orders for ongoing month (day 1..today inclusive, IST)',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily orders for current month',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2024-01-15' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager/Admin only' })
  async getDailyOrdersThisMonth() {
    return this.analyticsService.getDailyOrdersThisMonth();
  }

  @Get('monthly-last-3')
  @ApiOperation({
    summary: 'Get monthly orders for last 3 completed months',
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly orders for last 3 completed months',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', example: '2024-01' },
              label: { type: 'string', example: 'Jan 2024' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager/Admin only' })
  async getMonthlyOrdersLast3() {
    return this.analyticsService.getMonthlyOrdersLast3();
  }

  @Get('daily-recent')
  @ApiOperation({
    summary: 'Get recent daily orders trend (7-14 days, default 14)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days (7-31, default 14)',
    example: 14,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent daily orders trend',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2024-01-15' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid days parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager/Admin only' })
  async getDailyOrdersRecent(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 14;
    return this.analyticsService.getDailyOrdersRecent(daysNum);
  }
}

