import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import 'reflect-metadata';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get('PORT') ?? 4022;
  const clientUrl = configService.get('CLIENT_URL') || 'http://localhost:3022';
  const isDevelopment = configService.get('NODE_ENV') !== 'production';
  const allowedOrigins = isDevelopment
    ? [clientUrl, `http://localhost:${port}`, 'http://localhost:3022']
    : [clientUrl];

  // Configure cookie parser
  app.use(cookieParser(configService.get('JWT_SECRET')));

  app.setGlobalPrefix('api');

  // Configure CORS with proper cookie handling
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  // Configure session middleware with secure settings
  app.use(
    session({
      secret: configService.get('JWT_SECRET') || 'your-secret-key',
      resave: true,
      saveUninitialized: true,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: !isDevelopment,
        sameSite: isDevelopment ? 'lax' : 'strict',
        path: '/',
        httpOnly: true,
      },
    }),
  );

  // Add global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
