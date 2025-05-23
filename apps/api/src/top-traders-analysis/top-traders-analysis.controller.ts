import {
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MIN_TOKEN_HOLDING_FOR_TOP_TRADERS } from '../common/constants';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { TopTradersResponse } from './dto/top-trader.dto';
import { TopTradersAnalysisService } from './top-traders-analysis.service';

const CREDIT_COST_TOP_TRADERS = 3;

@Controller('top-traders-analysis')
@UseGuards(AuthGuard)
export class TopTradersAnalysisController {
  private readonly logger = new Logger(TopTradersAnalysisController.name);

  constructor(
    private readonly topTradersAnalysisService: TopTradersAnalysisService,
    private readonly usersService: UsersService,
    private readonly creditsService: CreditsService,
  ) {}

  @Get(':tokenAddress')
  async getTopTraders(
    @Param('tokenAddress', SolanaAddressPipe) tokenAddress: string,
    @CurrentUser() user: UserEntity,
  ): Promise<TopTradersResponse> {
    try {
      // Check user's platform token balance
      const userBalanceData =
        await this.usersService.getUserPlatformTokenBalance(user.id);
      const hasEnoughTokens =
        userBalanceData.balance >= MIN_TOKEN_HOLDING_FOR_TOP_TRADERS;

      if (hasEnoughTokens) {
        return await this.topTradersAnalysisService.getTopTraders(tokenAddress);
      }

      // Check if user has enough credits
      const userCredits = await this.creditsService.getUserBalance(user.id);
      if (userCredits < CREDIT_COST_TOP_TRADERS) {
        throw new ForbiddenException({
          message: 'Insufficient credits for top traders analysis',
          requiredCredits: CREDIT_COST_TOP_TRADERS,
          userCredits,
        });
      }

      // Deduct credits and perform analysis
      await this.creditsService.deductCredits(
        user.id,
        CREDIT_COST_TOP_TRADERS,
        'Top Traders Analysis',
      );

      return await this.topTradersAnalysisService.getTopTraders(tokenAddress);
    } catch (error) {
      this.logger.error(
        `Top Traders Analysis failed for token ${tokenAddress}:`,
        error.message,
      );

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Top Traders Analysis failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':tokenAddress/cost')
  async getTopTradersCost(): Promise<{ cost: number }> {
    return { cost: CREDIT_COST_TOP_TRADERS };
  }
}
