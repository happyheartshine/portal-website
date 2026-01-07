import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestUser,
  cleanDatabase,
  getAuthToken,
} from './helpers/test-helpers';
import { UserRole } from '@prisma/client';

describe('Employee Privacy (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
    await app.close();
  });

  describe('Employee cannot read other employees data', () => {
    it('should only return own orders', async () => {
      const employee1 = await createTestUser(
        'employee1@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const employee2 = await createTestUser(
        'employee2@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );

      const token1 = await getAuthToken(
        app,
        'employee1@example.com',
        'password123',
      );

      // Create orders for both employees
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee1.id,
          dateKey: '2024-01-15',
          submittedCount: 10,
          status: 'PENDING',
        },
      });

      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee2.id,
          dateKey: '2024-01-15',
          submittedCount: 20,
          status: 'PENDING',
        },
      });

      // Employee1 should only see their own orders
      const response = await request(app.getHttpServer())
        .get('/api/me/orders?month=2024-01')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].userId).toBe(employee1.id);
      expect(response.body[0].submittedCount).toBe(10);
    });

    it('should only return own refunds', async () => {
      const employee1 = await createTestUser(
        'employee1refund@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const employee2 = await createTestUser(
        'employee2refund@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );

      const token1 = await getAuthToken(
        app,
        'employee1refund@example.com',
        'password123',
      );

      // Create refunds for both employees
      await prisma.refundRequest.create({
        data: {
          requestedByUserId: employee1.id,
          customerName: 'Customer 1',
          zelleSenderName: 'Zelle 1',
          server: 'Server-01',
          category: 'Refund',
          reason: 'Reason 1',
          amount: 50.0,
          status: 'PENDING',
        },
      });

      await prisma.refundRequest.create({
        data: {
          requestedByUserId: employee2.id,
          customerName: 'Customer 2',
          zelleSenderName: 'Zelle 2',
          server: 'Server-02',
          category: 'Refund',
          reason: 'Reason 2',
          amount: 100.0,
          status: 'PENDING',
        },
      });

      // Employee1 should only see their own refunds
      const response = await request(app.getHttpServer())
        .get('/api/me/refunds')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].requestedByUserId).toBe(employee1.id);
      expect(response.body[0].customerName).toBe('Customer 1');
    });

    it('should only return own coupons', async () => {
      const employee1 = await createTestUser(
        'employee1coupon@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const employee2 = await createTestUser(
        'employee2coupon@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );

      const token1 = await getAuthToken(
        app,
        'employee1coupon@example.com',
        'password123',
      );

      // Create coupons for both employees
      await prisma.coupon.create({
        data: {
          code: 'CP-20240115-1111',
          issuedByUserId: employee1.id,
          issuedAt: new Date(),
          customerName: 'Customer 1',
          server: 'Server-01',
          category: 'Category 1',
          reason: 'Reason 1',
          zelleName: 'Zelle 1',
          amount: 25.0,
          status: 'ISSUED',
        },
      });

      await prisma.coupon.create({
        data: {
          code: 'CP-20240115-2222',
          issuedByUserId: employee2.id,
          issuedAt: new Date(),
          customerName: 'Customer 2',
          server: 'Server-02',
          category: 'Category 2',
          reason: 'Reason 2',
          zelleName: 'Zelle 2',
          amount: 50.0,
          status: 'ISSUED',
        },
      });

      // Employee1 should only see their own coupons
      const response = await request(app.getHttpServer())
        .get('/api/me/coupons/history')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.issued).toBeInstanceOf(Array);
      expect(response.body.issued.length).toBe(1);
      expect(response.body.issued[0].issuedByUserId).toBe(employee1.id);
      expect(response.body.issued[0].code).toBe('CP-20240115-1111');
    });

    it('should only return own dashboard data', async () => {
      const employee1 = await createTestUser(
        'employee1dashboard@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee 1',
        5.0,
      );
      const employee2 = await createTestUser(
        'employee2dashboard@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Employee 2',
        10.0,
      );

      const token1 = await getAuthToken(
        app,
        'employee1dashboard@example.com',
        'password123',
      );

      // Create approved orders for employee1
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee1.id,
          dateKey: '2024-01-15',
          submittedCount: 10,
          approvedCount: 8,
          status: 'APPROVED',
        },
      });

      // Create approved orders for employee2 (should not appear in employee1's dashboard)
      await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee2.id,
          dateKey: '2024-01-15',
          submittedCount: 20,
          approvedCount: 15,
          status: 'APPROVED',
        },
      });

      // Employee1 should only see their own dashboard data
      const response = await request(app.getHttpServer())
        .get('/api/me/dashboard?month=2024-01')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.approvedOrders).toBe(8); // Only employee1's approved orders
      expect(response.body.approvedOrders).not.toBe(15);
    });
  });
});

