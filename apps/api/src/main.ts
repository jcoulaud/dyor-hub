import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { initializeDatabase } from './datasource';
import { SessionService } from './session/session.service';

async function bootstrap() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const sessionService = app.get(SessionService);

  const port = configService.get('PORT') ?? 3001;
  const clientUrl = configService.get('CLIENT_URL') || 'http://localhost:3000';
  const isDevelopment = configService.get('NODE_ENV') !== 'production';

  // Parse allowed origins from environment variables
  const allowedOriginsStr = configService.get('ALLOWED_ORIGINS') || '';
  const additionalOriginsStr =
    configService.get('ADDITIONAL_ALLOWED_ORIGINS') || '';

  // Combine all origins
  let originsArray = [];
  if (allowedOriginsStr) {
    originsArray = originsArray.concat(allowedOriginsStr.split(','));
  }
  if (additionalOriginsStr) {
    originsArray = originsArray.concat(additionalOriginsStr.split(','));
  }

  // Add development origins if in development mode
  if (isDevelopment) {
    originsArray.push(
      clientUrl,
      `http://localhost:${port}`,
      'http://localhost:3000',
    );
  }

  // Remove any empty strings
  const finalOrigins = originsArray.filter((origin) => origin.trim() !== '');

  // Configure cookie parser with session secret
  const sessionSecret = configService.get('SESSION_SECRET');
  if (!sessionSecret) {
    console.error(
      'SESSION_SECRET environment variable is required but not set',
    );
    process.exit(1); // Exit with error code
  }
  app.use(cookieParser(sessionSecret));

  // Set global prefix for all routes
  const useApiSubdomain =
    !isDevelopment && configService.get('USE_API_SUBDOMAIN') === 'true';
  if (!useApiSubdomain) {
    app.setGlobalPrefix('api');
  }

  // Configure CORS with proper cookie handling
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if the origin is in our allowed list
      if (finalOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // For production, if we have specific origins and this one isn't allowed
      if (!isDevelopment && finalOrigins.length > 0) {
        callback(null, false);
        return;
      }

      // Default to allowing the origin in development or if no origins specified
      callback(null, true);
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

  // Get session configuration from our service
  const sessionOptions = await sessionService.getSessionConfig();

  // Apply session middleware
  app.use(session(sessionOptions));

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
