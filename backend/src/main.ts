import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { utilities as nestWinstonUtilities } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonUtilities.format.nestLike('KareSwift', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
        // Add file transport for production (optional)
        // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
    }),
  });

  // Security Headers
  app.use(helmet());
  app.use(cookieParser());

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global Exception Filter
  const { BaseExceptionFilter } = require('@nestjs/core');
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

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
