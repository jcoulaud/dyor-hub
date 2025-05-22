import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { OrchestrationResult } from '../token-ai-technical-analysis/token-ai-technical-analysis.service';
import { TwitterAutomationService } from './twitter-automation.service';

@Controller('twitter-automation')
export class TwitterAutomationController {
  private readonly logger = new Logger(TwitterAutomationController.name);

  constructor(
    private readonly twitterAutomationService: TwitterAutomationService,
  ) {}

  @Get('trigger-daily-post')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async triggerDailyPost() {
    this.logger.log(
      'Manually triggering daily Twitter post via /trigger-daily-post endpoint (will post to Twitter)...',
    );
    await this.twitterAutomationService.handleDailyTwitterPost(true);
    return {
      message:
        'Daily Twitter post job triggered (if enabled and token found). Attempting to post.',
    };
  }

  @Get('development-analysis-preview')
  @UseGuards(AdminGuard)
  async getDevelopmentAnalysisPreview(): Promise<
    OrchestrationResult | { message: string } | null
  > {
    this.logger.log(
      'Fetching development analysis preview via /development-analysis-preview endpoint (will NOT post to Twitter)...',
    );
    const analysisResult =
      await this.twitterAutomationService.handleDailyTwitterPost(false);

    if (!analysisResult) {
      return {
        message:
          'Could not generate analysis preview. Check logs for details (e.g., no suitable token found or analysis error).',
      };
    }
    return analysisResult as OrchestrationResult;
  }
}
