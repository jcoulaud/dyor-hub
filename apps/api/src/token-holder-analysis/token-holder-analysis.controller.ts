import { TrackedWalletHolderStats } from '@dyor-hub/types';
import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
} from '@nestjs/common';
import { TokenHolderAnalysisService } from './token-holder-analysis.service';

@Controller('token-holder-analysis')
export class TokenHolderAnalysisController {
  private readonly logger = new Logger(TokenHolderAnalysisController.name);

  constructor(private readonly analysisService: TokenHolderAnalysisService) {}

  @Get(':tokenAddress')
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
