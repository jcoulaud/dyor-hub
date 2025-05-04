import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TokenEntity } from '../../entities';
import { TokensService } from '../../tokens/tokens.service';

@Injectable()
export class DevAdminService {
  private readonly logger = new Logger(DevAdminService.name);

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    private readonly tokensService: TokensService,
  ) {}

  async backfillTokenCreatorAddresses(): Promise<{
    processed: number;
    updated: number;
    failed: number;
  }> {
    this.logger.log('Starting backfill for token creator addresses...');
    const tokensToProcess = await this.tokenRepository.find({
      where: { creatorAddress: IsNull() },
      select: ['mintAddress'],
    });

    let updated = 0;
    let failed = 0;
    const totalToProcess = tokensToProcess.length;

    this.logger.log(`Found ${totalToProcess} tokens missing creator address.`);

    for (let i = 0; i < totalToProcess; i++) {
      const token = tokensToProcess[i];
      this.logger.debug(
        `Processing token ${i + 1}/${totalToProcess}: ${token.mintAddress}`,
      );
      try {
        const creatorAddress = await this.tokensService.fetchTokenCreator(
          token.mintAddress,
        );

        if (creatorAddress) {
          await this.tokenRepository.update(
            { mintAddress: token.mintAddress },
            { creatorAddress: creatorAddress },
          );
          updated++;
          this.logger.log(
            `Updated token ${token.mintAddress} with creator ${creatorAddress}`,
          );
        } else {
          this.logger.log(
            `No creator address found for ${token.mintAddress}, skipping update.`,
          );
        }
        // Add a small delay to avoid hitting rate limits aggressively
        await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to fetch/update creator for ${token.mintAddress}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Backfill complete. Processed: ${totalToProcess}, Updated: ${updated}, Failed: ${failed}`,
    );
    return { processed: totalToProcess, updated, failed };
  }
}
