import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from '../admin.guard';
import { DevAdminService } from '../services/dev-admin.service';

@Controller('admin/dev')
@UseGuards(AuthGuard, AdminGuard)
export class DevAdminController {
  private readonly logger = new Logger(DevAdminController.name);

  constructor(
    @Inject(DevAdminService) private readonly devAdminService: DevAdminService,
  ) {}

  @Post('backfill-security')
  @HttpCode(HttpStatus.OK)
  async backfillSecurityInfo() {
    this.logger.log('Received request to backfill token security info.');
    try {
      const result = await this.devAdminService.backfillTokenSecurityInfo();
      this.logger.log('Token security info backfill finished successfully.');
      return {
        message: 'Token security info backfill process initiated.',
        result,
      };
    } catch (error) {
      this.logger.error(
        `Token security info backfill failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
