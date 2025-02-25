import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import RedisStore from 'connect-redis';
import * as session from 'express-session';
import Redis from 'ioredis';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private readonly ttl = 24 * 60 * 60; // 24 hours in seconds
  private redisStore: RedisStore;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.ensureInitialized();
  }

  private async initialize() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
    });

    this.redisClient.on('error', (err) => {
      if (err.message !== 'Connection is closed.') {
        console.error('Redis client error:', err);
      }
    });

    // Initialize Redis store after client is created
    this.redisStore = new RedisStore({
      client: this.redisClient,
      prefix: 'sess:',
    });

    this.initialized = true;
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.initialize();
    }

    return this.initializationPromise;
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    await this.ensureInitialized();
    await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    const data = await this.redisClient.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as T;
    } catch (error) {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureInitialized();
    await this.redisClient.del(key);
  }

  async getSessionConfig(): Promise<session.SessionOptions> {
    await this.ensureInitialized();

    if (!this.redisStore) {
      throw new Error('Redis store is not initialized');
    }

    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    const sessionSecret = this.configService.get<string>('SESSION_SECRET');

    if (!sessionSecret) {
      throw new Error(
        'SESSION_SECRET environment variable is required but not set',
      );
    }

    let cookieDomain = this.configService.get('COOKIE_DOMAIN');

    if (!isDevelopment && cookieDomain && !cookieDomain.startsWith('.')) {
      cookieDomain = `.${cookieDomain}`;
    }

    const cookieConfig: session.CookieOptions = {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: isDevelopment ? 'lax' : 'none',
      maxAge: this.ttl * 1000, // Convert seconds to milliseconds
      path: '/',
      domain: isDevelopment ? undefined : cookieDomain,
    };

    return {
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'dyor.sid',
      cookie: cookieConfig,
      store: this.redisStore,
      rolling: true,
    };
  }
}
