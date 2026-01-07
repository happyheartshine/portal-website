import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: { type: 'string' },
      },
      required: ['refresh_token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Public()
  @Post('reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent (if email exists)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Post('reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm password reset with OTP' })
  @ApiBody({ type: PasswordResetConfirmDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.userId);
  }
}

