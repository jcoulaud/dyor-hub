import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  SetMetadata,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MIN_TOKEN_HOLDING_FOR_AI_TA,
  MIN_TOKEN_HOLDING_KEY,
} from '../common/constants';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../entities/user.entity';
import { TokensService } from '../tokens/tokens.service';
import { ChartWhispererOutput } from './ai-analysis.service';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { TokenAiTechnicalAnalysisService } from './token-ai-technical-analysis.service';

const BASE_AI_TA_CREDIT_COST = 5;

@Controller('token-ai-technical-analysis')
export class TokenAiTechnicalAnalysisController {
  private readonly logger = new Logger(TokenAiTechnicalAnalysisController.name);

  constructor(
    private readonly creditsService: CreditsService,
    private readonly tokensService: TokensService,
    private readonly tokenAiTechnicalAnalysisService: TokenAiTechnicalAnalysisService,
  ) {}

  private calculateAiTaCreditCost(tokenAgeInDays: number): number {
    const ageFactorMultiplier = 0.01; // 1% increase in cost per day of age
    const maxAgeFactorEffect = 4; // Cap total multiplier from age at 4x base cost

    // Example: if token is 30 days old, multiplier is 0.01*30 = 0.3. Cost = BASE * (1 + 0.3)
    // If token is 300 days old, 0.01*300 = 3. Cost = BASE * (1 + 3) = BASE * 4 (capped)
    const ageBasedMultiplier = Math.min(
      tokenAgeInDays * ageFactorMultiplier,
      maxAgeFactorEffect - 1,
    );
    const cost = BASE_AI_TA_CREDIT_COST * (1 + ageBasedMultiplier);
    return Math.ceil(cost);
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard, TokenGatedGuard)
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_AI_TA)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getAiAnalysis(
    @Body() requestDto: AiAnalysisRequestDto,
    @CurrentUser() user: UserEntity,
  ): Promise<ChartWhispererOutput> {
    this.logger.log(
      `User ${user.id} attempting AI analysis for token ${requestDto.tokenAddress} with timeframe ${requestDto.timeframe}`,
    );

    let tokenEntity;
    let tokenAgeInDays: number;
    try {
      tokenEntity = await this.tokensService.getTokenData(
        requestDto.tokenAddress,
      );
      if (!tokenEntity?.name || !tokenEntity?.creationTime) {
        throw new NotFoundException(
          `Token data (name/creation time) for ${requestDto.tokenAddress} not found.`,
        );
      }
      const ageInMilliseconds = Date.now() - tokenEntity.creationTime.getTime();
      tokenAgeInDays = Math.max(0, ageInMilliseconds / (1000 * 60 * 60 * 24));
    } catch (error) {
      this.logger.warn(
        `Failed to fetch initial token data for ${requestDto.tokenAddress}: ${error.message}`,
      );
      if (error instanceof NotFoundException)
        throw new BadRequestException(
          `Invalid token address or essential token data not found: ${requestDto.tokenAddress}.`,
        );
      throw new InternalServerErrorException(
        'Failed to retrieve token information for analysis setup.',
      );
    }

    const calculatedCreditCost = this.calculateAiTaCreditCost(tokenAgeInDays);
    this.logger.log(
      `Calculated credit cost for AI analysis of ${requestDto.tokenAddress} (age: ${tokenAgeInDays.toFixed(0)} days): ${calculatedCreditCost} credits`,
    );

    try {
      await this.creditsService.deductCredits(
        user.id,
        calculatedCreditCost,
        `AI technical analysis for token ${requestDto.tokenAddress}`,
      );
      this.logger.log(
        `Successfully deducted ${calculatedCreditCost} credits from user ${user.id} for AI analysis.`,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        error.message === 'Insufficient credits.'
      ) {
        this.logger.log(
          `User ${user.id} has insufficient credits. Required: ${calculatedCreditCost}. Error: ${error.message}`,
        );
        throw new ForbiddenException(
          'Insufficient credits to perform AI analysis.',
        );
      }
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(
        `Error during credit deduction for user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error processing credits for AI analysis.',
      );
    }

    this.logger.log(
      `Credit check passed. Calling orchestrator for AI analysis for token ${requestDto.tokenAddress}.`,
    );

    const { analysisOutput } =
      await this.tokenAiTechnicalAnalysisService.prepareAndExecuteAnalysis(
        requestDto,
        tokenEntity.name,
        tokenAgeInDays,
      );

    return analysisOutput;
  }
}
