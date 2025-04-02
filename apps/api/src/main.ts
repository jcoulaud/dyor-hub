import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { json } from 'express';
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

  // Load origins from env vars
  const allowedOriginsStr = configService.get('ALLOWED_ORIGINS') || '';
  const additionalOriginsStr =
    configService.get('ADDITIONAL_ALLOWED_ORIGINS') || '';

  // Merge origin lists
  let originsArray = [];
  if (allowedOriginsStr) {
    originsArray = originsArray.concat(allowedOriginsStr.split(','));
  }
  if (additionalOriginsStr) {
    originsArray = originsArray.concat(additionalOriginsStr.split(','));
  }

  // Add dev environment defaults
  if (isDevelopment) {
    originsArray.push(
      clientUrl,
      `http://localhost:${port}`,
      'http://localhost:3000',
    );
  }

  // Clean up origin list
  const finalOrigins = originsArray.filter((origin) => origin.trim() !== '');

  // Set up cookie parsing
  const sessionSecret = configService.get('SESSION_SECRET');
  if (!sessionSecret) {
    console.error(
      'SESSION_SECRET environment variable is required but not set',
    );
    process.exit(1);
  }
  app.use(cookieParser(sessionSecret));

  // Configure API routing
  const useApiSubdomain =
    !isDevelopment && configService.get('USE_API_SUBDOMAIN') === 'true';
  if (!useApiSubdomain) {
    app.setGlobalPrefix('api');
  }

  // Set up CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow null origins (mobile apps, curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Allow whitelisted origins
      if (finalOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Strict origin checking in production
      if (!isDevelopment && finalOrigins.length > 0) {
        callback(null, false);
        return;
      }

      // Permissive defaults for dev or empty origin list
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

  // Initialize session middleware
  const sessionOptions = await sessionService.getSessionConfig();
  app.use(session(sessionOptions));

  // Configure validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Add Solana RPC proxy endpoint
  const heliusApiKey = configService.get<string>('HELIUS_API_KEY');
  app.use('/api/solana-rpc', json(), async (req, res) => {
    try {
      const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;

      const response = await fetch(heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `RPC request failed: ${response.statusText}`,
        });
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error proxying RPC request:', error);
      res.status(500).json({ error: 'Failed to process RPC request' });
    }
  });

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
