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

    const existingHistory = await this.twitterHistoryRepository.findOne({
      where: { tokenMintAddress: token.mintAddress },
    });

    if (existingHistory) {
      return;
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'x-api-key': this.configService.get('TOTO_API_KEY')!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: token.twitterHandle,
          how: 'username',
          page: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data: TwitterApiResponse = await response.json();

      if (!data?.data || !Array.isArray(data.data)) {
        this.logger.warn(
          `Invalid response format for token ${token.mintAddress}:`,
          data,
        );
        return;
      }

      const history = this.twitterHistoryRepository.create({
        tokenMintAddress: token.mintAddress,
        twitterUsername: token.twitterHandle,
        history: data.data,
      });

      await this.twitterHistoryRepository.save(history);
    } catch (error) {
      this.logger.error(
        `Failed to fetch Twitter username history for token ${token.mintAddress}:`,
        error,
      );
      throw error;
    }
  }

  async getUsernameHistory(
    tokenMintAddress: string,
  ): Promise<TwitterUsernameHistoryEntity | null> {
    const history = await this.twitterHistoryRepository.findOne({
      where: { tokenMintAddress },
    });

    return history;
  }
}
