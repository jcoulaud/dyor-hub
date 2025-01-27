import { Controller, Get, Param, Post } from '@nestjs/common';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { TokenEntity } from '../entities/token.entity';
import { TokensService } from './tokens.service';

@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get(':mintAddress')
  async getTokenData(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TokenEntity> {
    return this.tokensService.getTokenData(mintAddress);
  }

  @Post(':mintAddress/refresh')
  async refreshTokenMetadata(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TokenEntity> {
    return this.tokensService.refreshTokenMetadata(mintAddress);
  }

  @Get()
  async getAllTokens(): Promise<TokenEntity[]> {
    return this.tokensService.getAllTokens();
  }
}
