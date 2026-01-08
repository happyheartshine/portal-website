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
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersPublicController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('approved')
  @ApiOperation({ summary: 'Get approved orders history with cursor pagination' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination',
    example: 'clxxx...',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Approved orders with pagination',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              date: { type: 'string', example: '2024-01-15' },
              count: { type: 'number' },
              total: { type: 'number' },
              status: { type: 'string', enum: ['APPROVED'] },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getApprovedOrders(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.ordersService.getApprovedOrders(cursor, limitNum);
  }
}

