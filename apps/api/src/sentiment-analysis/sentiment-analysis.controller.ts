import {
  SentimentAnalysisRequest,
  SentimentAnalysisResponse,
} from '@dyor-hub/types';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards';
import { MIN_TOKEN_HOLDING_FOR_TWITTER_SENTIMENT_ANALYSIS } from '../common/constants';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../entities/user.entity';
import { EventsGateway } from '../events/events.gateway';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  private readonly logger = new Logger(SentimentAnalysisController.name);

  constructor(
    private readonly sentimentAnalysisService: SentimentAnalysisService,
    private readonly tokensService: TokensService,
    private readonly creditsService: CreditsService,
    private readonly usersService: UsersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Public()
  @Get(':tokenAddress/cost')
  @HttpCode(HttpStatus.OK)
  async getSentimentAnalysisCost(): Promise<{ cost: number }> {
    return { cost: 3 };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':tokenAddress/start')
  @HttpCode(HttpStatus.OK)
  async startTokenSentimentAnalysis(
    @Param('tokenAddress', SolanaAddressPipe) tokenAddress: string,
    @Body() body: { useCredits?: boolean; sessionId?: string },
    @CurrentUser() user?: UserEntity,
  ): Promise<{ success: boolean; message: string; sessionId: string }> {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Use sessionId from request body, or generate a new one if not provided
    const sessionId = body.sessionId || randomUUID();

    // Get token data to extract Twitter handle
    const tokenData = await this.tokensService.getTokenData(tokenAddress);

    if (!tokenData) {
      throw new NotFoundException(`Token ${tokenAddress} not found`);
    }

    if (!tokenData.twitterHandle) {
      throw new NotFoundException(
        `No Twitter account associated with token ${tokenAddress}`,
      );
    }

    // Check if user has enough platform tokens to get free analysis
    const shouldUseCredits = body.useCredits === true;
    const userPlatformBalance =
      await this.usersService.getUserPlatformTokenBalance(user.id);
    const hasSufficientTokens =
      userPlatformBalance.balance >=
      MIN_TOKEN_HOLDING_FOR_TWITTER_SENTIMENT_ANALYSIS;

    // If user doesn't have enough tokens and they're not using credits, require payment
    if (!hasSufficientTokens && !shouldUseCredits) {
      throw new BadRequestException(
        'Insufficient token holdings. You need to either hold enough tokens or use credits.',
      );
    }

    // If using credits, check and reserve credits
    let creditsReserved = false;
    const creditCost = 3;
    if (shouldUseCredits || !hasSufficientTokens) {
      if (user.credits < creditCost) {
        this.eventsGateway.sendSentimentAnalysisProgress(user.id, {
          status: 'error',
          message: 'Insufficient credits for Twitter Sentiment Analysis.',
          error: 'Insufficient credits',
          sessionId,
        });
        throw new ForbiddenException({
          message: 'Insufficient credits for Twitter Sentiment Analysis.',
          details: { code: 'INSUFFICIENT_CREDITS' },
        });
      }

      try {
        await this.creditsService.checkAndReserveCredits(user.id, creditCost);
        creditsReserved = true;
      } catch (error) {
        this.logger.error(
          `Failed to reserve ${creditCost} credits for user ${user.id}: ${error.message}`,
          error.stack,
        );
        const errorMessage = error.message
          ?.toLowerCase()
          .includes('insufficient')
          ? 'Insufficient credits for Twitter Sentiment Analysis.'
          : 'Failed to reserve credits. Please try again later.';
        this.eventsGateway.sendSentimentAnalysisProgress(user.id, {
          status: 'error',
          message: errorMessage,
          error: error.message || 'Credit reservation failed',
          sessionId,
        });
        throw new ForbiddenException({
          message: errorMessage,
          details: {
            code: error.message?.toLowerCase().includes('insufficient')
              ? 'INSUFFICIENT_CREDITS'
              : 'CREDIT_RESERVATION_FAILED',
          },
        });
      }
    }

    // Send initial progress update
    this.eventsGateway.sendSentimentAnalysisProgress(user.id, {
      status: 'analyzing',
      message: 'Starting Twitter sentiment analysis...',
      progress: 5,
      stage: 'Initializing',
      sessionId,
    });

    // Run analysis in the background
    this._performSentimentAnalysisWithProgress(
      user.id,
      tokenData.twitterHandle,
      creditCost,
      hasSufficientTokens,
      sessionId,
    ).catch((error) => {
      this.logger.error(
        `Error in background sentiment analysis for user ${user.id}, token ${tokenAddress}: ${error.message}`,
        error.stack,
      );

      this.eventsGateway.sendSentimentAnalysisProgress(user.id, {
        status: 'error',
        message: 'Analysis failed due to an unexpected error.',
        error: error.message || 'Internal Server Error',
        sessionId,
      });

      // Release reserved credits on failure
      if (creditsReserved) {
        this.creditsService
          .releaseReservedCredits(user.id, creditCost)
          .catch((releaseError) => {
            this.logger.error(
              `Failed to release ${creditCost} credits after analysis failure for user ${user.id}, sessionId ${sessionId}: ${releaseError.message}`,
            );
          });
      }
    });

    return {
      success: true,
      message:
        'Twitter sentiment analysis started successfully. Progress updates will be sent via WebSocket.',
      sessionId,
    };
  }

  // This method runs in the background and manages the analysis process
  private async _performSentimentAnalysisWithProgress(
    userId: string,
    twitterHandle: string,
    creditCost: number,
    hasSufficientTokens: boolean,
    sessionId: string,
  ): Promise<void> {
    let analysisSuccessful = false;

    try {
      // Extract username from Twitter handle (remove @ if present)
      let username = twitterHandle;
      if (username.startsWith('@')) {
        username = username.substring(1);
      }

      // Check if it's a community handle
      if (username.includes('/communities/')) {
        throw new BadRequestException(
          'Community sentiment analysis is not yet supported',
        );
      }

      this.eventsGateway.sendSentimentAnalysisProgress(userId, {
        status: 'analyzing',
        message: 'Collecting tweets for analysis...',
        progress: 15,
        stage: 'Collecting Tweets',
        sessionId,
      });

      const request: SentimentAnalysisRequest = {
        username,
        analysisType: 'full',
        options: {
          maxTweets: 20,
          includeReplies: true,
          includeMentions: true,
        },
      };

      // Create progress callback
      const progressCallback = (percent: number, stage: string) => {
        this.eventsGateway.sendSentimentAnalysisProgress(userId, {
          status: 'analyzing',
          message: stage,
          progress: percent,
          stage,
          sessionId,
        });
      };

      const result =
        await this.sentimentAnalysisService.analyzeSentimentWithProgress(
          request,
          progressCallback,
        );

      if (result) {
        analysisSuccessful = true;
      } else {
        this.logger.warn(
          `Sentiment analysis for @${username} by user ${userId} did not return output. SessionId: ${sessionId}`,
        );
      }

      // Handle credit confirmation for successful paid analysis
      if (analysisSuccessful && creditCost > 0 && !hasSufficientTokens) {
        try {
          await this.creditsService.commitReservedCredits(userId, creditCost);
        } catch (deductionError) {
          this.logger.error(
            `CRITICAL: Failed to commit/deduct ${creditCost} credits for user ${userId} (sessionId ${sessionId}) after successful analysis: ${deductionError.message}`,
            deductionError.stack,
          );
        }
      }

      // Send the final WebSocket event
      this.eventsGateway.sendSentimentAnalysisProgress(userId, {
        status: analysisSuccessful ? 'complete' : 'error',
        message: analysisSuccessful
          ? 'Sentiment analysis completed successfully.'
          : 'Analysis failed to generate insights.',
        sentimentData: analysisSuccessful ? result : undefined,
        progress: analysisSuccessful ? 100 : 0,
        sessionId,
      });
    } catch (error) {
      this.logger.error(
        `Error during _performSentimentAnalysisWithProgress for @${twitterHandle}, user ${userId}, sessionId ${sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeSentiment(
    @Body() request: SentimentAnalysisRequest,
  ): Promise<SentimentAnalysisResponse> {
    this.logger.log(`Sentiment analysis requested for @${request.username}`);

    // Validation
    if (!request.username) {
      throw new BadRequestException('Username is required');
    }

    if (request.username.startsWith('@')) {
      request.username = request.username.substring(1);
    }

    try {
      const result =
        await this.sentimentAnalysisService.analyzeSentiment(request);

      this.logger.log(
        `Sentiment analysis completed for @${request.username}. Overall sentiment: ${result.profile.overallSentiment.overall.toFixed(2)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to analyze sentiment for @${request.username}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
