import {
  HotTokenResult,
  PaginatedTokensResponse,
  TokenStats,
  TwitterUsernameHistoryEntity,
} from '@dyor-hub/types';
import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { subDays } from 'date-fns';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';
import { TokensService } from './tokens.service';
import { TwitterHistoryService } from './twitter-history.service';

@Controller('tokens')
export class TokensController {
  constructor(
    private readonly tokensService: TokensService,
    private readonly twitterHistoryService: TwitterHistoryService,
  ) {}

  @Public()
  @Get()
  async getTokens(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('sortBy') sortBy?: string,
  ): Promise<PaginatedTokensResponse> {
    limit = Math.min(Math.max(limit, 1), 50);
    return this.tokensService.getTokens(page, limit, sortBy);
  }

  @Public()
  @Get('hot')
  async getHotTokens(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number = 8,
  ): Promise<HotTokenResult[]> {
    limit = Math.min(Math.max(limit, 1), 20);
    return this.tokensService.getHotTokens(limit);
  }

  @Public()
  @Get(':mintAddress')
  async getTokenData(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
    @CurrentUser() user?: UserEntity,
  ): Promise<TokenEntity & { isWatchlisted?: boolean }> {
    return this.tokensService.getTokenData(mintAddress, user?.id);
  }

  @Public()
  @Get(':mintAddress/stats')
  async getTokenStats(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TokenStats> {
    return this.tokensService.getTokenStats(mintAddress);
  }

  @Public()
  @Get(':mintAddress/twitter-history')
  async getTwitterHistory(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TwitterUsernameHistoryEntity | null> {
    return this.twitterHistoryService.getUsernameHistory(mintAddress);
  }

  @Public()
  @Get(':mintAddress/price-history')
  async getTokenPriceHistory(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<{ items: Array<{ unixTime: number; value: number }> }> {
    const endTime = new Date();
    const startTime = subDays(endTime, 1);

    return this.tokensService.getTokenPriceHistory(
      mintAddress,
      startTime,
      endTime,
      '1H',
    );
  }

  @Public()
  @Get(':mintAddress/current-price')
  async getCurrentTokenPrice(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<{ price: number }> {
    const result = await this.tokensService.fetchCurrentTokenPrice(mintAddress);
    if (result === null) {
      throw new NotFoundException(
        `Could not fetch current price for token ${mintAddress}`,
      );
    }
    return result;
  }
}
