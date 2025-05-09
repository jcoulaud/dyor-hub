import { TrackedWalletHolderStats } from '@dyor-hub/types';
import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS,
  MIN_TOKEN_HOLDING_KEY,
} from '../common/constants';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { TokenHolderAnalysisService } from './token-holder-analysis.service';

@Controller('token-holder-analysis')
export class TokenHolderAnalysisController {
  private readonly logger = new Logger(TokenHolderAnalysisController.name);

  constructor(private readonly analysisService: TokenHolderAnalysisService) {}

  @Get(':tokenAddress')
  @UseGuards(JwtAuthGuard, TokenGatedGuard)
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS)
  async getTopHolderActivity(
    @Param('tokenAddress') tokenAddress: string,
  ): Promise<TrackedWalletHolderStats[]> {
    this.logger.log(
      `Received request for token holder analysis: ${tokenAddress}`,
    );

    if (!tokenAddress) {
      throw new BadRequestException(
        'Missing required parameter: tokenAddress.',
      );
    }

    return this.analysisService.getTopHolderWalletActivity(tokenAddress);
  }
}
