import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestUser,
  cleanDatabase,
  getAuthToken,
  createTeamAssignment,
} from './helpers/test-helpers';
import { UserRole } from '@prisma/client';

describe('Orders (e2e)', () => {
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

  describe('Order uniqueness per day', () => {
    it('should create order for a date', async () => {
      const employee = await createTestUser(
        'employee@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const token = await getAuthToken(app, 'employee@example.com', 'password123');

      const response = await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dateKey: '2024-01-15',
          submittedCount: 10,
        })
        .expect(201);

      expect(response.body.dateKey).toBe('2024-01-15');
      expect(response.body.submittedCount).toBe(10);
      expect(response.body.status).toBe('PENDING');
    });

    it('should update existing order for same date', async () => {
      const employee = await createTestUser(
        'employee2@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const token = await getAuthToken(app, 'employee2@example.com', 'password123');

      // Create initial order
      await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dateKey: '2024-01-16',
          submittedCount: 10,
        })
        .expect(201);

      // Update same date
      const response = await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dateKey: '2024-01-16',
          submittedCount: 15,
        })
        .expect(201);

      expect(response.body.dateKey).toBe('2024-01-16');
      expect(response.body.submittedCount).toBe(15);

      // Verify only one order exists for this date
      const orders = await prisma.dailyOrderSubmission.findMany({
        where: {
          userId: employee.id,
          dateKey: '2024-01-16',
        },
      });
      expect(orders.length).toBe(1);
    });

    it('should allow different dates for same user', async () => {
      const employee = await createTestUser(
        'employee3@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const token = await getAuthToken(app, 'employee3@example.com', 'password123');

      await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dateKey: '2024-01-17',
          submittedCount: 10,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dateKey: '2024-01-18',
          submittedCount: 20,
        })
        .expect(201);

      const orders = await prisma.dailyOrderSubmission.findMany({
        where: { userId: employee.id },
      });
      expect(orders.length).toBe(2);
    });
  });

  describe('Cannot edit after approve', () => {
    it('should prevent editing approved order', async () => {
      const employee = await createTestUser(
        'employee4@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const manager = await createTestUser(
        'manager@example.com',
        'password123',
        UserRole.MANAGER,
      );
      const token = await getAuthToken(app, 'employee4@example.com', 'password123');

      // Create order
      const order = await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-19',
          submittedCount: 10,
          status: 'PENDING',
        },
      });

      // Approve order (simulating manager approval)
      await prisma.dailyOrderSubmission.update({
        where: { id: order.id },
        data: {
          status: 'APPROVED',
          approvedCount: 8,
          managerId: manager.id,
          approvedAt: new Date(),
        },
      });

      // Try to edit approved order
      await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dateKey: '2024-01-19',
          submittedCount: 15,
        })
        .expect(403);

      // Verify order was not changed
      const updatedOrder = await prisma.dailyOrderSubmission.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrder?.submittedCount).toBe(10);
      expect(updatedOrder?.status).toBe('APPROVED');
    });

    it('should allow editing pending order', async () => {
      const employee = await createTestUser(
        'employee5@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const token = await getAuthToken(app, 'employee5@example.com', 'password123');

      // Create pending order
      const order = await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-20',
          submittedCount: 10,
          status: 'PENDING',
        },
      });

      // Edit pending order
      const response = await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dateKey: '2024-01-20',
          submittedCount: 15,
        })
        .expect(201);

      expect(response.body.submittedCount).toBe(15);
      expect(response.body.status).toBe('PENDING');
    });
  });

  describe('Manager approve locks', () => {
    it('should lock order after manager approval', async () => {
      const employee = await createTestUser(
        'employee6@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const manager = await createTestUser(
        'manager2@example.com',
        'password123',
        UserRole.MANAGER,
      );

      // Create order
      const order = await prisma.dailyOrderSubmission.create({
        data: {
          userId: employee.id,
          dateKey: '2024-01-21',
          submittedCount: 10,
          status: 'PENDING',
        },
      });

      // Manager approves order
      const approvedOrder = await prisma.dailyOrderSubmission.update({
        where: { id: order.id },
        data: {
          status: 'APPROVED',
          approvedCount: 8,
          managerId: manager.id,
          approvedAt: new Date(),
        },
      });

      expect(approvedOrder.status).toBe('APPROVED');
      expect(approvedOrder.managerId).toBe(manager.id);
      expect(approvedOrder.approvedAt).toBeTruthy();

      // Verify order is locked (cannot be edited)
      const employeeToken = await getAuthToken(
        app,
        'employee6@example.com',
        'password123',
      );

      await request(app.getHttpServer())
        .post('/api/me/orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          dateKey: '2024-01-21',
          submittedCount: 20,
        })
        .expect(403);
    });
  });
});

