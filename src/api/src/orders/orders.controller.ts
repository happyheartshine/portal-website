import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { MonthQueryDto } from '../common/dto/month-query.dto';

@ApiTags('orders')
@Controller('me/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update daily order submission' })
  @ApiResponse({
    status: 201,
    description: 'Order submission created or updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        dateKey: { type: 'string', example: '2024-01-15' },
        submittedCount: { type: 'number' },
        status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
        approvedCount: { type: 'number', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot modify approved order' })
  async createOrUpdateOrder(
    @CurrentUser() user: any,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrUpdateOrder(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get order submissions for a month' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month in YYYY-MM format (defaults to current month)',
    example: '2024-01',
  })
  @ApiResponse({
    status: 200,
    description: 'List of order submissions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          dateKey: { type: 'string', example: '2024-01-15' },
          submittedCount: { type: 'number' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          approvedCount: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrders(
    @CurrentUser() user: any,
    @Query() query: MonthQueryDto,
  ) {
    const monthKey =
      query.month || new Date().toISOString().slice(0, 7); // YYYY-MM format
    return this.ordersService.getOrdersForMonth(user.userId, monthKey);
  }
}

