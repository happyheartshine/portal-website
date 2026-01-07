import {
  Controller,
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
import { PurgeService } from './purge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PurgeDto } from './dto/purge.dto';
import { UserRole } from '@prisma/client';

@ApiTags('admin-purge')
@Controller('admin/purge')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class PurgeController {
  constructor(private readonly purgeService: PurgeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge refund and coupon data for a month' })
  @ApiResponse({
    status: 200,
    description: 'Data purged successfully',
    schema: {
      type: 'object',
      properties: {
        monthKey: { type: 'string', example: '2024-01' },
        tablesPurged: {
          type: 'array',
          items: { type: 'string' },
        },
        refundsDeleted: { type: 'number' },
        couponsDeleted: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid month format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async purgeMonthData(
    @Body() dto: PurgeDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.purgeService.purgeMonthData(dto.monthKey, currentUser.userId);
  }
}
