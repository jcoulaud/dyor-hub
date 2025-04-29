import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import session from 'express-session';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { initializeDatabase } from './datasource';
import { SessionService } from './session/session.service';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // --- Database Initialization ---
  try {
    await initializeDatabase();
    logger.log('Database initialized successfully.');
  } catch (error) {
    logger.error('FATAL: Failed to initialize database:', error);
    process.exit(1);
  }

  // --- Environment Setup ---
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // --- HTTPS Configuration (Development Only) ---
  let httpsOptions = null;
  if (isDevelopment) {
    const secretsPath = path.join(__dirname, '..', '..', '..', 'secrets');
    const keyPath = path.join(secretsPath, 'localhost+2-key.pem');
    const certPath = path.join(secretsPath, 'localhost+2.pem');
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      logger.log(
        `HTTPS enabled for local development using certificates from: ${secretsPath}`,
      );
    } else {
      logger.error(
        `FATAL: Local HTTPS certificate files not found in '${secretsPath}'.` +
          ` Please follow the 'Local HTTPS Setup' instructions in README.md.`,
      );
      process.exit(1);
    }
  }

  // --- Create NestJS App Instance ---
  const app = await NestFactory.create(AppModule, {
    ...(httpsOptions && { httpsOptions }),
    logger: isDevelopment
      ? ['log', 'debug', 'error', 'verbose', 'warn']
      : ['log', 'error', 'warn'], // Use NestJS logger levels
  });

  // Use WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Get services/config needed during bootstrap
  const configService = app.get(ConfigService);
  const sessionService = app.get(SessionService);
  const port = configService.get<number>('PORT', 3001);

  // --- CORS Configuration ---
  // Use ConfigService to get origins, provide defaults if necessary
  const allowedOrigins = (
    configService.get<string>('ALLOWED_ORIGINS') ||
    'https://dyorhub.xyz,https://www.dyorhub.xyz'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const additionalOrigins = (
    configService.get<string>('ADDITIONAL_ALLOWED_ORIGINS') || ''
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  let finalOrigins = [...allowedOrigins, ...additionalOrigins];
  if (isDevelopment) {
    finalOrigins.push('https://localhost:3000');
  }
  finalOrigins = [...new Set(finalOrigins)];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || finalOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log blocked origins only if not in dev permissive mode
        if (!isDevelopment) {
          logger.warn(`CORS blocked production request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        } else {
          // Allow other origins in dev without logging every success
          callback(null, true);
        }
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
      'solana-client',
    ],
    exposedHeaders: ['Set-Cookie'],
  });
  // --- End CORS ---

  // --- Core Middleware ---
  app.use(cookieParser());
  app.use(json({ limit: '5mb' }));
  // --- End Core Middleware ---

  // Configure API prefix
  const useApiSubdomain =
    !isDevelopment && configService.get('USE_API_SUBDOMAIN') === 'true';
  if (!useApiSubdomain) {
    app.setGlobalPrefix('api');
  }

  // Initialize session middleware
  const sessionOptions = await sessionService.getSessionConfig();
  app.use(session(sessionOptions));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // --- Solana RPC Proxy ---
  const heliusApiKey = configService.get<string>('HELIUS_API_KEY');
  if (heliusApiKey) {
    app.use('/api/solana-rpc', json(), async (req, res) => {
      try {
        const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
        const response = await fetch(heliusUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        logger.error('Error proxying RPC request:', error);
        res.status(500).json({ error: 'Failed to process RPC request' });
      }
    });
  } else {
    logger.warn('HELIUS_API_KEY not found, Solana RPC proxy disabled.');
  }
  // --- End Solana RPC Proxy ---

  // --- Start Server ---
  await app.listen(port);
  const serverUrl = await app.getUrl();
  logger.log(`🚀 Application is running on: ${serverUrl}`);
  // --- End Start Server ---
}

bootstrap().catch((err) => {
  logger.error('FATAL: Failed to bootstrap application:', err);
  process.exit(1);
});
