import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  Query,
  SetMetadata,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DYORHUB_MARKETING_ADDRESS,
  MIN_TOKEN_HOLDING_FOR_AI_TA,
  MIN_TOKEN_HOLDING_KEY,
} from '../common/constants';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../entities/user.entity';
import { EventsGateway } from '../events/events.gateway';
import { TokensService } from '../tokens/tokens.service';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { TokenAiTechnicalAnalysisService } from './token-ai-technical-analysis.service';

const BASE_AI_TA_CREDIT_COST = 3;

@Controller('token-ai-technical-analysis')
export class TokenAiTechnicalAnalysisController {
  private readonly logger = new Logger(TokenAiTechnicalAnalysisController.name);

  constructor(
    private readonly tokenAiTechnicalAnalysisService: TokenAiTechnicalAnalysisService,
    private readonly creditsService: CreditsService,
    private readonly tokensService: TokensService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private calculateAiTaCreditCost(): number {
    return BASE_AI_TA_CREDIT_COST;
  }

  @Get('cost')
  @UseGuards(JwtAuthGuard)
  async getAiTradingAnalysisCost(
    @Query('tokenAddress') tokenAddress: string,
    @CurrentUser() user: UserEntity,
  ): Promise<{ creditCost: number }> {
    if (!tokenAddress) {
      throw new BadRequestException(
        'tokenAddress query parameter is required.',
      );
    }

    const creditCost = this.calculateAiTaCreditCost();

    // Also check if the user has enough credits
    const userBalance = await this.creditsService.getUserBalance(user.id);
    if (userBalance < creditCost) {
      this.logger.warn(
        `User ${user.id} has insufficient credits for AI Trading Analysis. Required: ${creditCost}, Balance: ${userBalance}`,
      );

      throw new ForbiddenException({
        message: 'Insufficient credits for AI Trading Analysis.',
        details: {
          code: 'INSUFFICIENT_CREDITS',
          required: creditCost,
          available: userBalance,
        },
      });
    }

    return { creditCost };
  }

  @Post('start-analysis')
  @UseGuards(JwtAuthGuard, TokenGatedGuard)
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_AI_TA)
  @SetMetadata('contractAddress', DYORHUB_MARKETING_ADDRESS)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async startAnalysis(
    @Body() aiAnalysisRequestDto: AiAnalysisRequestDto,
    @CurrentUser() user: UserEntity,
  ): Promise<{ success: boolean; message: string }> {
    const { tokenAddress, sessionId } = aiAnalysisRequestDto;

    if (!sessionId) {
      throw new BadRequestException(
        'Session ID is required for WebSocket progress tracking',
      );
    }

    // Initial validation
    const token = await this.tokensService.getTokenData(tokenAddress);
    if (!token || !token.name || !token.creationTime) {
      throw new NotFoundException(
        `Token data (name/creation time) for address ${tokenAddress} not found or incomplete.`,
      );
    }
    const tokenName = token.name;
    const tokenCreationTime = new Date(token.creationTime);
    const now = new Date();
    const tokenAgeInMilliseconds = now.getTime() - tokenCreationTime.getTime();
    const tokenAgeInDays = Math.max(
      0,
      Math.floor(tokenAgeInMilliseconds / (1000 * 60 * 60 * 24)),
    );

    const creditCost = this.calculateAiTaCreditCost();

    // Check credit balance first
    const userBalance = await this.creditsService.getUserBalance(user.id);
    if (userBalance < creditCost) {
      this.logger.warn(
        `User ${user.id} has insufficient credits for AI Trading Analysis. Required: ${creditCost}, Balance: ${userBalance}`,
      );

      // Send a WebSocket message about insufficient credits
      this.eventsGateway.sendTradingAnalysisProgress(user.id, {
        status: 'error',
        message:
          'Insufficient credits. Please purchase more credits to use this feature.',
        error: 'Insufficient credits',
        sessionId,
      });

      throw new ForbiddenException({
        message: 'Insufficient credits for AI Trading Analysis.',
        details: {
          code: 'INSUFFICIENT_CREDITS',
        },
      });
    }

    // Try to reserve credits
    try {
      await this.creditsService.checkAndReserveCredits(user.id, creditCost);
    } catch (error) {
      this.logger.error(
        `Failed to reserve credits for user ${user.id}: ${error.message}`,
        error.stack,
      );

      // Handle insufficient credits specifically
      if (error.message && error.message.includes('insufficient')) {
        this.eventsGateway.sendTradingAnalysisProgress(user.id, {
          status: 'error',
          message:
            'Insufficient credits. Please purchase more credits to use this feature.',
          error: 'Insufficient credits',
          sessionId,
        });

        throw new ForbiddenException({
          message: 'Insufficient credits for AI Trading Analysis.',
          details: {
            code: 'INSUFFICIENT_CREDITS',
          },
        });
      }

      // Send a WebSocket notification about other errors
      this.eventsGateway.sendTradingAnalysisProgress(user.id, {
        status: 'error',
        message: 'Failed to reserve credits. Please try again later.',
        error: 'Credit reservation failed',
        sessionId,
      });

      throw new InternalServerErrorException(
        'Failed to reserve credits for analysis. Please try again later.',
      );
    }

    // Send initial progress update
    this.eventsGateway.sendTradingAnalysisProgress(user.id, {
      status: 'analyzing',
      message: 'Starting AI trading analysis...',
      progress: 5,
      stage: 'Initializing',
      sessionId,
    });

    // Run analysis in the background
    this._performAnalysisWithProgress(
      user.id,
      aiAnalysisRequestDto,
      tokenName,
      tokenAgeInDays,
      creditCost,
      sessionId,
    ).catch((error) => {
      this.logger.error(
        `Error in background analysis process for user ${user.id}, token ${tokenAddress}: ${error.message}`,
        error.stack,
      );

      // Send a WebSocket notification about the error - with a user-friendly message
      const errorMessage =
        error.message?.includes('insufficient credits') ||
        error.message?.includes('Insufficient credits')
          ? 'Insufficient credits. Please purchase more credits and try again.'
          : 'Analysis failed due to an unexpected error. Your credits have not been deducted.';

      this.eventsGateway.sendTradingAnalysisProgress(user.id, {
        status: 'error',
        message: errorMessage,
        error: error.message || 'Internal Server Error',
        sessionId,
      });

      // Release reserved credits on failure
      this.creditsService
        .releaseReservedCredits(user.id, creditCost)
        .catch((releaseError) => {
          this.logger.error(
            `Failed to release credits after analysis failure for user ${user.id}, sessionId ${sessionId}: ${releaseError.message}`,
          );
        });
    });

    return {
      success: true,
      message:
        'AI trading analysis started successfully. Progress updates will be sent via WebSocket.',
    };
  }

