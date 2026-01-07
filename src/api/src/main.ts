import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Serve static files for uploads (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const express = require('express');
    app.use('/uploads', express.static('uploads'));
  }

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Internal Operations & Team Management Portal API')
    .setDescription('API documentation for the Internal Operations & Team Management Portal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('docs', app as any, document);

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`🚀 API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/docs`);
}
bootstrap();

