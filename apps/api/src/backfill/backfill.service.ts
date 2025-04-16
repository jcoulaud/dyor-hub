import { TokenCallStatus } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokensService } from '../tokens/tokens.service';
import { uploadJsonToS3 } from '../utils/s3';

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name);

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepository: Repository<TokenCallEntity>,
    private readonly tokensService: TokensService,
  ) {}

  async backfillPriceHistory(): Promise<{ processed: number; failed: number }> {
    this.logger.log('Starting backfill of price history URLs via endpoint...');
    let processedCount = 0;
    let failedCount = 0;

    try {
      const callsToBackfill = await this.tokenCallRepository.find({
        where: [
          { status: TokenCallStatus.VERIFIED_SUCCESS, priceHistoryUrl: null },
          { status: TokenCallStatus.VERIFIED_FAIL, priceHistoryUrl: null },
        ],
        order: {
          callTimestamp: 'ASC', // Process older calls first
        },
      });

      this.logger.log(
        `Found ${callsToBackfill.length} token calls to backfill`,
      );

      for (const [index, call] of callsToBackfill.entries()) {
        try {
          this.logger.log(
            `Processing call ${index + 1}/${callsToBackfill.length}: ${call.id}`,
          );

          const durationMs =
            call.targetDate.getTime() - call.callTimestamp.getTime();
          let resolution: '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '1D';

          const ONE_HOUR_MS = 60 * 60 * 1000;
          const SIX_HOURS_MS = 6 * ONE_HOUR_MS;
          const ONE_DAY_MS = 24 * ONE_HOUR_MS;
          const THREE_DAYS_MS = 3 * ONE_DAY_MS;
          const ONE_WEEK_MS = 7 * ONE_DAY_MS;
          const ONE_MONTH_MS = 30 * ONE_DAY_MS;

          if (durationMs <= ONE_HOUR_MS) {
            resolution = '1m';
          } else if (durationMs <= SIX_HOURS_MS) {
            resolution = '5m';
          } else if (durationMs <= ONE_DAY_MS) {
            resolution = '15m';
          } else if (durationMs <= THREE_DAYS_MS) {
            resolution = '30m';
          } else if (durationMs <= ONE_WEEK_MS) {
            resolution = '1H';
          } else if (durationMs <= ONE_MONTH_MS) {
            resolution = '2H';
          } else {
            resolution = '1D';
          }

          const priceHistory = await this.tokensService.getTokenPriceHistory(
            call.tokenId,
            call.callTimestamp,
            call.targetDate,
            resolution,
          );

          if (!priceHistory || priceHistory.items.length === 0) {
            this.logger.warn(`No price history found for call ${call.id}`);
            // Optionally mark as failed or skip
            failedCount++;
            continue;
          }

          const s3Key = `token-history/${call.id}.json`;
          const url = await uploadJsonToS3(s3Key, priceHistory);

          call.priceHistoryUrl = url;
          await this.tokenCallRepository.save(call);

          processedCount++;
          this.logger.log(
            `Successfully updated price history URL for call ${call.id}`,
          );

          // Delay to avoid hitting Birdeye rate limits
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (error) {
          failedCount++;
          this.logger.error(
            `Failed to process call ${call.id}:`,
            error instanceof Error ? error.message : String(error),
          );
          // Continue to the next call even if one fails
        }
      }

      this.logger.log(
        `Backfill complete! Processed: ${processedCount}, Failed: ${failedCount}`,
      );
    } catch (error) {
      this.logger.error('Error during backfill process:', error);
      // Throw error so the controller knows the overall process failed
      throw error;
    }

    return { processed: processedCount, failed: failedCount };
  }
}
