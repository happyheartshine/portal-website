import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminWarningsService } from '../admin-warnings/admin-warnings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import { CreateWarningDto } from '../admin-warnings/dto/create-warning.dto';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminWarningsService: AdminWarningsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
        ratePerOrder: { type: 'number', nullable: true },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.adminService.createUser(createUserDto, currentUser.userId);
  }

  @Roles(UserRole.ADMIN)
  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
          ratePerOrder: { type: 'number', nullable: true },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Roles(UserRole.ADMIN)
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot delete admin users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.adminService.deleteUser(userId, currentUser.userId);
  }

  @Roles(UserRole.ADMIN)
  @Post('warnings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a warning (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Warning issued successfully',
    schema: {
      type: 'object',
      properties: {
        warning: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            reason: { type: 'string' },
            note: { type: 'string', nullable: true },
            sourceRole: { type: 'string', enum: ['ADMIN'] },
            deductionAmount: { type: 'number', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        deduction: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            amount: { type: 'number' },
            reason: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async issueWarning(
    @Body() createWarningDto: CreateWarningDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.adminWarningsService.issueWarning(
      currentUser.userId,
      createWarningDto,
    );
  }
}

