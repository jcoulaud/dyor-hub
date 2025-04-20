import { CommentType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { CommentEntity, TokenCallEntity } from '../../entities';

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
  ) {}

  async backfillDefaultTokenCallComments(): Promise<number> {
    this.logger.log('Starting backfill for default token call comments...');

    // 1. Find TokenCalls without an explanationComment ID
    const callsToUpdate = await this.tokenCallRepo.find({
      where: { explanationCommentId: IsNull() },
      relations: ['token', 'user'],
    });

    if (!callsToUpdate.length) {
      this.logger.log('No token calls found needing default comments.');
      return 0;
    }

    this.logger.log(`Found ${callsToUpdate.length} token calls to update.`);

    const commentsToCreate: Partial<CommentEntity>[] = [];

    for (const call of callsToUpdate) {
      if (!call.token || !call.token.symbol) {
        this.logger.warn(
          `Skipping call ${call.id} due to missing token or token symbol.`,
        );
        continue;
      }
      if (!call.user) {
        this.logger.warn(`Skipping call ${call.id} due to missing user.`);
        continue;
      }

      const defaultCommentText = `I just made a prediction on $${call.token.symbol}. What do you think?`;

      commentsToCreate.push({
        content: defaultCommentText,
        type: CommentType.TOKEN_CALL_EXPLANATION,
        tokenMintAddress: call.token.mintAddress,
        userId: call.userId,
        tokenCallId: call.id,
      });
    }

    if (commentsToCreate.length === 0) {
      this.logger.log('No valid comments could be generated.');
      return 0;
    }

    // 2. Bulk create comments
    try {
      const result = await this.commentRepo.insert(commentsToCreate);
      this.logger.log(
        `Successfully inserted ${result.generatedMaps.length} comments.`,
      );
      return result.generatedMaps.length;
    } catch (error) {
      this.logger.error('Error during bulk comment insertion:', error);
      throw error;
    }
  }

  async linkExistingExplanationComments(): Promise<{
    updatedCount: number;
    failedCount: number;
    skippedAlreadyLinked: number;
    skippedNotFound: number;
  }> {
    this.logger.log(
      'Starting linking for token_calls.explanation_comment_id...',
    );

    // Find all explanation comments that have a valid tokenCallId
    const commentsToLink = await this.commentRepo.find({
      where: {
        type: CommentType.TOKEN_CALL_EXPLANATION,
        tokenCallId: Not(IsNull()),
      },
      select: ['id', 'tokenCallId'],
    });

    if (!commentsToLink.length) {
      this.logger.log('No explanation comments found needing linking.');
      return {
        updatedCount: 0,
        failedCount: 0,
        skippedAlreadyLinked: 0,
        skippedNotFound: 0,
      };
    }

    this.logger.log(
      `Found ${commentsToLink.length} explanation comments to potentially link.`,
    );

    let updatedCount = 0;
    let failedCount = 0;
    let skippedAlreadyLinked = 0;
    let skippedNotFound = 0;

    // Use a transaction for atomicity
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      this.logger.log('Starting transaction for linking...');
      const tokenCallRepoTx =
        transactionalEntityManager.getRepository(TokenCallEntity);

      for (const comment of commentsToLink) {
        try {
          // Check if the token call exists and its current FK status
          const existingCall = await tokenCallRepoTx.findOne({
            where: { id: comment.tokenCallId },
            select: ['id', 'explanationCommentId'],
          });

          if (!existingCall) {
            this.logger.warn(
              `TokenCall ${comment.tokenCallId} not found. Skipping link for Comment ${comment.id}.`,
            );
            skippedNotFound++;
            continue;
          }

          if (existingCall.explanationCommentId === comment.id) {
            skippedAlreadyLinked++;
            continue;
          }

          if (existingCall.explanationCommentId) {
            this.logger.warn(
              `TokenCall ${comment.tokenCallId} already linked to different Comment ${existingCall.explanationCommentId}. Skipping link for Comment ${comment.id}.`,
            );
            failedCount++;
            continue;
          }

          // Update the TokenCall record within the transaction
          const result = await tokenCallRepoTx.update(comment.tokenCallId, {
            explanationCommentId: comment.id,
          });

          if (result.affected && result.affected > 0) {
            updatedCount++;
            if (updatedCount % 100 === 0) {
              this.logger.log(`Linked ${updatedCount} records...`);
            }
          } else {
            this.logger.warn(
              `Link update affected 0 rows for TokenCall ${comment.tokenCallId}.`,
            );
            failedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Transaction failed during attempt to link TokenCall ${comment.tokenCallId} with Comment ${comment.id}:`,
            error,
          );
          failedCount++;
          throw error;
        }
      }
      this.logger.log('Link transaction finished.');
    });

    this.logger.log('Linking process complete.');
    return { updatedCount, failedCount, skippedAlreadyLinked, skippedNotFound };
  }
}
