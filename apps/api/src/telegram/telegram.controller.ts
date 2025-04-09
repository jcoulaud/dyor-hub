import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { Update } from 'node-telegram-bot-api';
import { Public } from '../auth/decorators/public.decorator';
import { TelegramUserService } from './user/telegram-user.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramUserService: TelegramUserService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() update: Update): Promise<void> {
    this.telegramUserService.handleWebhookUpdate(update).catch((error) => {
      this.logger.error(
        'Error processing Telegram update asynchronously:',
        error,
      );
    });
    return;
  }
}
