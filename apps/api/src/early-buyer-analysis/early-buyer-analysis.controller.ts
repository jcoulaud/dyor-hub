import { EarlyBuyerInfo, TokenGatedErrorData } from '@dyor-hub/types';
import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseBoolPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DYORHUB_SYMBOL,
  MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS,
} from '../common/constants';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { EarlyBuyerAnalysisService } from './early-buyer-analysis.service';

const CREDIT_COST_EARLY_BUYERS = 1;

@Controller('early-buyer-analysis')
export class EarlyBuyerAnalysisController {
  constructor(
    private readonly earlyBuyerAnalysisService: EarlyBuyerAnalysisService,
    private readonly usersService: UsersService,
    private readonly creditsService: CreditsService,
  ) {}

  @Get(':mintAddress/cost')
  @HttpCode(HttpStatus.OK)
  async getEarlyBuyerInfoCost(): Promise<{ cost: number }> {
    return { cost: CREDIT_COST_EARLY_BUYERS };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':mintAddress')
  async getEarlyBuyerInfo(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
    @CurrentUser() user: UserEntity,
    @Query('useCredits', new DefaultValuePipe(false), ParseBoolPipe)
    useCredits: boolean,
  ): Promise<EarlyBuyerInfo | null> {
    if (!user) {
      throw new HttpException(
        'User not authenticated. JwtAuthGuard might not be effective.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userPlatformBalanceData =
      await this.usersService.getUserPlatformTokenBalance(user.id);
    const meetsTokenRequirement =
      userPlatformBalanceData.balance >= MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS;

    if (meetsTokenRequirement) {
      const result =
        await this.earlyBuyerAnalysisService.getEarlyBuyerInfo(mintAddress);
      return result || null;
    }

    if (useCredits) {
      const userCreditBalance = await this.creditsService.getUserBalance(
        user.id,
      );

      if (userCreditBalance >= CREDIT_COST_EARLY_BUYERS) {
        try {
          await this.creditsService.deductCredits(
            user.id,
            CREDIT_COST_EARLY_BUYERS,
            `Early Buyers Analysis for ${mintAddress}`,
          );
          const result =
            await this.earlyBuyerAnalysisService.getEarlyBuyerInfo(mintAddress);
          return result || null;
        } catch (error) {
          throw new HttpException(
            'An error occurred while processing your request with credits.',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      } else {
        throw new HttpException(
          {
            message: 'Insufficient credits to access this feature.',
            details: { code: 'INSUFFICIENT_CREDITS' },
          } as any,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    } else {
      const errorData: TokenGatedErrorData = {
        message: `Holding ${MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS.toLocaleString()} ${DYORHUB_SYMBOL} is required for free access, or enable credit usage.`,
        isTokenGated: true,
        requiredBalance: MIN_TOKEN_HOLDING_FOR_EARLY_BUYERS.toString(),
        currentBalance: userPlatformBalanceData.balance.toString(),
        requiredTokenSymbol: DYORHUB_SYMBOL,
      };
      throw new HttpException(errorData, HttpStatus.FORBIDDEN);
    }
  }
}
