import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { LoginDto } from './dto/login.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _, passwordResetOtp: __, refreshToken: ___, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = { email: user.email, sub: user.id, role: user.role };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Store refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { email: user.email, sub: user.id, role: user.role };
      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      });

      return {
        access_token: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Don't reveal if user exists (security best practice)
    if (!user || !user.isActive) {
      return { message: 'If the email exists, a password reset OTP has been sent.' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    
    // OTP expires in 10 minutes
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOtp: otpHash,
        passwordResetExpiry: expiry,
      },
    });

    // Send OTP via email (stub in dev, logs to console)
    await this.emailService.sendPasswordResetOtp(user.email, otp);

    return { message: 'If the email exists, a password reset OTP has been sent.' };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid request');
    }

    if (!user.passwordResetOtp || !user.passwordResetExpiry) {
      throw new BadRequestException('No password reset request found');
    }

    if (new Date() > user.passwordResetExpiry) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const isOtpValid = await bcrypt.compare(dto.otp, user.passwordResetOtp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Update password and clear OTP fields
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetOtp: null,
        passwordResetExpiry: null,
        refreshToken: null, // Invalidate all refresh tokens
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  async createUser(dto: CreateUserDto, createdByAdminId: string) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        ratePerOrder: dto.ratePerOrder,
        isActive: true,
      },
    });

    const { passwordHash: _, passwordResetOtp: __, refreshToken: ___, ...result } = user;
    return result;
  }

  async deleteUser(userId: string, deletedByAdminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        attendances: true,
        dailyOrderSubmissions: true,
        deductions: true,
        warnings: true,
        couponsIssued: true,
        couponsUsed: true,
        refundRequests: true,
        teamAsManager: true,
        teamAsEmployee: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin users');
    }

    // Check for foreign key constraints
    // Since Prisma has cascade deletes configured, we can safely hard delete
    // However, for safety, we'll use soft delete (isActive=false) to preserve data integrity
    // This allows for audit trails and data recovery if needed
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        refreshToken: null, // Invalidate refresh tokens
      },
    });

    return { message: 'User has been deactivated successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ratePerOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
