import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';
import { WatchlistService } from './watchlist.service';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  private readonly logger = new Logger(WatchlistController.name);

  constructor(private readonly watchlistService: WatchlistService) {}

  @Get('tokens')
  async getWatchlistedTokens(
    @CurrentUser() user: UserEntity,
  ): Promise<(TokenEntity & { addedAt: Date })[]> {
    return this.watchlistService.getWatchlistedTokensWithData(user.id);
  }

  @Post('tokens/:mintAddress')
  async addTokenToWatchlist(
    @CurrentUser() user: UserEntity,
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<{ success: boolean }> {
    await this.watchlistService.addTokenToWatchlist(user.id, mintAddress);
    return { success: true };
  }

  @Delete('tokens/:mintAddress')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTokenFromWatchlist(
    @CurrentUser() user: UserEntity,
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<void> {
    await this.watchlistService.removeTokenFromWatchlist(user.id, mintAddress);
  }

  @Get('tokens/:mintAddress/status')
  async isTokenWatchlisted(
    @CurrentUser() user: UserEntity,
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<{ isWatchlisted: boolean }> {
    const isWatchlisted = await this.watchlistService.isTokenInWatchlist(
      user.id,
      mintAddress,
    );
    return { isWatchlisted };
  }
}
