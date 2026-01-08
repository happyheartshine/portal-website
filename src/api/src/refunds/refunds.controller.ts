import {
  Controller,
  Get,
  Post,
  Patch,
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
import { UpdateRefundDto } from './dto/update-refund.dto';
import { PrismaService } from '../prisma/prisma.service';

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
  @ApiOperation({ summary: 'Get refund requests with optional status filter and cursor pagination' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'done', 'archived'],
    description: 'Filter by status',
  })
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
    description: 'List of refund requests with pagination',
    schema: {
      type: 'object',
      properties: {
        items: {
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
              editable: { type: 'boolean' },
              editableUntil: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              processedAt: { type: 'string', format: 'date-time', nullable: true },
              archivedAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRefunds(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.refundsService.getRefundRequests(user.userId, status, cursor, limitNum);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search refunds across statuses' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query (customer name)',
  })
  @ApiQuery({
    name: 'amount',
    required: false,
    description: 'Exact amount to match',
  })
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
    description: 'Search results with pagination',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              customerName: { type: 'string' },
              amount: { type: 'number' },
              status: { type: 'string', enum: ['PENDING', 'DONE', 'ARCHIVED'] },
              editable: { type: 'boolean' },
              editableUntil: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchRefunds(
    @CurrentUser() user: any,
    @Query('q') q?: string,
    @Query('amount') amount?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.refundsService.searchRefunds(user.userId, q, amount, cursor, limitNum);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('screenshot'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update refund request (only pending + within 12h)' })
  @ApiParam({ name: 'id', description: 'Refund request ID' })
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
          description: 'Screenshot file (image, optional)',
        },
      },
      required: ['customerName', 'zelleSenderName', 'server', 'category', 'reason', 'amount'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Refund request updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied or edit window expired' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async updateRefund(
    @CurrentUser() user: any,
    @Param('id') refundId: string,
    @Body() dto: UpdateRefundDto,
    @UploadedFile() screenshot?: Express.Multer.File,
  ) {
    return this.refundsService.updateRefund(user.userId, refundId, dto, screenshot);
  }

  @Post(':id/confirm-notified')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm refund request is notified (move to ARCHIVED)',
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
        employeeConfirmedAt: { type: 'string', format: 'date-time' },
        archivedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Refund not in DONE status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async confirmNotified(
    @CurrentUser() user: any,
    @Param('id') refundId: string,
  ) {
    return this.refundsService.confirmInformed(user.userId, refundId);
  }
}

@ApiTags('refunds')
@Controller('refunds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundsPublicController {
  constructor(
    private readonly refundsService: RefundsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':id/confirm-notified')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm refund request is notified (move to ARCHIVED) - Manager access',
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
        employeeConfirmedAt: { type: 'string', format: 'date-time' },
        archivedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Refund not in DONE status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async confirmNotified(
    @CurrentUser() user: any,
    @Param('id') refundId: string,
  ) {
    // Check if user is a manager, if so use manager method
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    });

    if (userRecord?.role === 'MANAGER') {
      return this.refundsService.confirmInformedForManager(user.userId, refundId);
    }

    // Otherwise use regular employee method
    return this.refundsService.confirmInformed(user.userId, refundId);
  }
}

