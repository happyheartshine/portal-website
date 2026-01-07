import {
  Controller,
  Get,
  Post,
  Param,
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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TrendsQueryDto, TrendRange } from './dto/trends-query.dto';

@ApiTags('user')
@Controller('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user dashboard data for a month' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month in YYYY-MM format (defaults to current month)',
    example: '2024-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data',
    schema: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-01' },
        salary: { type: 'number', example: 1500.0 },
        totalDeductions: { type: 'number', example: 50.0 },
        approvedOrders: { type: 'number', example: 100 },
        ongoingRefunds: { type: 'number', example: 3 },
        unreadWarnings: { type: 'number', example: 2 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(
    @CurrentUser() user: any,
    @Query() query: DashboardQueryDto,
  ) {
    // Default to current month if not provided
    const monthKey =
      query.month ||
      new Date().toISOString().slice(0, 7); // YYYY-MM format

    return this.userService.getDashboardData(user.userId, monthKey);
  }

  @Get('orders/trends')
  @ApiOperation({ summary: 'Get order trends over a date range' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: TrendRange,
    description: 'Number of days for trend analysis',
    example: TrendRange.SEVEN_DAYS,
  })
  @ApiResponse({
    status: 200,
    description: 'Order trends data',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2024-01-15' },
          submitted: { type: 'number', example: 10 },
          approved: { type: 'number', example: 8 },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrderTrends(
    @CurrentUser() user: any,
    @Query() query: TrendsQueryDto,
  ) {
    const range = query.range || TrendRange.SEVEN_DAYS;
    return this.userService.getOrderTrends(user.userId, range);
  }

  @Get('warnings')
  @ApiOperation({ summary: 'Get user warnings with source tags' })
  @ApiResponse({
    status: 200,
    description: 'List of warnings',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          reason: { type: 'string' },
          note: { type: 'string', nullable: true },
          sourceTag: { type: 'string', example: 'Warning from Manager John Doe' },
          deductionAmount: { type: 'number', nullable: true },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          readAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWarnings(@CurrentUser() user: any) {
    return this.userService.getWarnings(user.userId);
  }

  @Post('warnings/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a warning as read' })
  @ApiParam({ name: 'id', description: 'Warning ID' })
  @ApiResponse({
    status: 200,
    description: 'Warning marked as read',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        isRead: { type: 'boolean' },
        readAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Warning not found' })
  async markWarningAsRead(
    @CurrentUser() user: any,
    @Param('id') warningId: string,
  ) {
    return this.userService.markWarningAsRead(user.userId, warningId);
  }
}

