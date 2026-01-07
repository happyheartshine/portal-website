import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SalaryService } from '../src/salary/salary.service';
import {
  createTestUser,
  cleanDatabase,
} from './helpers/test-helpers';
import { UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Salary Math (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let salaryService: SalaryService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    salaryService = moduleFixture.get<SalaryService>(SalaryService);
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  describe('Salary calculation with approved orders only', () => {
    it('should only count approved orders in salary calculation', async () => {
      const employee = await createTestUser(
        'employee@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee',
        5.0, // ratePerOrder
      );
      const manager = await createTestUser(
        'manager@example.com',
        'password123',
        UserRole.MANAGER,
      );

      // Create orders with different statuses
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-15',
          submittedCount: 10,
          status: 'PENDING',
        },
      });

      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-16',
          submittedCount: 20,
          approvedCount: 18,
          status: 'APPROVED',
          managerId: manager.id,
          approvedAt: new Date(),
        },
      });

      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-17',
          submittedCount: 15,
          status: 'REJECTED',
        },
      });

      // Calculate salary
      const result = await salaryService.calculateMonthlySalary(
        employee.id,
        '2024-01',
      );

      // Should only count approved orders (18), not pending (10) or rejected (15)
      expect(result.approvedOrdersCount).toBe(18);
      expect(result.salary.toNumber()).toBe(18 * 5.0); // 90.0
    });

    it('should return zero salary if no approved orders', async () => {
      const employee = await createTestUser(
        'employee2@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee',
        5.0,
      );

      // Create only pending orders
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-15',
          submittedCount: 10,
          status: 'PENDING',
        },
      });

      const result = await salaryService.calculateMonthlySalary(
        employee.id,
        '2024-01',
      );

      expect(result.approvedOrdersCount).toBe(0);
      expect(result.salary.toNumber()).toBe(0);
    });
  });

  describe('Deductions subtract from salary', () => {
    it('should subtract deductions from salary', async () => {
      const employee = await createTestUser(
        'employee3@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee',
        10.0, // ratePerOrder
      );
      const manager = await createTestUser(
        'manager2@example.com',
        'password123',
        UserRole.MANAGER,
      );

      // Create approved orders
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-15',
          submittedCount: 20,
          approvedCount: 20,
          status: 'APPROVED',
          managerId: manager.id,
          approvedAt: new Date('2024-01-15T10:00:00Z'),
        },
      });

      // Create deductions
      await prisma.deduction.create({
        data: {
          userId: employee.id,
          amount: 25.0,
          reason: 'Deduction 1',
          sourceRole: UserRole.MANAGER,
          sourceUserId: manager.id,
          createdAt: new Date('2024-01-15T12:00:00Z'),
        },
      });

      await prisma.deduction.create({
        data: {
          userId: employee.id,
          amount: 15.0,
          reason: 'Deduction 2',
          sourceRole: UserRole.MANAGER,
          sourceUserId: manager.id,
          createdAt: new Date('2024-01-16T10:00:00Z'),
        },
      });

      const result = await salaryService.calculateMonthlySalary(
        employee.id,
        '2024-01',
      );

      // Salary = (20 orders * 10.0) - (25.0 + 15.0) = 200 - 40 = 160
      expect(result.approvedOrdersCount).toBe(20);
      expect(result.totalDeductions.toNumber()).toBe(40.0);
      expect(result.salary.toNumber()).toBe(160.0);
    });

    it('should handle salary going negative (should return 0)', async () => {
      const employee = await createTestUser(
        'employee4@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee',
        5.0,
      );
      const manager = await createTestUser(
        'manager3@example.com',
        'password123',
        UserRole.MANAGER,
      );

      // Create small approved orders
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-15',
          submittedCount: 5,
          approvedCount: 5,
          status: 'APPROVED',
          managerId: manager.id,
          approvedAt: new Date('2024-01-15T10:00:00Z'),
        },
      });

      // Create large deduction
      await prisma.deduction.create({
        data: {
          userId: employee.id,
          amount: 100.0,
          reason: 'Large deduction',
          sourceRole: UserRole.MANAGER,
          sourceUserId: manager.id,
          createdAt: new Date('2024-01-15T12:00:00Z'),
        },
      });

      const result = await salaryService.calculateMonthlySalary(
        employee.id,
        '2024-01',
      );

      // Salary = (5 * 5.0) - 100.0 = 25 - 100 = -75, but should return 0
      expect(result.approvedOrdersCount).toBe(5);
      expect(result.totalDeductions.toNumber()).toBe(100.0);
      expect(result.salary.toNumber()).toBe(0); // Should not go negative
    });
  });

  describe('Decimal precision in salary calculations', () => {
    it('should handle decimal rates correctly', async () => {
      const employee = await createTestUser(
        'employee5@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee',
        5.75, // Decimal rate
      );
      const manager = await createTestUser(
        'manager4@example.com',
        'password123',
        UserRole.MANAGER,
      );

      // Create approved orders
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-15',
          submittedCount: 10,
          approvedCount: 10,
          status: 'APPROVED',
          managerId: manager.id,
          approvedAt: new Date('2024-01-15T10:00:00Z'),
        },
      });

      // Create decimal deduction
      await prisma.deduction.create({
        data: {
          userId: employee.id,
          amount: 12.50,
          reason: 'Decimal deduction',
          sourceRole: UserRole.MANAGER,
          sourceUserId: manager.id,
          createdAt: new Date('2024-01-15T12:00:00Z'),
        },
      });

      const result = await salaryService.calculateMonthlySalary(
        employee.id,
        '2024-01',
      );

      // Salary = (10 * 5.75) - 12.50 = 57.50 - 12.50 = 45.00
      expect(result.approvedOrdersCount).toBe(10);
      expect(result.totalDeductions.toNumber()).toBe(12.5);
      expect(result.salary.toNumber()).toBe(45.0);
    });

    it('should handle multiple decimal operations correctly', async () => {
      const employee = await createTestUser(
        'employee6@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee',
        7.33, // More complex decimal
      );
      const manager = await createTestUser(
        'manager5@example.com',
        'password123',
        UserRole.MANAGER,
      );

      // Create approved orders
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-15',
          submittedCount: 3,
          approvedCount: 3,
          status: 'APPROVED',
          managerId: manager.id,
          approvedAt: new Date('2024-01-15T10:00:00Z'),
        },
      });

      // Create multiple decimal deductions
      await prisma.deduction.create({
        data: {
          userId: employee.id,
          amount: 5.67,
          reason: 'Deduction 1',
          sourceRole: UserRole.MANAGER,
          sourceUserId: manager.id,
          createdAt: new Date('2024-01-15T12:00:00Z'),
        },
      });

      await prisma.deduction.create({
        data: {
          userId: employee.id,
          amount: 2.34,
          reason: 'Deduction 2',
          sourceRole: UserRole.MANAGER,
          sourceUserId: manager.id,
          createdAt: new Date('2024-01-16T10:00:00Z'),
        },
      });

      const result = await salaryService.calculateMonthlySalary(
        employee.id,
        '2024-01',
      );

      // Salary = (3 * 7.33) - (5.67 + 2.34) = 21.99 - 8.01 = 13.98
      expect(result.approvedOrdersCount).toBe(3);
      expect(result.totalDeductions.toNumber()).toBeCloseTo(8.01, 2);
      expect(result.salary.toNumber()).toBeCloseTo(13.98, 2);
    });
  });
});

