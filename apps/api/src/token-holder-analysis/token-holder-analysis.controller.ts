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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MIN_TOKEN_HOLDING_FOR_HOLDERS_ANALYSIS,
  MIN_TOKEN_HOLDING_KEY,
} from '../common/constants';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
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
    @Param('tokenAddress') tokenAddress: string,
    @CurrentUser() user: UserEntity,
  ): Promise<TrackedWalletHolderStats[]> {
    this.logger.log(
      `User ${user.id} requested token holder analysis: ${tokenAddress}`,
    );

    if (!tokenAddress) {
      throw new BadRequestException(
        'Missing required parameter: tokenAddress.',
      );
    }

    return this.analysisService.getTopHolderWalletActivity(
      user.id,
      tokenAddress,
    );
  }
}
