import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';

interface TwitterUsernameHistory {
  last_checked: string;
  username: string;
}

interface TwitterApiResponse {
  user: string;
  how: string;
  data: TwitterUsernameHistory[];
  current_credits: number;
}

@Injectable()
export class TwitterHistoryService {
  private readonly logger = new Logger(TwitterHistoryService.name);
  private readonly API_URL =
    'https://toto.oz.xyz/api/metadata/get_past_usernames';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(TwitterUsernameHistoryEntity)
    private readonly twitterHistoryRepository: Repository<TwitterUsernameHistoryEntity>,
  ) {}

  async fetchAndStoreUsernameHistory(token: TokenEntity): Promise<void> {
    if (!token.twitterHandle) {
      return;
    }

    // Validate Twitter handle first
    if (!this.isValidTwitterHandle(token.twitterHandle)) {
      this.logger.warn(
        `Invalid Twitter handle format: ${token.twitterHandle} for token ${token.mintAddress}`,
      );
      // Create empty record to avoid future attempts
      await this.createEmptyHistoryRecord(
        token.mintAddress,
        token.twitterHandle,
      );
      return;
    }

    // Check if API key is available
    const apiKey = this.configService.get('TOTO_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'TOTO_API_KEY is not configured, skipping Twitter history fetch',
      );
      return;
    }

    const existingHistory = await this.twitterHistoryRepository.findOne({
      where: { tokenMintAddress: token.mintAddress },
    });

    if (existingHistory) {
      return;
    }

    try {
      // Clean the handle
      const cleanHandle = this.normalizeTwitterHandle(token.twitterHandle);

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: cleanHandle,
          how: 'username',
          page: 1,
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `API request failed with status ${response.status} for token ${token.mintAddress} with Twitter handle ${token.twitterHandle}`,
        );
        // Create empty record for failed requests to avoid repeated attempts
        await this.createEmptyHistoryRecord(
          token.mintAddress,
          token.twitterHandle,
        );
        return;
      }

      const data: TwitterApiResponse = await response.json();

      const history = this.twitterHistoryRepository.create({
        tokenMintAddress: token.mintAddress,
        twitterUsername: token.twitterHandle,
        history: [],
      });

      if (data?.data && Array.isArray(data.data)) {
        // If there's only one username and it matches current, keep empty array
        // If there's more than one username or different username, store the history
        if (
          data.data.length > 1 ||
          (data.data.length === 1 && data.data[0].username !== cleanHandle)
        ) {
          history.history = data.data;
        }
      }

      await this.twitterHistoryRepository.save(history);
    } catch (error) {
      this.logger.error(
        `Failed to fetch Twitter username history for token ${token.mintAddress}:`,
        error instanceof Error ? error.message : String(error),
      );
      await this.createEmptyHistoryRecord(
        token.mintAddress,
        token.twitterHandle,
      );
    }
  }

  async getUsernameHistory(
    tokenMintAddress: string,
  ): Promise<TwitterUsernameHistoryEntity | null> {
    try {
      const history = await this.twitterHistoryRepository.findOne({
        where: { tokenMintAddress },
      });

      return history;
    } catch (error) {
      this.logger.error(
        `Error fetching Twitter history for ${tokenMintAddress}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private isValidTwitterHandle(handle: string): boolean {
    if (!handle) return false;

    // Check for URLs or email addresses
    if (
      handle.includes('http') ||
      handle.includes('www.') ||
      handle.includes('/') ||
      handle.includes('@gmail.com')
    ) {
      return false;
    }

    // Remove @ if present and check format
    const normalizedHandle = this.normalizeTwitterHandle(handle);

    // Twitter handle rules: 1-15 characters, alphanumeric and underscores only
    return /^[A-Za-z0-9_]{1,15}$/.test(normalizedHandle);
  }

  private normalizeTwitterHandle(handle: string): string {
    return handle.startsWith('@') ? handle.substring(1) : handle;
  }

  private async createEmptyHistoryRecord(
    mintAddress: string,
    twitterHandle: string,
  ): Promise<void> {
    try {
      const history = this.twitterHistoryRepository.create({
        tokenMintAddress: mintAddress,
        twitterUsername: twitterHandle,
        history: [],
      });

      await this.twitterHistoryRepository.save(history);
    } catch (error) {
      this.logger.error(
        `Failed to create empty history record for ${mintAddress}`,
        error,
      );
    }
  }
}
