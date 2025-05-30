import {
  TokenHolderAnalysisParams,
  WalletAnalysisCount,
} from '@dyor-hub/types';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DYORHUB_CONTRACT_ADDRESS,
  MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS,
} from '../common/constants';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../entities/user.entity';
import { WalletsService } from '../wallets/wallets.service';
import { TokenHolderAnalysisService } from './token-holder-analysis.service';

@Controller('token-holder-analysis')
export class TokenHolderAnalysisController {
  private readonly logger = new Logger(TokenHolderAnalysisController.name);

  constructor(
    private readonly analysisService: TokenHolderAnalysisService,
    private readonly walletsService: WalletsService,
    private readonly configService: ConfigService,
    private readonly creditsService: CreditsService,
  ) {}

  @Get(':tokenAddress')
  @UseGuards(JwtAuthGuard)
  async getTopHolderActivity(
    @Param('tokenAddress', new SolanaAddressPipe()) tokenAddress: string,
    @CurrentUser() user: UserEntity,
    @Query() params: TokenHolderAnalysisParams,
  ): Promise<{ message: string; analysisJobId?: string }> {
    if (!tokenAddress) {
      throw new BadRequestException(
        'Missing required parameter: tokenAddress.',
      );
    }

    const walletCount = Number(params.walletCount);
    if (!walletCount || ![10, 20, 50].includes(walletCount)) {
      throw new BadRequestException(
        'Invalid walletCount. Must be 10, 20, or 50.',
      );
    }

    const { sessionId } = params;
    let isEligibleForFreeTier = false;
    let effectiveCreditCost = 0;
    let creditsAlreadyDeducted = false;

    const dyorhubTokenAddress =
      this.configService.get<string>('DYORHUB_CONTRACT_ADDRESS') ||
      DYORHUB_CONTRACT_ADDRESS;
    const minHoldingForFreeTier =
      this.configService.get<number>(
        'MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS',
      ) || MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS;

    // Check if user is eligible for free tier
    try {
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
            `User ${user.id} eligible for free Holder Analysis. Balance: ${currentBalanceNum}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking token balance for Holder Analysis free tier for user ${user.id}: ${error.message}`,
        error.stack,
      );
    }

    const calculatedCost =
      await this.analysisService.calculateAnalysisCreditCost(
        tokenAddress,
        walletCount as WalletAnalysisCount,
      );

    if (isEligibleForFreeTier) {
      effectiveCreditCost = 0;
    } else {
      effectiveCreditCost = calculatedCost;

      // Check if user has enough credits and deduct them immediately
      const userCreditBalance = await this.creditsService.getUserBalance(
        user.id,
      );

      if (userCreditBalance < effectiveCreditCost) {
        throw new ForbiddenException({
          message: 'Insufficient credits for Holder Analysis.',
          details: { code: 'INSUFFICIENT_CREDITS' },
        });
      }

      // Deduct credits immediately
      try {
        await this.creditsService.deductCredits(
          user.id,
          effectiveCreditCost,
          `Diamond Hands Analysis for ${tokenAddress} (${walletCount} wallets)`,
        );
        creditsAlreadyDeducted = true;
      } catch (error) {
        this.logger.error(
          `Failed to deduct ${effectiveCreditCost} credits for Holder Analysis for user ${user.id}: ${error.message}`,
        );

        const errorMessage = error.message?.toLowerCase();
        if (errorMessage?.includes('insufficient')) {
          throw new ForbiddenException({
            message: 'Insufficient credits for Holder Analysis.',
            details: { code: 'INSUFFICIENT_CREDITS' },
          });
        } else {
          throw new InternalServerErrorException(
            'Failed to process credit payment for analysis.',
          );
        }
      }
    }

    try {
      return await this.analysisService.getTopHolderWalletActivity(
        user.id,
        tokenAddress,
        walletCount as WalletAnalysisCount,
        effectiveCreditCost,
        isEligibleForFreeTier,
        sessionId,
      );
    } catch (analysisError) {
      // If we already deducted credits and the analysis fails, refund them
      if (creditsAlreadyDeducted && effectiveCreditCost > 0) {
        this.logger.warn(
          `Analysis failed for user ${user.id}, refunding ${effectiveCreditCost} credits. Error: ${analysisError.message}`,
        );

        try {
          await this.creditsService.addCreditsManually(
            user.id,
            effectiveCreditCost,
            `Refund for failed Diamond Hands Analysis: ${tokenAddress}`,
          );
        } catch (refundError) {
          this.logger.error(
            `CRITICAL: Failed to refund ${effectiveCreditCost} credits to user ${user.id} after analysis failure: ${refundError.message}`,
            refundError.stack,
          );
        }
      }
      throw analysisError;
    }
  }

  @Get(':tokenAddress/credit-cost')
  @UseGuards(JwtAuthGuard)
  async getCreditCost(
    @Param('tokenAddress', new SolanaAddressPipe()) tokenAddress: string,
    @Query('walletCount') walletCountQuery: string,
  ): Promise<{ creditCost: number }> {
    if (!tokenAddress) {
      throw new BadRequestException(
        'Missing required parameter: tokenAddress.',
      );
    }

    const count = Number(walletCountQuery);
    if (!count || ![10, 20, 50].includes(count)) {
      throw new BadRequestException(
        'Invalid walletCount. Must be 10, 20, or 50.',
      );
    }

    const creditCost = await this.analysisService.calculateAnalysisCreditCost(
      tokenAddress,
      count as WalletAnalysisCount,
    );

    return { creditCost };
  }
}
