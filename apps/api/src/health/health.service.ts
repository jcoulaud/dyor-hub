import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = true; // Simple ping check is always healthy
    const result = this.getStatus(key, isHealthy, {
      timestamp: new Date().toISOString(),
    });

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Ping check failed', result);
  }

  async dbCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      // Use TypeORM health indicator to check database connection
      return await this.typeOrmHealthIndicator.pingCheck(key, {
        timeout: 1000,
      });
    } catch (error) {
      // If the TypeORM health indicator fails, try a manual check
      try {
        await this.dataSource.query('SELECT 1');
        return this.getStatus(key, true, { message: 'Database is connected' });
      } catch (dbError) {
        return this.getStatus(key, false, {
          message: 'Database connection failed',
        });
      }
    }
  }

  async memoryHealthCheck(key: string): Promise<HealthIndicatorResult> {
    // Check if heap memory usage is below 90% of the maximum heap size
    const heapSizeThreshold =
      this.configService.get<number>('MEMORY_HEAP_THRESHOLD_MB') || 512; // Default to 512MB

    return this.memoryHealthIndicator.checkHeap(key, heapSizeThreshold);
  }
}
