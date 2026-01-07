import {
  Controller,
  Get,
  Post,
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
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MonthQueryDto } from '../common/dto/month-query.dto';

@ApiTags('attendance')
@Controller('me/attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mark attendance for today (idempotent)' })
  @ApiResponse({
    status: 201,
    description: 'Attendance marked successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        dateKey: { type: 'string', example: '2024-01-15' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAttendance(@CurrentUser() user: any) {
    return this.attendanceService.markAttendance(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get attendance list for a month' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month in YYYY-MM format (defaults to current month)',
    example: '2024-01',
  })
  @ApiResponse({
    status: 200,
    description: 'List of attendance records',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          dateKey: { type: 'string', example: '2024-01-15' },
          timestamp: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAttendance(
    @CurrentUser() user: any,
    @Query() query: MonthQueryDto,
  ) {
    const monthKey =
      query.month || new Date().toISOString().slice(0, 7); // YYYY-MM format
    return this.attendanceService.getAttendanceForMonth(user.userId, monthKey);
  }
}

