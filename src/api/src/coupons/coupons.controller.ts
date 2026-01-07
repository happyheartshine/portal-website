import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GenerateCouponDto } from './dto/generate-coupon.dto';
import { HonorCouponDto } from './dto/honor-coupon.dto';

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
  @ApiOperation({ summary: 'Get coupon history (issued + honored)' })
  @ApiResponse({
    status: 200,
    description: 'Coupon history',
    schema: {
      type: 'object',
      properties: {
        issued: {
          type: 'array',
          items: { type: 'object' },
        },
        honored: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCouponHistory(@CurrentUser() user: any) {
    return this.couponsService.getCouponHistory(user.userId);
  }
}

