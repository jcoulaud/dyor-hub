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
import { TokensService } from '../tokens/tokens.service';
import { AiAnalysisRequestDto } from './dto/ai-analysis-request.dto';
import { TokenAiTechnicalAnalysisService } from './token-ai-technical-analysis.service';

const BASE_AI_TA_CREDIT_COST = 2;

@Controller('token-ai-technical-analysis')
export class TokenAiTechnicalAnalysisController {
  private readonly logger = new Logger(TokenAiTechnicalAnalysisController.name);

  constructor(
    private readonly tokenAiTechnicalAnalysisService: TokenAiTechnicalAnalysisService,
    private readonly creditsService: CreditsService,
    private readonly tokensService: TokensService,
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

    return { creditCost };
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
    const { tokenAddress, timeFrom, timeTo } = aiAnalysisRequestDto;

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

    const userBalance = await this.creditsService.getUserBalance(user.id);
    const hasEnoughCredits = userBalance >= creditCost;

    if (!hasEnoughCredits) {
      this.logger.warn(
        `User ${user.id} has insufficient credits for AI Trading Analysis. Required: ${creditCost}, Balance: ${userBalance}`,
      );
      throw new ForbiddenException(
        'Insufficient credits for AI Trading Analysis.',
      );
    }

    try {
      const analysisResult: any =
        await this.tokenAiTechnicalAnalysisService.prepareAndExecuteAnalysis(
          aiAnalysisRequestDto,
          tokenName,
          tokenAgeInDays,
        );

      try {
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
      throw new InternalServerErrorException(
        'An error occurred while performing the AI trading analysis.',
      );
    }
  }
}
