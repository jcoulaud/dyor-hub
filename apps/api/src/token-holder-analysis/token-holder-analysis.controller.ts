import {
  TokenHolderAnalysisParams,
  WalletAnalysisCount,
} from '@dyor-hub/types';
import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS,
  MIN_TOKEN_HOLDING_KEY,
} from '../common/constants';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { UserEntity } from '../entities/user.entity';
import { TokenHolderAnalysisService } from './token-holder-analysis.service';

@Controller('token-holder-analysis')
export class TokenHolderAnalysisController {
  private readonly logger = new Logger(TokenHolderAnalysisController.name);

  constructor(private readonly analysisService: TokenHolderAnalysisService) {}

  @Get(':tokenAddress')
  @UseGuards(JwtAuthGuard, TokenGatedGuard)
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS)
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

    return this.analysisService.getTopHolderWalletActivity(
      user.id,
      tokenAddress,
      walletCount as WalletAnalysisCount,
      sessionId,
    );
  }

  @Get(':tokenAddress/credit-cost')
  @UseGuards(JwtAuthGuard, TokenGatedGuard)
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS)
  async getCreditCost(
    @Param('tokenAddress', new SolanaAddressPipe()) tokenAddress: string,
    @Query('walletCount') walletCount: string,
  ): Promise<{ creditCost: number }> {
    if (!tokenAddress) {
      throw new BadRequestException(
        'Missing required parameter: tokenAddress.',
      );
    }

    const count = Number(walletCount);
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
