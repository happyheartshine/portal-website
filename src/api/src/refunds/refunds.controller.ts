import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RefundsService } from './refunds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRefundDto } from './dto/create-refund.dto';

@ApiTags('refunds')
@Controller('me/refunds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('screenshot'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a refund request with screenshot' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', example: 'John Doe' },
        zelleSenderName: { type: 'string', example: 'John Zelle' },
        server: { type: 'string', example: 'Server-01' },
        category: { type: 'string', example: 'Refund' },
        reason: { type: 'string', example: 'Customer requested refund' },
        amount: { type: 'number', example: 50.0 },
        screenshot: {
          type: 'string',
          format: 'binary',
          description: 'Screenshot file (image)',
        },
      },
      required: ['customerName', 'zelleSenderName', 'server', 'category', 'reason', 'amount'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Refund request created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        requestedByUserId: { type: 'string' },
        customerName: { type: 'string' },
        zelleSenderName: { type: 'string' },
        server: { type: 'string' },
        category: { type: 'string' },
        reason: { type: 'string' },
        amount: { type: 'number' },
        screenshotUrl: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['PENDING', 'DONE', 'ARCHIVED'] },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createRefund(
    @CurrentUser() user: any,
    @Body() dto: CreateRefundDto,
    @UploadedFile() screenshot?: Express.Multer.File,
  ) {
    return this.refundsService.createRefundRequest(
      user.userId,
      dto,
      screenshot,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get refund requests with optional status filter' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'done', 'archived'],
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of refund requests',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          requestedByUserId: { type: 'string' },
          customerName: { type: 'string' },
          zelleSenderName: { type: 'string' },
          server: { type: 'string' },
          category: { type: 'string' },
          reason: { type: 'string' },
          amount: { type: 'number' },
          screenshotUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'DONE', 'ARCHIVED'] },
          createdAt: { type: 'string', format: 'date-time' },
          processedAt: { type: 'string', format: 'date-time', nullable: true },
          archivedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRefunds(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.refundsService.getRefundRequests(user.userId, status);
  }

  @Post(':id/confirm-informed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm refund request is informed (move to ARCHIVED)',
  })
  @ApiParam({ name: 'id', description: 'Refund request ID' })
  @ApiResponse({
    status: 200,
    description: 'Refund request archived successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'DONE', 'ARCHIVED'] },
        archivedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Refund not in DONE status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async confirmInformed(
    @CurrentUser() user: any,
    @Param('id') refundId: string,
  ) {
    return this.refundsService.confirmInformed(user.userId, refundId);
  }
}

