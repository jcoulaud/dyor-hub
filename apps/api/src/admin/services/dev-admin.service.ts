import { CommentType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CommentEntity, TokenCallEntity, TokenEntity } from '../../entities';
import { TokensService } from '../../tokens/tokens.service';

@Injectable()
export class DevAdminService {
  private readonly logger = new Logger(DevAdminService.name);

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepo: Repository<TokenCallEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    private readonly tokensService: TokensService,
  ) {}

  /*
  // --- DEPRECATED: Method to CREATE missing default comments ---
  async backfillDefaultTokenCallComments(): Promise<number> {
     // ... implementation ...
  }
  */

  /*
  // --- DEPRECATED: Method to LINK existing comments via FK ---
  async linkExistingExplanationComments(): Promise<{
    updatedCount: number;
    failedCount: number;
    skippedAlreadyLinked: number;
    skippedNotFound: number;
  }> {
    // ... implementation ...
  }
  */

  // --- Method to FIX timestamps of backfilled comments ---
  async fixBackfilledCommentTimestamps(): Promise<{
    updatedCount: number;
    failedCount: number;
  }> {
    const thresholdMinutes = 2; // Only fix comments created > 2 mins after the call
    this.logger.log(
      `Starting timestamp fix for explanation comments created > ${thresholdMinutes} minutes after their token call...`,
    );

    let updatedCount = 0;
    let failedCount = 0;

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      this.logger.log('Starting transaction for timestamp fix...');
      const commentRepoTx =
        transactionalEntityManager.getRepository(CommentEntity);

      // Find comments needing timestamp correction using QueryBuilder
      const commentsToFix = await commentRepoTx
        .createQueryBuilder('comment')
        .innerJoin(
          TokenCallEntity,
          'tokenCall',
          '"tokenCall"."id" = "comment"."token_call_id"',
        )
        .where('"comment"."type" = :type', {
          type: CommentType.TOKEN_CALL_EXPLANATION,
        })
        .andWhere(
          `"comment"."created_at" > "tokenCall"."created_at" + INTERVAL '${thresholdMinutes} minutes'`,
        )
        .select([
          '"comment"."id" as "commentId"',
          '"tokenCall"."created_at" as "callCreatedAt"',
        ])
        .getRawMany<{ commentId: string; callCreatedAt: Date }>();

      if (!commentsToFix.length) {
        this.logger.log('No comments found needing timestamp correction.');
        return;
      }

      this.logger.log(
        `Found ${commentsToFix.length} comments to potentially fix.`,
      );

      for (const item of commentsToFix) {
        try {
          const result = await commentRepoTx.update(
            item.commentId,
            { createdAt: item.callCreatedAt }, // Set comment createdAt to call createdAt
          );
          if (result.affected && result.affected > 0) {
            updatedCount++;
            if (updatedCount % 100 === 0) {
              this.logger.log(
                `Fixed timestamp for ${updatedCount} comments...`,
              );
            }
          } else {
            this.logger.warn(
              `Timestamp fix update affected 0 rows for Comment ${item.commentId}.`,
            );
            failedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Transaction failed during timestamp fix for Comment ${item.commentId}:`,
            error,
          );
          failedCount++;
          throw error;
        }
      }
      this.logger.log('Timestamp fix transaction finished.');
    });

    this.logger.log('Timestamp fix process complete.');
    return { updatedCount, failedCount };
  }

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
