import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
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

  @Post('add-credits-to-all')
  @HttpCode(HttpStatus.OK)
  async addCreditsToAllUsers(
    @Body() body: { credits: number },
  ): Promise<{ affected: number; transactionsCreated: number }> {
    this.logger.log(
      `Received request to add ${body.credits} credits to all users.`,
    );
    if (typeof body.credits !== 'number' || body.credits <= 0) {
      throw new InternalServerErrorException(
        'Invalid credits amount provided.',
      );
    }
    try {
      const result = await this.devAdminService.addCreditsToAllUsers(
        body.credits,
      );
      this.logger.log(
        `Successfully added ${body.credits} credits to ${result.affected} users. Transactions created: ${result.transactionsCreated}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to add credits to all users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

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
