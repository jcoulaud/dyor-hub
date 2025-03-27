import { TokenStats } from '@dyor-hub/types';
import { Controller, Get, Param, Post } from '@nestjs/common';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { TokensService } from './tokens.service';
import { TwitterHistoryService } from './twitter-history.service';

@Controller('tokens')
export class TokensController {
  constructor(
    private readonly tokensService: TokensService,
    private readonly twitterHistoryService: TwitterHistoryService,
  ) {}

  @Get(':mintAddress')
  async getTokenData(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TokenEntity> {
    return this.tokensService.getTokenData(mintAddress);
  }

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

  @Get(':mintAddress/twitter-history')
  async getTwitterHistory(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TwitterUsernameHistoryEntity | null> {
    return this.twitterHistoryService.getUsernameHistory(mintAddress);
  }

  @Get()
  async getAllTokens(): Promise<TokenEntity[]> {
    return this.tokensService.getAllTokens();
  }

  @Get(':mintAddress/price-history')
  async getTokenPriceHistory(@Param('mintAddress') mintAddress: string) {
    return this.tokensService.getTokenPriceHistory(mintAddress);
  }
}
