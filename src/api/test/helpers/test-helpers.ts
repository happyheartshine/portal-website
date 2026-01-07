import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

const prisma = new PrismaClient();

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  ratePerOrder?: number;
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(
  email: string,
  password: string,
  role: UserRole = UserRole.EMPLOYEE,
  name?: string,
  ratePerOrder?: number,
): Promise<TestUser> {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name || email.split('@')[0],
      role,
      ratePerOrder: ratePerOrder ? ratePerOrder : undefined,
      isActive: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    password,
    name: user.name,
    role: user.role,
    ratePerOrder: user.ratePerOrder ? Number(user.ratePerOrder) : undefined,
  };
}

/**
 * Create a team assignment (manager -> employee)
 */
export async function createTeamAssignment(
  managerId: string,
  employeeId: string,
) {
  return prisma.teamAssignment.create({
    data: {
      managerId,
      employeeId,
    },
  });
}

/**
 * Clean all test data
 */
export async function cleanDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.dataPurgeLog.deleteMany();
  await prisma.teamAssignment.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.warning.deleteMany();
  await prisma.deduction.deleteMany();
  await prisma.dailyOrderSubmission.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Get JWT token for a user (simulates login)
 */
export async function getAuthToken(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  return response.body.access_token;
}

