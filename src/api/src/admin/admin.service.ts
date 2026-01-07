import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from '../auth/dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async createUser(dto: CreateUserDto, createdByAdminId: string) {
    return this.authService.createUser(dto, createdByAdminId);
  }

  async deleteUser(userId: string, deletedByAdminId: string) {
    return this.authService.deleteUser(userId, deletedByAdminId);
  }

  /**
   * Get all users (optimized query)
   */
  async getAllUsers() {
    return this.prisma.user.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

