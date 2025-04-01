import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenWatchlistEntity } from '../entities/token-watchlist.entity';
import { TokenEntity } from '../entities/token.entity';

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(
    @InjectRepository(TokenWatchlistEntity)
    private readonly tokenWatchlistRepository: Repository<TokenWatchlistEntity>,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
  ) {}

  async addTokenToWatchlist(
    userId: string,
    tokenMintAddress: string,
  ): Promise<TokenWatchlistEntity> {
    // Check if token exists
    const token = await this.tokenRepository.findOne({
      where: { mintAddress: tokenMintAddress },
    });

    if (!token) {
      throw new NotFoundException(
        `Token with mint address ${tokenMintAddress} not found`,
      );
    }

    // Check if already in watchlist
    const existing = await this.tokenWatchlistRepository.findOne({
      where: { userId, tokenMintAddress },
    });

    if (existing) {
      return existing;
    }

    // Create new watchlist entry
    const watchlistItem = this.tokenWatchlistRepository.create({
      userId,
      tokenMintAddress,
    });

    return this.tokenWatchlistRepository.save(watchlistItem);
  }

  async removeTokenFromWatchlist(
    userId: string,
    tokenMintAddress: string,
  ): Promise<void> {
    const result = await this.tokenWatchlistRepository.delete({
      userId,
      tokenMintAddress,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Token with mint address ${tokenMintAddress} not found in watchlist`,
      );
    }
  }

  async getUserWatchlistedTokens(
    userId: string,
  ): Promise<{ mintAddress: string; addedAt: Date }[]> {
    const watchlist = await this.tokenWatchlistRepository.find({
      where: { userId },
      select: ['tokenMintAddress', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    return watchlist.map((item) => ({
      mintAddress: item.tokenMintAddress,
      addedAt: item.createdAt,
    }));
  }

  async isTokenInWatchlist(
    userId: string,
    tokenMintAddress: string,
  ): Promise<boolean> {
    const count = await this.tokenWatchlistRepository.count({
      where: { userId, tokenMintAddress },
    });
    return count > 0;
  }

  async getWatchlistedTokensWithData(
    userId: string,
  ): Promise<(TokenEntity & { addedAt: Date })[]> {
    const watchlistItems = await this.tokenWatchlistRepository.find({
      where: { userId },
      relations: ['token'],
      order: { createdAt: 'DESC' },
    });

    return watchlistItems.map((item) => ({
      ...item.token,
      addedAt: item.createdAt,
    }));
  }
}
