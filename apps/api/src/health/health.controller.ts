import { Controller, Get, HttpCode } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
  ) {}

  @Get()
  @HttpCode(200)
  async check() {
    try {
      const apiHealth = await this.healthService.pingCheck('api');
      const dbHealth = await this.healthService.dbCheck('database');

      return {
        status: 'ok',
        info: {
          api: apiHealth.api,
          database: dbHealth.database,
        },
        details: {
          api: apiHealth.api,
          database: dbHealth.database,
        },
      };
    } catch (error) {
      return {
        status: 'ok',
        error: {
          message: 'Service operational but some checks failed',
        },
        details: {
          api: { status: 'up', timestamp: new Date().toISOString() },
        },
      };
    }
  }

  @Get('db')
  @HealthCheck()
  checkDb() {
    return this.health.check([() => this.healthService.dbCheck('database')]);
  }

  @Get('memory')
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () => this.healthService.memoryHealthCheck('memory'),
    ]);
  }
}
