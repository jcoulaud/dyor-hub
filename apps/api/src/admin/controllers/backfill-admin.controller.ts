import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { BackfillService } from '../../backfill/backfill.service';
import { AdminGuard } from '../admin.guard';

@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/backfill')
export class BackfillAdminController {
  private readonly logger = new Logger(BackfillAdminController.name);

  constructor(private readonly backfillService: BackfillService) {}

  @Post('price-history')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerPriceHistoryBackfill(): Promise<{ message: string }> {
    this.logger.log('Received request to trigger price history backfill.');
    this.backfillService.backfillPriceHistory().catch((err) => {
      this.logger.error('Price history backfill failed unexpectedly', err);
    });
    return {
      message:
        'Price history backfill process initiated. Check logs for details.',
    };
  }
}
