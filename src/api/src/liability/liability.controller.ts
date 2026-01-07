import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LiabilityService } from './liability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MonthQueryDto } from '../common/dto/month-query.dto';
import { UserRole } from '@prisma/client';

@ApiTags('admin-liability')
@Controller('admin/liability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class LiabilityController {
  constructor(private readonly liabilityService: LiabilityService) {}

  @Get('pending-salary')
  @ApiOperation({ summary: 'Get total pending salary for a month' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month in YYYY-MM format (defaults to current month)',
    example: '2024-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending salary data',
    schema: {
      type: 'object',
      properties: {
        totalPendingSalary: { type: 'number' },
        month: { type: 'string', example: '2024-01' },
        userCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getPendingSalary(@Query() query: MonthQueryDto) {
    const monthKey =
      query.month || new Date().toISOString().slice(0, 7); // YYYY-MM format
    return this.liabilityService.getPendingSalary(monthKey);
  }
}
