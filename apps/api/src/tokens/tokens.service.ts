import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenEntity } from '../entities/token.entity';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
  ) {}

  async getTokenData(mintAddress: string): Promise<TokenEntity> {
    try {
      const token = await this.tokenRepository.findOne({
        where: { mintAddress },
        relations: ['comments', 'comments.votes'],
      });

      if (!token) {
        throw new NotFoundException(
          `Token with address ${mintAddress} not found`,
        );
      }

      // Update view count
      token.viewsCount += 1;
      return this.tokenRepository.save(token);
    } catch (error) {
      this.logger.error(`Error fetching token ${mintAddress}:`, error);
      throw error;
    }
  }

  async getAllTokens(): Promise<TokenEntity[]> {
    return this.tokenRepository.find({
      relations: ['comments', 'comments.votes'],
      order: {
        viewsCount: 'DESC',
      },
    });
  }
}