  // This method runs in the background and manages the analysis process
  private async _performAnalysisWithProgress(
    userId: string,
    requestDto: AiAnalysisRequestDto,
    tokenName: string,
    tokenAgeInDays: number,
    creditCost: number,
    sessionId: string,
  ): Promise<void> {
    try {
      const userBalance = await this.creditsService.getUserBalance(userId);
      if (userBalance < creditCost) {
        throw new BadRequestException('Insufficient credits for analysis.');
      }

      // Create a progress callback that sends WebSocket events
      const progressCallback = (percent: number, stage: string) => {
        this.eventsGateway.sendTradingAnalysisProgress(userId, {
          status: 'analyzing',
          message: stage,
          progress: percent,
          stage,
          sessionId,
        });
      };

      // Initial progress update
      progressCallback(5, 'Starting analysis...');

      // Fetch token overview to get marketcap
      const { tokenAddress } = requestDto;
      const tokenOverview =
        await this.tokensService.fetchTokenOverview(tokenAddress);
      const marketCap = tokenOverview?.marketCap || 0;

      // Perform the actual analysis with detailed progress reporting
      const analysisResult =
        await this.tokenAiTechnicalAnalysisService.prepareAndExecuteAnalysis(
          requestDto,
          tokenName,
          tokenAgeInDays,
          progressCallback,
          marketCap,
        );

      // Deduct credits after successful analysis
      const { timeFrom, timeTo } = requestDto;
      const detailsString = `AI Trading Analysis for ${tokenName} (${tokenAddress}) from ${new Date(
        timeFrom * 1000,
      ).toISOString()} to ${new Date(timeTo * 1000).toISOString()}`;

      try {
        await this.creditsService.deductCredits(
          userId,
          creditCost,
          detailsString,
        );
      } catch (deductionError) {
        this.logger.error(
          `CRITICAL: Analysis for ${tokenAddress} (user ${userId}) was successful BUT credit deduction FAILED: ${deductionError.message}`,
          deductionError.stack,
        );
      }

      // Send the final success event with the analysis data
      this.eventsGateway.sendTradingAnalysisProgress(userId, {
        status: 'complete',
        message: 'Analysis completed successfully.',
        analysisData: analysisResult.analysisOutput,
        progress: 100,
        sessionId,
      });
    } catch (error) {
      // Release the reserved credits since analysis failed
      try {
        await this.creditsService.releaseReservedCredits(userId, creditCost);
      } catch (releaseError) {
        this.logger.error(
          `Failed to release credits after analysis failure for user ${userId}, sessionId ${sessionId}: ${releaseError.message}`,
          releaseError.stack,
        );
      }

      // Send error notification via WebSocket with a user-friendly message
      const errorMessage =
        error.message === 'Insufficient credits.' ||
        error.message === 'Insufficient credits for analysis.'
          ? 'Insufficient credits. Please purchase more credits and try again.'
          : error.message || 'Analysis failed unexpectedly.';

      this.eventsGateway.sendTradingAnalysisProgress(userId, {
        status: 'error',
        message: errorMessage,
        error: errorMessage,
        sessionId,
      });
    }
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard, TokenGatedGuard)
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_AI_TA)
  @SetMetadata('contractAddress', DYORHUB_MARKETING_ADDRESS)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async analyzeToken(
    @Body() aiAnalysisRequestDto: AiAnalysisRequestDto,
    @CurrentUser() user: UserEntity,
  ): Promise<any> {
    const { tokenAddress } = aiAnalysisRequestDto;

    const token = await this.tokensService.getTokenData(tokenAddress);
    if (!token || !token.name || !token.creationTime) {
      throw new NotFoundException(
        `Token data (name/creation time) for address ${tokenAddress} not found or incomplete.`,
      );
    }
    const tokenName = token.name;
    const tokenCreationTime = new Date(token.creationTime);
    const now = new Date();
    const tokenAgeInMilliseconds = now.getTime() - tokenCreationTime.getTime();
    const tokenAgeInDays = Math.max(
      0,
      Math.floor(tokenAgeInMilliseconds / (1000 * 60 * 60 * 24)),
    );

    // Fetch token overview to get marketcap
    const tokenOverview =
      await this.tokensService.fetchTokenOverview(tokenAddress);
    const marketCap = tokenOverview?.marketCap || 0;

    const creditCost = this.calculateAiTaCreditCost();

    try {
      const userBalance = await this.creditsService.getUserBalance(user.id);
      if (userBalance < creditCost) {
        this.logger.warn(
          `User ${user.id} has insufficient credits for AI Trading Analysis. Required: ${creditCost}, Balance: ${userBalance}`,
        );
        throw new ForbiddenException(
          'Insufficient credits for AI Trading Analysis.',
        );
      }

      // Check and reserve credits
      await this.creditsService.checkAndReserveCredits(user.id, creditCost);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Failed to reserve credits for user ${user.id}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to reserve credits for analysis. Please try again later.',
      );
    }

    try {
      // Perform the analysis
      const analysisResult: any =
        await this.tokenAiTechnicalAnalysisService.prepareAndExecuteAnalysis(
          aiAnalysisRequestDto,
          tokenName,
          tokenAgeInDays,
          undefined,
          marketCap,
        );

      // Deduct credits only after successful analysis
      try {
        const { timeFrom, timeTo } = aiAnalysisRequestDto;
        const detailsString = `AI Trading Analysis for ${tokenName} (${tokenAddress}) from ${new Date(
          timeFrom * 1000,
        ).toISOString()} to ${new Date(timeTo * 1000).toISOString()}`;

        await this.creditsService.deductCredits(
          user.id,
          creditCost,
          detailsString,
        );
      } catch (deductionError) {
        this.logger.error(
          `CRITICAL: Analysis for ${tokenAddress} (user ${user.id}) was successful BUT credit deduction FAILED: ${deductionError.message}`,
          deductionError.stack,
        );

        // We'll still return the results, but we should investigate
        this.logger.warn(
          `User ${user.id} received analysis results without proper credit deduction. Investigate immediately.`,
        );
      }

      try {
        JSON.stringify(analysisResult);
      } catch (serializationError) {
        throw new InternalServerErrorException(
          'Failed to serialize analysis result before sending.',
        );
      }

      return { ...analysisResult };
    } catch (error) {
      // Release the reserved credits since analysis failed
      try {
        await this.creditsService.releaseReservedCredits(user.id, creditCost);
      } catch (releaseError) {
        this.logger.error(
          `Failed to release credits after analysis failure for user ${user.id}: ${releaseError.message}`,
          releaseError.stack,
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An error occurred while performing the AI trading analysis.',
      );
    }
  }
}
