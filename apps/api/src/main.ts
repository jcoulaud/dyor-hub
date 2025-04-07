import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import session from 'express-session';
import * as fs from 'fs'; // Import Node's file system module
import * as path from 'path'; // Import path module
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

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Define HTTPS options only for development
  let httpsOptions;
  if (isDevelopment) {
    const secretsPath = path.join(__dirname, '..', '..', '..', 'secrets');
    try {
      httpsOptions = {
        key: fs.readFileSync(path.join(secretsPath, 'localhost+2-key.pem')),
        cert: fs.readFileSync(path.join(secretsPath, 'localhost+2.pem')),
      };
    } catch (error) {
      console.warn(
        'SSL certificates not found, falling back to HTTP in development',
      );
    }
  }

  const app = await NestFactory.create(AppModule, {
    ...(httpsOptions && { httpsOptions }),
    logger: isDevelopment
      ? ['log', 'debug', 'error', 'verbose', 'warn']
      : ['error', 'warn'],
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  const sessionService = app.get(SessionService);

  const port = configService.get('PORT') ?? 3001;
  const clientUrl = configService.get('CLIENT_URL') || 'https://localhost:3000';

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
      `https://localhost:${port}`,
      'https://localhost:3000',
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

  app.use(json({ limit: '5mb' }));

  // Configure API routing
  const useApiSubdomain =
    !isDevelopment && configService.get('USE_API_SUBDOMAIN') === 'true';
  if (!useApiSubdomain) {
    app.setGlobalPrefix('api');
  }

  // Set up CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'https://localhost:3000', // Use HTTPS for local frontend
    credentials: true,
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
  console.log(`Application is running securely on: ${await app.getUrl()}`); // Will show https://localhost:3001
}

bootstrap();
