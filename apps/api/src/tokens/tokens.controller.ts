import {
  PaginatedHotTokensResult,
  PaginatedTokensResponse,
  ProcessedBundleData,
  SolanaTrackerHoldersChartResponse,
  TokenStats,
  TwitterCommunityInfo,
  TwitterFeedResponse,
  TwitterTweetInfo,
  TwitterUserInfo,
  TwitterUsernameHistoryEntity,
} from '@dyor-hub/types';
import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { subDays } from 'date-fns';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';
import { TokensService } from './tokens.service';
import { TwitterFeedService } from './twitter-feed.service';
import { TwitterHistoryService } from './twitter-history.service';
import { TwitterInfoService } from './twitter-info.service';

@Controller('tokens')
export class TokensController {
  constructor(
    private readonly tokensService: TokensService,
    private readonly twitterHistoryService: TwitterHistoryService,
    private readonly twitterFeedService: TwitterFeedService,
    private readonly twitterInfoService: TwitterInfoService,
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number = 5,
    @Query('timePeriod', new DefaultValuePipe('7d')) timePeriod: string = '7d',
  ): Promise<PaginatedHotTokensResult> {
    limit = Math.min(Math.max(limit, 1), 25);
    page = Math.max(page, 1);
    return this.tokensService.getHotTokens(page, limit, timePeriod);
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
  @Get(':mintAddress/bundles')
  async getTokenBundles(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<ProcessedBundleData> {
    return this.tokensService.getTokenBundles(mintAddress);
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

  @UseGuards(JwtAuthGuard)
  @Post(':mintAddress/verify-creator')
  @HttpCode(HttpStatus.OK)
  async verifyCreator(
    @Param('mintAddress') mintAddress: string,
    @Req() req: any,
  ) {
    if (!req.user || !req.user.id) {
      throw new HttpException(
        'User information not found on request',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const userId = req.user.id;
    const result = await this.tokensService.verifyTokenCreator(
      mintAddress,
      userId,
    );
    return result;
  }

  @Public()
  @Get(':mintAddress/holder-history')
  async getHolderChartData(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<SolanaTrackerHoldersChartResponse> {
    const chartData =
      await this.tokensService.fetchSolanaTrackerHolderChart(mintAddress);
    if (!chartData) {
      throw new NotFoundException(
        `Holder chart data not found for token ${mintAddress}`,
      );
    }
    return chartData;
  }

  @Public()
  @Get(':mintAddress/solana-tracker-risk')
  async getSolanaTrackerRisk(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<{
    score: number;
    risks: Array<{
      name: string;
      description: string;
      level: 'warning' | 'danger' | 'info';
      score: number;
      value?: string;
    }>;
  }> {
    const riskData =
      await this.tokensService.fetchSolanaTrackerRisk(mintAddress);
    if (!riskData) {
      throw new NotFoundException(
        `Risk data not found for token ${mintAddress}`,
      );
    }
    return riskData;
  }

  @Public()
  @Get(':mintAddress/twitter-feed')
  async getTokenTwitterFeed(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
    @Query('cursor') cursor?: string,
  ): Promise<TwitterFeedResponse | null> {
    // Get token data to check if it has a Twitter handle
    const token = await this.tokensService.getTokenData(mintAddress);

    if (!token?.twitterHandle) {
      throw new NotFoundException(
        `No Twitter handle found for token ${mintAddress}`,
      );
    }

    if (!this.twitterFeedService.isTwitterClientAvailable()) {
      throw new HttpException(
        'Twitter API is not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const feedData = await this.twitterFeedService.getLatestTweets(
      token.twitterHandle,
      cursor,
    );

    if (!feedData) {
      throw new NotFoundException(
        `Twitter feed not found for token ${mintAddress}`,
      );
    }

    return feedData;
  }

  @Public()
  @Get(':mintAddress/twitter-info')
  async getTwitterInfo(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ): Promise<TwitterUserInfo | TwitterCommunityInfo | TwitterTweetInfo | null> {
    // Get token data to check if it has a Twitter handle
    const token = await this.tokensService.getTokenData(mintAddress);

    if (!token?.twitterHandle) {
      throw new NotFoundException(
        `No Twitter handle found for token ${mintAddress}`,
      );
    }

    const twitterInfo = await this.twitterInfoService.getTwitterInfo(
      token.twitterHandle,
    );

    if (!twitterInfo) {
      throw new NotFoundException(
        `Twitter information not found for ${token.twitterHandle}`,
      );
    }

    return twitterInfo;
  }
}
