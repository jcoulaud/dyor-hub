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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DYORHUB_CONTRACT_ADDRESS,
  MIN_TOKEN_HOLDING_FOR_AI_TA,
} from '../common/constants';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../entities/user.entity';
import { EventsGateway } from '../events/events.gateway';
import { TokensService } from '../tokens/tokens.service';
import { WalletsService } from '../wallets/wallets.service';
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
    private readonly walletsService: WalletsService,
    private readonly configService: ConfigService,
  ) {}

  private calculateAiTaCreditCost(): number {
    return BASE_AI_TA_CREDIT_COST;
  }

  @Get('cost')
  @UseGuards(JwtAuthGuard)
  async getAiTradingAnalysisCost(): Promise<{ creditCost: number }> {
    const creditCost = this.calculateAiTaCreditCost();
    return { creditCost };
  }

  @Post('start-analysis')
  @UseGuards(JwtAuthGuard)
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

    // Initial token validation
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

    let isEligibleForFreeTier = false;
    let effectiveCreditCost = this.calculateAiTaCreditCost();
    let creditsReserved = false;

    // Check for free tier eligibility based on DYORHUB token holdings
    try {
      const dyorhubTokenAddress =
        this.configService.get<string>('DYORHUB_CONTRACT_ADDRESS') ||
        DYORHUB_CONTRACT_ADDRESS;
      const minHoldingForFreeTier =
        this.configService.get<number>('MIN_TOKEN_HOLDING_FOR_AI_TA') ||
        MIN_TOKEN_HOLDING_FOR_AI_TA;

      const primaryWallet = await this.walletsService.getUserPrimaryWallet(
        user.id,
      );
      if (primaryWallet?.address) {
        const balance = await this.walletsService.getSplTokenBalance(
          primaryWallet.address,
          dyorhubTokenAddress,
        );
        const currentBalanceNum =
          typeof balance === 'bigint' ? Number(balance) : balance;
        if (currentBalanceNum >= minHoldingForFreeTier) {
          isEligibleForFreeTier = true;
          this.logger.log(
            `User ${user.id} eligible for free AI TA tier. Balance: ${currentBalanceNum}`,
          );
        }
      } else {
        this.logger.warn(
          `User ${user.id} has no primary wallet for AI TA free tier check.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error checking token balance for AI TA free tier for user ${user.id}: ${error.message}`,
        error.stack,
      );
    }

    if (isEligibleForFreeTier) {
      effectiveCreditCost = 0;
    } else {
      // Paid Tier: Check credit balance and reserve credits
      const userBalance = await this.creditsService.getUserBalance(user.id);
      if (userBalance < effectiveCreditCost) {
        this.eventsGateway.sendTradingAnalysisProgress(user.id, {
          status: 'error',
          message:
            'Insufficient credits. Please purchase more credits to use this feature.',
          error: 'Insufficient credits',
          sessionId,
        });
        throw new ForbiddenException({
          message: 'Insufficient credits for AI Trading Analysis.',
          details: { code: 'INSUFFICIENT_CREDITS' },
        });
      }

      try {
        await this.creditsService.checkAndReserveCredits(
          user.id,
          effectiveCreditCost,
        );
        creditsReserved = true;
      } catch (error) {
        this.logger.error(
          `Failed to reserve ${effectiveCreditCost} credits for user ${user.id}: ${error.message}`,
          error.stack,
        );
        const errorMessage = error.message
          ?.toLowerCase()
          .includes('insufficient')
          ? 'Insufficient credits. Please purchase more credits to use this feature.'
          : 'Failed to reserve credits. Please try again later.';
        this.eventsGateway.sendTradingAnalysisProgress(user.id, {
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
      effectiveCreditCost,
      sessionId,
    ).catch((error) => {
      this.logger.error(
        `Error in background analysis process for user ${user.id}, token ${tokenAddress}: ${error.message}`,
        error.stack,
      );

      const errorMessage = error.message
        ?.toLowerCase()
        .includes('insufficient credits')
        ? 'Insufficient credits. Please purchase more credits and try again.'
        : isEligibleForFreeTier
          ? 'Analysis failed due to an unexpected error.'
          : 'Analysis failed due to an unexpected error. Your credits have not been deducted if they were reserved.';

      this.eventsGateway.sendTradingAnalysisProgress(user.id, {
        status: 'error',
        message: errorMessage,
        error: error.message || 'Internal Server Error',
        sessionId,
      });

      // Release reserved credits on failure, only if they were reserved (i.e., not free tier and reservation succeeded)
      if (creditsReserved) {
        this.creditsService
          .releaseReservedCredits(user.id, effectiveCreditCost)
          .catch((releaseError) => {
            this.logger.error(
              `Failed to release ${effectiveCreditCost} credits after analysis failure for user ${user.id}, sessionId ${sessionId}: ${releaseError.message}`,
            );
          });
      }
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
    let analysisSuccessful = false;
    const { tokenAddress } = requestDto;

    try {
      this.eventsGateway.sendTradingAnalysisProgress(userId, {
        status: 'analyzing',
        message: 'Fetching token data and market context...',
        progress: 15,
        stage: 'Data Fetching',
        sessionId,
      });

      const analysisResult =
        await this.tokenAiTechnicalAnalysisService.prepareAndExecuteAnalysis(
          requestDto,
          tokenName,
          tokenAgeInDays,
          (percent: number, stage: string) => {
            this.eventsGateway.sendTradingAnalysisProgress(userId, {
              status: 'analyzing',
              message: stage,
              progress: percent,
              stage,
              sessionId,
            });
          },
        );

      if (analysisResult?.analysisOutput) {
        analysisSuccessful = true;
      } else {
        this.logger.warn(
          `Analysis for ${tokenAddress} by user ${userId} did not return output. SessionId: ${sessionId}`,
        );
      }

      // Handle credit confirmation for successful paid analysis
      if (analysisSuccessful && creditCost > 0) {
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
      this.eventsGateway.sendTradingAnalysisProgress(userId, {
        status: analysisSuccessful ? 'complete' : 'error',
        message: analysisSuccessful
          ? 'Analysis completed successfully.'
          : 'Analysis failed to generate insights. Credits will not be deducted if applicable.',
        analysisData: analysisSuccessful
          ? analysisResult.analysisOutput
          : undefined,
        progress: analysisSuccessful ? 100 : 0,
        sessionId,
      });
    } catch (error) {
      this.logger.error(
        `Error during _performAnalysisWithProgress for ${requestDto.tokenAddress}, user ${userId}, sessionId ${sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
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

    let isEligibleForFreeTier = false;
    let effectiveCreditCost = this.calculateAiTaCreditCost();
    let creditsReservedForThisRequest = false;

    // Check for free tier eligibility based on DYORHUB token holdings
    try {
      const dyorhubTokenAddress =
        this.configService.get<string>('DYORHUB_CONTRACT_ADDRESS') ||
        DYORHUB_CONTRACT_ADDRESS;
      const minHoldingForFreeTier =
        this.configService.get<number>('MIN_TOKEN_HOLDING_FOR_AI_TA') ||
        MIN_TOKEN_HOLDING_FOR_AI_TA;

      const primaryWallet = await this.walletsService.getUserPrimaryWallet(
        user.id,
      );
      if (primaryWallet?.address) {
        const balance = await this.walletsService.getSplTokenBalance(
          primaryWallet.address,
          dyorhubTokenAddress,
        );
        const currentBalanceNum =
          typeof balance === 'bigint' ? Number(balance) : balance;
        if (currentBalanceNum >= minHoldingForFreeTier) {
          isEligibleForFreeTier = true;
          this.logger.log(
            `User ${user.id} eligible for free AI TA (analyzeToken endpoint). Balance: ${currentBalanceNum}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking token balance for AI TA free tier (analyzeToken endpoint) for user ${user.id}: ${error.message}`,
        error.stack,
      );
    }

    if (isEligibleForFreeTier) {
      effectiveCreditCost = 0;
    } else {
      // Paid Tier: Check balance and reserve credits
      try {
        const userBalance = await this.creditsService.getUserBalance(user.id);
        if (userBalance < effectiveCreditCost) {
          throw new ForbiddenException(
            'Insufficient credits for AI Trading Analysis.',
          );
        }
        await this.creditsService.checkAndReserveCredits(
          user.id,
          effectiveCreditCost,
        );
        creditsReservedForThisRequest = true;
      } catch (error) {
        if (error instanceof ForbiddenException) throw error;
        this.logger.error(
          `Failed to reserve ${effectiveCreditCost} credits for user ${user.id} (analyzeToken): ${error.message}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          'Failed to reserve credits for analysis. Please try again later.',
        );
      }
    }

    try {
      const analysisResult: any =
        await this.tokenAiTechnicalAnalysisService.prepareAndExecuteAnalysis(
          aiAnalysisRequestDto,
          tokenName,
          tokenAgeInDays,
          undefined, // No progress callback for this simpler endpoint
        );

      // Deduct credits only if it was a paid analysis and successful
      if (!isEligibleForFreeTier && analysisResult?.analysisOutput) {
        try {
          const { timeFrom, timeTo } = aiAnalysisRequestDto;
          const detailsString = `AI Trading Analysis for ${tokenName} (${tokenAddress}) from ${new Date(
            timeFrom * 1000,
          ).toISOString()} to ${new Date(timeTo * 1000).toISOString()} (analyzeToken endpoint)`;

          if (creditsReservedForThisRequest) {
            await this.creditsService.commitReservedCredits(
              user.id,
              effectiveCreditCost,
            );
            this.logger.log(
              `Committed ${effectiveCreditCost} credits for user ${user.id} (analyzeToken)`,
            );
          } else {
            this.logger.warn(
              `Attempting direct deduction for user ${user.id} (analyzeToken) as credits were not pre-reserved. Cost: ${effectiveCreditCost}`,
            );
            await this.creditsService.deductCredits(
              user.id,
              effectiveCreditCost,
              detailsString,
            );
          }
        } catch (deductionError) {
          this.logger.error(
            `CRITICAL: Analysis for ${tokenAddress} (user ${user.id}, analyzeToken) was successful BUT credit deduction/commit FAILED: ${deductionError.message}`,
            deductionError.stack,
          );
          this.logger.warn(
            `User ${user.id} (analyzeToken) received analysis results without proper credit deduction. Investigate.`,
          );
        }
      } else if (isEligibleForFreeTier) {
        this.logger.log(
          `AI TA for ${tokenAddress} (user ${user.id}, analyzeToken) was free.`,
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
      // Release reserved credits if analysis failed and they were reserved
      if (creditsReservedForThisRequest) {
        try {
          await this.creditsService.releaseReservedCredits(
            user.id,
            effectiveCreditCost,
          );
          this.logger.log(
            `Released ${effectiveCreditCost} credits for user ${user.id} (analyzeToken) due to error.`,
          );
        } catch (releaseError) {
          this.logger.error(
            `Failed to release ${effectiveCreditCost} credits after analysis failure for user ${user.id} (analyzeToken): ${releaseError.message}`,
            releaseError.stack,
          );
        }
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException // Propagate this if it was thrown by JSON.stringify
      ) {
        throw error;
      }
      this.logger.error(
        `Unhandled error in analyzeToken for user ${user.id}, token ${tokenAddress}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'An error occurred while performing the AI trading analysis.',
      );
    }
  }
}
