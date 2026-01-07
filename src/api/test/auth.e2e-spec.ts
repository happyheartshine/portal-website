import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestUser, cleanDatabase, getAuthToken } from './helpers/test-helpers';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
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

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = await createTestUser(
        'test@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user).toMatchObject({
        id: user.id,
        email: 'test@example.com',
        name: user.name,
        role: 'EMPLOYEE',
      });
    });

    it('should fail login with invalid password', async () => {
      await createTestUser('test2@example.com', 'password123', UserRole.EMPLOYEE);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test2@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('should fail login with inactive user', async () => {
      const user = await createTestUser(
        'inactive@example.com',
        'password123',
        UserRole.EMPLOYEE,
      );

      // Deactivate user
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/reset/request', () => {
    it('should request password reset OTP successfully', async () => {
      await createTestUser('reset@example.com', 'password123', UserRole.EMPLOYEE);

      const response = await request(app.getHttpServer())
        .post('/api/auth/reset/request')
        .send({
          email: 'reset@example.com',
        })
        .expect(200);

      expect(response.body.message).toContain('password reset OTP has been sent');

      // Verify OTP was stored
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });
      expect(user?.passwordResetOtp).toBeTruthy();
      expect(user?.passwordResetExpiry).toBeTruthy();
      expect(user?.passwordResetExpiry!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return same message for non-existent email (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/reset/request')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body.message).toContain('password reset OTP has been sent');
    });
  });

  describe('POST /api/auth/reset/confirm', () => {
    it('should reset password successfully with valid OTP', async () => {
      const user = await createTestUser(
        'confirm@example.com',
        'oldpassword',
        UserRole.EMPLOYEE,
      );

      // Generate OTP
      const otp = '123456';
      const otpHash = await bcrypt.hash(otp, 10);
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetOtp: otpHash,
          passwordResetExpiry: expiry,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/reset/confirm')
        .send({
          email: 'confirm@example.com',
          otp: '123456',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.message).toContain('Password has been reset successfully');

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      const isPasswordValid = await bcrypt.compare(
        'newpassword123',
        updatedUser!.passwordHash,
      );
      expect(isPasswordValid).toBe(true);

      // Verify OTP fields were cleared
      expect(updatedUser?.passwordResetOtp).toBeNull();
      expect(updatedUser?.passwordResetExpiry).toBeNull();
    });

    it('should fail with invalid OTP', async () => {
      const user = await createTestUser(
        'invalidotp@example.com',
        'oldpassword',
        UserRole.EMPLOYEE,
      );

      const otp = '123456';
      const otpHash = await bcrypt.hash(otp, 10);
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetOtp: otpHash,
          passwordResetExpiry: expiry,
        },
      });

      await request(app.getHttpServer())
        .post('/api/auth/reset/confirm')
        .send({
          email: 'invalidotp@example.com',
          otp: '999999',
          newPassword: 'newpassword123',
        })
        .expect(400);
    });

    it('should fail with expired OTP', async () => {
      const user = await createTestUser(
        'expired@example.com',
        'oldpassword',
        UserRole.EMPLOYEE,
      );

      const otp = '123456';
      const otpHash = await bcrypt.hash(otp, 10);
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() - 1); // Expired

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetOtp: otpHash,
          passwordResetExpiry: expiry,
        },
      });

      await request(app.getHttpServer())
        .post('/api/auth/reset/confirm')
        .send({
          email: 'expired@example.com',
          otp: '123456',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect((await request(app.getHttpServer())
        .post('/api/auth/reset/confirm')
        .send({
          email: 'expired@example.com',
          otp: '123456',
          newPassword: 'newpassword123',
        })).body.message).toContain('expired');
    });

    it('should fail when no reset request exists', async () => {
      await createTestUser('norequest@example.com', 'password123', UserRole.EMPLOYEE);

      await request(app.getHttpServer())
        .post('/api/auth/reset/confirm')
        .send({
          email: 'norequest@example.com',
          otp: '123456',
          newPassword: 'newpassword123',
        })
        .expect(400);
    });
  });
});

