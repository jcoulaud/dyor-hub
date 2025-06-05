import {
  SentimentAnalysisRequest,
  SentimentAnalysisResponse,
} from '@dyor-hub/types';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { SentimentAnalysisService } from './sentiment-analysis.service';

@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  private readonly logger = new Logger(SentimentAnalysisController.name);

  constructor(
    private readonly sentimentAnalysisService: SentimentAnalysisService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeSentiment(
    @Body() request: SentimentAnalysisRequest,
  ): Promise<SentimentAnalysisResponse> {
    this.logger.log(`Sentiment analysis requested for @${request.username}`);

    // Validation
    if (!request.username) {
      throw new BadRequestException('Username is required');
    }

    if (request.username.startsWith('@')) {
      request.username = request.username.substring(1);
    }

    try {
      const result =
        await this.sentimentAnalysisService.analyzeSentiment(request);

      this.logger.log(
        `Sentiment analysis completed for @${request.username}. Overall sentiment: ${result.profile.overallSentiment.overall.toFixed(2)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to analyze sentiment for @${request.username}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
