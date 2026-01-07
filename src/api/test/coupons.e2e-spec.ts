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

describe('Coupons (e2e)', () => {
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

  describe('Coupon code uniqueness', () => {
    it('should generate unique coupon codes', async () => {
      const employee = await createTestUser(
        'employee@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );
      const token = await getAuthToken(app, 'employee@example.com', 'password123');

      const response1 = await request(app.getHttpServer())
        .post('/api/me/coupons/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Customer 1',
          server: 'Server-01',
          category: 'Category 1',
          reason: 'Reason 1',
          zelleName: 'Zelle 1',
          amount: 25.0,
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/me/coupons/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Customer 2',
          server: 'Server-02',
          category: 'Category 2',
          reason: 'Reason 2',
          zelleName: 'Zelle 2',
          amount: 50.0,
        })
        .expect(201);

      expect(response1.body.code).not.toBe(response2.body.code);
    });

    it('should enforce unique coupon code constraint', async () => {
      const employee = await createTestUser(
        'employee2@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );

      // Create coupon directly in DB
      await prisma.coupon.create({
        data: {
          code: 'CP-20240115-9999',
          issuedByUserId: employee.id,
          issuedAt: new Date(),
          customerName: 'Customer',
          server: 'Server',
          category: 'Category',
          reason: 'Reason',
          zelleName: 'Zelle',
          amount: 25.0,
          status: 'ISSUED',
        },
      });

      // Try to create duplicate (should fail at DB level)
      await expect(
        prisma.coupon.create({
          data: {
            code: 'CP-20240115-9999',
            issuedByUserId: employee.id,
            issuedAt: new Date(),
            customerName: 'Customer 2',
            server: 'Server 2',
            category: 'Category 2',
            reason: 'Reason 2',
            zelleName: 'Zelle 2',
            amount: 50.0,
            status: 'ISSUED',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Honor used coupon', () => {
    it('should honor coupon successfully', async () => {
      const issuer = await createTestUser(
        'issuer@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Issuer Name',
      );
      const honorer = await createTestUser(
        'honorer@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Honorer Name',
      );

      const honorerToken = await getAuthToken(
        app,
        'honorer@example.com',
        'password123',
      );

      // Create coupon
      const coupon = await prisma.coupon.create({
        data: {
          code: 'CP-20240115-1111',
          issuedByUserId: issuer.id,
          issuedAt: new Date(),
          customerName: 'Customer',
          server: 'Server',
          category: 'Category',
          reason: 'Reason',
          zelleName: 'Zelle',
          amount: 25.0,
          status: 'ISSUED',
        },
      });

      // Honor coupon
      const response = await request(app.getHttpServer())
        .post('/api/me/coupons/honor')
        .set('Authorization', `Bearer ${honorerToken}`)
        .send({
          code: 'CP-20240115-1111',
        })
        .expect(200);

      expect(response.body.status).toBe('USED');
      expect(response.body.usedByUserId).toBe(honorer.id);
      expect(response.body.usedAt).toBeTruthy();
    });

    it('should return correct message when honoring already used coupon', async () => {
      const issuer = await createTestUser(
        'issuer2@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Issuer Name',
      );
      const firstHonorer = await createTestUser(
        'firsthonorer@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'First Honorer',
      );
      const secondHonorer = await createTestUser(
        'secondhonorer@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Second Honorer',
      );

      const secondHonorerToken = await getAuthToken(
        app,
        'secondhonorer@example.com',
        'password123',
      );

      // Create and honor coupon
      const coupon = await prisma.coupon.create({
        data: {
          code: 'CP-20240115-2222',
          issuedByUserId: issuer.id,
          issuedAt: new Date(),
          customerName: 'Customer',
          server: 'Server',
          category: 'Category',
          reason: 'Reason',
          zelleName: 'Zelle',
          amount: 25.0,
          status: 'ISSUED',
        },
      });

      // First honor
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          status: 'USED',
          usedByUserId: firstHonorer.id,
          usedAt: new Date('2024-01-15T10:00:00Z'),
        },
      });

      // Try to honor again
      const response = await request(app.getHttpServer())
        .post('/api/me/coupons/honor')
        .set('Authorization', `Bearer ${secondHonorerToken}`)
        .send({
          code: 'CP-20240115-2222',
        })
        .expect(409);

      expect(response.body.message).toContain('already honoured');
      expect(response.body.message).toContain('First Honorer');
      expect(response.body.message).toContain('1/15/2024'); // Date format may vary
    });

    it('should include honouredBy name and date in error message', async () => {
      const issuer = await createTestUser(
        'issuer3@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'Issuer',
      );
      const honorer = await createTestUser(
        'honorer2@example.com',
        'password123',
        UserRole.EMPLOYEE,
        'John Doe',
      );
      const anotherUser = await createTestUser(
        'another@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );

      const anotherToken = await getAuthToken(
        app,
        'another@example.com',
        'password123',
      );

      // Create and honor coupon
      const usedDate = new Date('2024-01-20T14:30:00Z');
      const coupon = await prisma.coupon.create({
        data: {
          code: 'CP-20240115-3333',
          issuedByUserId: issuer.id,
          issuedAt: new Date(),
          customerName: 'Customer',
          server: 'Server',
          category: 'Category',
          reason: 'Reason',
          zelleName: 'Zelle',
          amount: 25.0,
          status: 'USED',
          usedByUserId: honorer.id,
          usedAt: usedDate,
        },
      });

      // Try to honor again
      const response = await request(app.getHttpServer())
        .post('/api/me/coupons/honor')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({
          code: 'CP-20240115-3333',
        })
        .expect(409);

      const message = response.body.message.toLowerCase();
      expect(message).toContain('john doe');
      expect(message).toContain('2024'); // Year should be in the date
    });
  });
});

