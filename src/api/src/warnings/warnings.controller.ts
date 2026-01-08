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
import { WarningsService } from './warnings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('warnings')
@Controller('warnings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WarningsController {
  constructor(private readonly warningsService: WarningsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get warnings for current user with tab filtering' })
  @ApiQuery({
    name: 'tab',
    required: false,
    enum: ['recent', 'archive'],
    description: 'Tab filter: recent (default) or archive',
    example: 'recent',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
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
    description: 'Cursor-paginated list of warnings',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              readAt: { type: 'string', format: 'date-time', nullable: true },
              archivedAt: { type: 'string', format: 'date-time', nullable: true },
              isRead: { type: 'boolean' },
              sourceTag: { type: 'string' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWarnings(
    @CurrentUser() user: any,
    @Query('tab') tab?: 'recent' | 'archive',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const tabValue = tab || 'recent';
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.warningsService.getWarnings(
      user.userId,
      tabValue,
      cursor,
      limitNum,
    );
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a warning as read' })
  @ApiParam({ name: 'id', description: 'Warning ID' })
  @ApiResponse({
    status: 200,
    description: 'Warning marked as read',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Warning not found' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') warningId: string,
  ) {
    return this.warningsService.markAsRead(user.userId, warningId);
  }
}

