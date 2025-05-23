import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TopTrader, TopTradersResponse } from './dto/top-trader.dto';

@Injectable()
export class TopTradersAnalysisService {
  private readonly logger = new Logger(TopTradersAnalysisService.name);

  constructor(private readonly configService: ConfigService) {}

  async getTopTraders(tokenAddress: string): Promise<TopTradersResponse> {
    try {
      const apiKey = this.configService.get<string>('SOLANA_TRACKER_API_KEY');

      if (!apiKey) {
        throw new Error('SOLANA_TRACKER_API_KEY is not configured');
      }

      const url = `https://data.solanatracker.io/top-traders/${tokenAddress}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            traders: [],
            tokenAddress,
            totalTraders: 0,
          };
        }

        const errorText = await response.text();
        throw new Error(
          `SolanaTracker API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const traders: TopTrader[] = await response.json();

      return {
        traders,
        tokenAddress,
        totalTraders: traders.length,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching top traders for token ${tokenAddress}:`,
        error.message,
      );

      if (error.message?.includes('404')) {
        return {
          traders: [],
          tokenAddress,
          totalTraders: 0,
        };
      }

      throw error;
    }
  }
}
