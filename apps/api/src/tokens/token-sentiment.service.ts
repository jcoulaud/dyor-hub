import { SentimentType, TokenSentimentStats } from '@dyor-hub/types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenSentimentEntity } from '../entities/token-sentiment.entity';
import { TokenEntity } from '../entities/token.entity';

@Injectable()
export class TokenSentimentService {
  private readonly logger = new Logger(TokenSentimentService.name);

  constructor(
    @InjectRepository(TokenSentimentEntity)
    private readonly sentimentRepository: Repository<TokenSentimentEntity>,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
  ) {}

  async getUserSentiment(
    tokenMintAddress: string,
    userId: string,
  ): Promise<TokenSentimentEntity | null> {
    try {
      return await this.sentimentRepository.findOne({
        where: {
          tokenMintAddress,
          userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error getting user sentiment for token ${tokenMintAddress} and user ${userId}:`,
        error,
      );
      return null;
    }
  }

  async getSentimentStats(
    tokenMintAddress: string,
    userId?: string,
  ): Promise<TokenSentimentStats> {
    try {
      // Check if token exists
      const token = await this.tokenRepository.findOne({
        where: { mintAddress: tokenMintAddress },
      });

      if (!token) {
        throw new NotFoundException(
          `Token with mint address ${tokenMintAddress} not found`,
        );
      }

      // Get counts for each sentiment type
      const sentiments = await this.sentimentRepository.find({
        where: { tokenMintAddress },
      });

      const bullishCount = sentiments.filter(
        (s) => s.sentimentType === SentimentType.BULLISH,
      ).length;
      const bearishCount = sentiments.filter(
        (s) => s.sentimentType === SentimentType.BEARISH,
      ).length;
      const redFlagCount = sentiments.filter(
        (s) => s.sentimentType === SentimentType.RED_FLAG,
      ).length;
      const totalCount = sentiments.length;

      // Get user's sentiment if userId is provided
      let userSentiment = undefined;
      if (userId) {
        const userVote = await this.getUserSentiment(tokenMintAddress, userId);
        if (userVote) {
          userSentiment = userVote.sentimentType;
        }
      }

      return {
        bullishCount,
        bearishCount,
        redFlagCount,
        totalCount,
        userSentiment,
      };
    } catch (error) {
      this.logger.error(
        `Error getting sentiment stats for token ${tokenMintAddress}:`,
        error,
      );
      throw error;
    }
  }

  async addOrUpdateSentiment(
    userId: string,
    tokenMintAddress: string,
    sentimentType: SentimentType,
  ): Promise<TokenSentimentEntity> {
    try {
      // Check if token exists
      const token = await this.tokenRepository.findOne({
        where: { mintAddress: tokenMintAddress },
      });

      if (!token) {
        throw new NotFoundException(
          `Token with mint address ${tokenMintAddress} not found`,
        );
      }

      // Check if user already has a sentiment for this token
      const existingSentiment = await this.sentimentRepository.findOne({
        where: {
          userId,
          tokenMintAddress,
        },
      });

      if (existingSentiment) {
        // Update existing sentiment
        existingSentiment.sentimentType = sentimentType;
        return this.sentimentRepository.save(existingSentiment);
      } else {
        // Create new sentiment
        const newSentiment = this.sentimentRepository.create({
          userId,
          tokenMintAddress,
          sentimentType,
          value: 1, // Default value
        });
        return this.sentimentRepository.save(newSentiment);
      }
    } catch (error) {
      this.logger.error(
        `Error adding/updating sentiment for token ${tokenMintAddress} by user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async removeSentiment(
    userId: string,
    tokenMintAddress: string,
  ): Promise<boolean> {
    try {
      const result = await this.sentimentRepository.delete({
        userId,
        tokenMintAddress,
      });
      return result.affected > 0;
    } catch (error) {
      this.logger.error(
        `Error removing sentiment for token ${tokenMintAddress} by user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
