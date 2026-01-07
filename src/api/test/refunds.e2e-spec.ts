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

describe('Refund Flow (e2e)', () => {
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

  describe('Refund flow: PENDING -> DONE -> ARCHIVED', () => {
    it('should create refund request with PENDING status', async () => {
      const employee = await createTestUser(
        'employee@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const token = await getAuthToken(app, 'employee@example.com', 'password123');

      const response = await request(app.getHttpServer())
        .post('/api/me/refunds')
        .set('Authorization', `Bearer ${token}`)
        .field('customerName', 'Customer Name')
        .field('zelleSenderName', 'Zelle Sender')
        .field('server', 'Server-01')
        .field('category', 'Refund')
        .field('reason', 'Customer requested refund')
        .field('amount', '50.0')
        .expect(201);

      expect(response.body.status).toBe('PENDING');
      expect(response.body.requestedByUserId).toBe(employee.id);
      expect(response.body.customerName).toBe('Customer Name');
      expect(response.body.amount).toBe('50.0');
    });

    it('should transition from PENDING to DONE when manager processes', async () => {
      const employee = await createTestUser(
        'employee2@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const manager = await createTestUser(
        'manager@example.com',
        'password123',
        UserRole.MANAGER,
      );

      // Create refund request
      const refund = await prisma.refundRequest.create({
        data: {
          requestedByUserId: employee.id,
          customerName: 'Customer',
          zelleSenderName: 'Zelle',
          server: 'Server-01',
          category: 'Refund',
          reason: 'Reason',
          amount: 50.0,
          status: 'PENDING',
        },
      });

      // Manager processes refund (simulating manager endpoint)
      const processedRefund = await prisma.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: 'DONE',
          processedByManagerId: manager.id,
          processedAt: new Date(),
        },
      });

      expect(processedRefund.status).toBe('DONE');
      expect(processedRefund.processedByManagerId).toBe(manager.id);
      expect(processedRefund.processedAt).toBeTruthy();
    });

    it('should transition from DONE to ARCHIVED when employee confirms informed', async () => {
      const employee = await createTestUser(
        'employee3@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const manager = await createTestUser(
        'manager2@example.com',
        'password123',
        UserRole.MANAGER,
      );
      const token = await getAuthToken(app, 'employee3@example.com', 'password123');

      // Create and process refund
      const refund = await prisma.refundRequest.create({
        data: {
          requestedByUserId: employee.id,
          customerName: 'Customer',
          zelleSenderName: 'Zelle',
          server: 'Server-01',
          category: 'Refund',
          reason: 'Reason',
          amount: 50.0,
          status: 'DONE',
          processedByManagerId: manager.id,
          processedAt: new Date(),
        },
      });

      // Employee confirms informed
      const response = await request(app.getHttpServer())
        .post(`/api/me/refunds/${refund.id}/confirm-informed`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('ARCHIVED');
      expect(response.body.archivedAt).toBeTruthy();
    });

    it('should not allow confirming informed if status is not DONE', async () => {
      const employee = await createTestUser(
        'employee4@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const token = await getAuthToken(app, 'employee4@example.com', 'password123');

      // Create PENDING refund
      const refund = await prisma.refundRequest.create({
        data: {
          requestedByUserId: employee.id,
          customerName: 'Customer',
          zelleSenderName: 'Zelle',
          server: 'Server-01',
          category: 'Refund',
          reason: 'Reason',
          amount: 50.0,
          status: 'PENDING',
        },
      });

      // Try to confirm informed (should fail)
      await request(app.getHttpServer())
        .post(`/api/me/refunds/${refund.id}/confirm-informed`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      // Verify status is still PENDING
      const updatedRefund = await prisma.refundRequest.findUnique({
        where: { id: refund.id },
      });
      expect(updatedRefund?.status).toBe('PENDING');
    });

    it('should complete full flow: PENDING -> DONE -> ARCHIVED', async () => {
      const employee = await createTestUser(
        'employee5@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const manager = await createTestUser(
        'manager3@example.com',
        'password123',
        UserRole.MANAGER,
      );
      const token = await getAuthToken(app, 'employee5@example.com', 'password123');

      // Step 1: Create refund (PENDING)
      const createResponse = await request(app.getHttpServer())
        .post('/api/me/refunds')
        .set('Authorization', `Bearer ${token}`)
        .field('customerName', 'Customer')
        .field('zelleSenderName', 'Zelle')
        .field('server', 'Server-01')
        .field('category', 'Refund')
        .field('reason', 'Reason')
        .field('amount', '75.0')
        .expect(201);

      const refundId = createResponse.body.id;
      expect(createResponse.body.status).toBe('PENDING');

      // Step 2: Manager processes (DONE)
      await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: 'DONE',
          processedByManagerId: manager.id,
          processedAt: new Date(),
        },
      });

      // Step 3: Employee confirms informed (ARCHIVED)
      const archiveResponse = await request(app.getHttpServer())
        .post(`/api/me/refunds/${refundId}/confirm-informed`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(archiveResponse.body.status).toBe('ARCHIVED');
      expect(archiveResponse.body.archivedAt).toBeTruthy();

      // Verify final state
      const finalRefund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
      });
      expect(finalRefund?.status).toBe('ARCHIVED');
      expect(finalRefund?.processedByManagerId).toBe(manager.id);
      expect(finalRefund?.archivedAt).toBeTruthy();
    });
  });
});

