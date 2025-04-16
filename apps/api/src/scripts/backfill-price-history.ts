#!/usr/bin/env node
import { TokenCallStatus } from '@dyor-hub/types';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { getRepository } from 'typeorm';
import { AppModule } from '../app.module';
import { TokenCallEntity } from '../entities/token-call.entity';
import { TokensService } from '../tokens/tokens.service';
import { uploadJsonToS3 } from '../utils/s3';

const logger = new Logger('BackfillPriceHistory');

async function backfillPriceHistory() {
  // Set up
  const app = await NestFactory.createApplicationContext(AppModule);
  const tokenCallRepository = getRepository(TokenCallEntity);
  const tokensService = app.get(TokensService);

  logger.log('Starting backfill of price history URLs...');

  try {
    // Find all verified token calls without price history URLs
    const callsToBackfill = await tokenCallRepository.find({
      where: [
        { status: TokenCallStatus.VERIFIED_SUCCESS, priceHistoryUrl: null },
        { status: TokenCallStatus.VERIFIED_FAIL, priceHistoryUrl: null },
      ],
    });

    logger.log(`Found ${callsToBackfill.length} token calls to backfill`);

    for (const [index, call] of callsToBackfill.entries()) {
      try {
        logger.log(
          `Processing call ${index + 1}/${callsToBackfill.length}: ${call.id}`,
        );

        // Determine adaptive resolution based on call duration
        const durationMs =
          call.targetDate.getTime() - call.callTimestamp.getTime();
        let resolution: '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '1D';

        // Define thresholds
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

        // Fetch price history
        const priceHistory = await tokensService.getTokenPriceHistory(
          call.tokenId,
          call.callTimestamp,
          call.targetDate,
          resolution,
        );

        if (!priceHistory || priceHistory.items.length === 0) {
          logger.warn(`No price history found for call ${call.id}`);
          continue;
        }

        // Upload to S3 and update the URL
        const s3Key = `token-history/${call.id}.json`;
        const url = await uploadJsonToS3(s3Key, priceHistory);

        // Update the entity
        call.priceHistoryUrl = url;
        await tokenCallRepository.save(call);

        logger.log(
          `Successfully updated price history URL for call ${call.id}`,
        );

        // Add delay to avoid hitting Birdeye rate limits
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        logger.error(
          `Failed to process call ${call.id}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    logger.log('Backfill complete!');
  } catch (error) {
    logger.error('Error during backfill:', error);
  } finally {
    await app.close();
  }
}

// Run the backfill function
backfillPriceHistory()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Critical error in backfill script:', error);
    process.exit(1);
  });
