import { CommentType } from '@dyor-hub/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CommentEntity, TokenCallEntity } from '../../entities';

@Injectable()
export class DevAdminService {
  private readonly logger = new Logger(DevAdminService.name);

  constructor(
    @InjectRepository(TokenCallEntity)
    private readonly tokenCallRepo: Repository<TokenCallEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
  ) {}

  async backfillDefaultTokenCallComments(): Promise<number> {
    this.logger.log('Starting backfill for default token call comments...');

    // 1. Find TokenCalls without an explanationComment
    const callsToUpdate = await this.tokenCallRepo.find({
      where: { explanationComment: IsNull() },
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
}
