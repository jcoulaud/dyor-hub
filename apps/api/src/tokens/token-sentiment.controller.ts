import { TokenSentimentStats } from '@dyor-hub/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SolanaAddressPipe } from '../common/pipes/solana-address.pipe';
import { UserEntity } from '../entities/user.entity';
import { UpdateSentimentDto } from './dto/update-sentiment.dto';
import { TokenSentimentService } from './token-sentiment.service';

@Controller('tokens/:mintAddress/sentiment')
export class TokenSentimentController {
  constructor(private readonly tokenSentimentService: TokenSentimentService) {}

  @Get()
  async getSentimentStats(
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
    @CurrentUser() user?: UserEntity,
  ): Promise<TokenSentimentStats> {
    return this.tokenSentimentService.getSentimentStats(mintAddress, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async addOrUpdateSentiment(
    @CurrentUser() user: UserEntity,
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
    @Body() body: UpdateSentimentDto,
  ) {
    await this.tokenSentimentService.addOrUpdateSentiment(
      user.id,
      mintAddress,
      body.sentimentType,
    );
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async removeSentiment(
    @CurrentUser() user: UserEntity,
    @Param('mintAddress', SolanaAddressPipe) mintAddress: string,
  ) {
    await this.tokenSentimentService.removeSentiment(user.id, mintAddress);
    return { success: true };
  }
}
