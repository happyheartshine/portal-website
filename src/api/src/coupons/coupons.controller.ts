import {
  Controller,
  Get,
  Post,
  Body,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GenerateCouponDto } from './dto/generate-coupon.dto';
import { HonorCouponDto } from './dto/honor-coupon.dto';
import { ClearCouponDto } from './dto/clear-coupon.dto';

@ApiTags('coupons')
@Controller('me/coupons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new coupon' })
  @ApiResponse({
    status: 201,
    description: 'Coupon generated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string', example: 'CP-20240115-1234' },
        issuedByUserId: { type: 'string' },
        issuedAt: { type: 'string', format: 'date-time' },
        customerName: { type: 'string' },
        server: { type: 'string' },
        category: { type: 'string' },
        reason: { type: 'string' },
        zelleName: { type: 'string' },
        amount: { type: 'number' },
        status: { type: 'string', enum: ['ISSUED', 'USED'] },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateCoupon(
    @CurrentUser() user: any,
    @Body() dto: GenerateCouponDto,
  ) {
    return this.couponsService.generateCoupon(user.userId, dto);
  }

  @Post('honor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Honor a coupon (mark as used)' })
  @ApiResponse({
    status: 200,
    description: 'Coupon honored successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        status: { type: 'string', enum: ['ISSUED', 'USED'] },
        usedByUserId: { type: 'string' },
        usedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid coupon status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invalid coupon code' })
  @ApiResponse({
    status: 409,
    description: 'Coupon already honored',
  })
  async honorCoupon(@CurrentUser() user: any, @Body() dto: HonorCouponDto) {
    return this.couponsService.honorCoupon(user.userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get coupon clear history with cursor pagination' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Coupon clear history',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              couponCode: { type: 'string' },
              clearedAt: { type: 'string', format: 'date-time' },
              clearedByName: { type: 'string' },
              clearedAmountUSD: { type: 'number' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCouponHistory(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.couponsService.getCouponClearHistory(cursor, limitNum);
  }
}

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CouponsPublicController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Get coupon info / balance check' })
  @ApiParam({ name: 'code', description: 'Coupon code' })
  @ApiResponse({
    status: 200,
    description: 'Coupon information',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        originalAmountUSD: { type: 'number' },
        remainingBalanceUSD: { type: 'number' },
        issuedAt: { type: 'string', format: 'date-time' },
        issuedByName: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['ACTIVE', 'EXPIRED', 'USED'] },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Invalid coupon code' })
  async getCoupon(@Param('code') code: string) {
    return this.couponsService.getCoupon(code);
  }

  @Post(':code/clear-full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear full coupon balance' })
  @ApiParam({ name: 'code', description: 'Coupon code' })
  @ApiResponse({
    status: 200,
    description: 'Coupon cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        clearedAt: { type: 'string', format: 'date-time' },
        clearedByName: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid amount or expired coupon' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invalid coupon code' })
  @ApiResponse({ status: 409, description: 'Coupon already used' })
  async clearFullBalance(
    @CurrentUser() user: any,
    @Param('code') code: string,
    @Body() dto: ClearCouponDto,
  ) {
    return this.couponsService.clearFullBalance(user.userId, code, dto);
  }

  @Post(':code/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send coupon (stub - TODO: integrate notifications)' })
  @ApiParam({ name: 'code', description: 'Coupon code' })
  @ApiResponse({
    status: 200,
    description: 'Coupon send request processed',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Coupon is not active' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invalid coupon code' })
  async sendCoupon(@Param('code') code: string) {
    return this.couponsService.sendCoupon(code);
  }

  @Post(':code/send-credit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send coupon credit (stub - TODO: integrate notifications)' })
  @ApiParam({ name: 'code', description: 'Coupon code' })
  @ApiResponse({
    status: 200,
    description: 'Coupon credit send request processed',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Coupon is not active' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invalid coupon code' })
  async sendCouponCredit(@Param('code') code: string) {
    return this.couponsService.sendCouponCredit(code);
  }
}

