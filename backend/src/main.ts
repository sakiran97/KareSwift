import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Set global prefix for all routes so they match the /api/* proxy from the frontend
  app.setGlobalPrefix('api');

  // Increase body size limits for accepting base64 diagnostic photos
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Ensure uploads directory exists
  const uploadDir = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // Serve static files from the uploads directory
  app.use('/uploads', express.static(uploadDir));

  // Restrict CORS to authorized frontend domains
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:4200', 
      'https://kareswift-mobile.onrender.com', 
      'https://kareswift-admin.onrender.com'
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
