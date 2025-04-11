import { TokenStats } from '@dyor-hub/types';
import { Controller, Get, Param, Post } from '@nestjs/common';
import { subDays } from 'date-fns';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
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

  @Post(':mintAddress/refresh')
  async refreshTokenMetadata(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TokenEntity> {
    return this.tokensService.refreshTokenMetadata(mintAddress);
  }

  @Public()
  @Get(':mintAddress/twitter-history')
  async getTwitterHistory(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TwitterUsernameHistoryEntity | null> {
    return this.twitterHistoryService.getUsernameHistory(mintAddress);
  }

  @Public()
  @Get()
  async getAllTokens(): Promise<TokenEntity[]> {
    return this.tokensService.getAllTokens();
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
    );
  }
}
