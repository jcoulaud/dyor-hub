import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { CommentEntity } from '../../entities/comment.entity';
import { sanitizeHtml } from '../../utils/utils';

@Injectable()
export class TelegramAdminService implements OnModuleInit {
  private readonly logger = new Logger(TelegramAdminService.name);
  private bot: Telegraf<any>;
  private enabled = false;
  private chatId: string;
  private readonly appUrl: string;
  private readonly defaultAppUrl: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    const configuredUrl = this.configService.get<string>('CLIENT_URL') || '';
    this.defaultAppUrl =
      this.configService.get<string>('DEFAULT_APP_URL') || '';
    this.appUrl = this.getValidUrl(configuredUrl);
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (token && this.chatId && isProduction) {
      this.bot = new Telegraf(token);
      this.enabled = true;
      this.logger.log('Telegram admin notifications enabled for production');
    } else if (token && this.chatId && !isProduction) {
      this.logger.warn(
        'Telegram admin notifications disabled in non-production environment.',
      );
    } else {
      this.logger.warn(
        'Telegram admin notifications disabled. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env and run in production mode to enable.',
      );
    }
  }

  onModuleInit() {
    // Required by the OnModuleInit interface
  }

  private getValidUrl(url: string): string {
    if (!url) {
      return this.defaultAppUrl;
    }

    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return this.defaultAppUrl;
    }

    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }

    if (!url.startsWith('https://')) {
      return `https://${url}`;
    }

    return url;
  }

  async notifyNewComment(comment: CommentEntity): Promise<void> {
    if (!this.enabled) return;

    const sanitizedContent = sanitizeHtml(comment.content);
    const truncatedContent =
      sanitizedContent.length > 100
        ? `${sanitizedContent.substring(0, 100)}...`
        : sanitizedContent;

    const displayName = sanitizeHtml(
      comment.user?.displayName || comment.userId,
    );

    const message = `
🆕 <b>Comment</b>
👤 <b>User:</b> ${displayName}
💎 <b>Symbol:</b> ${comment.token.symbol}
📝 <b>CA:</b> ${comment.tokenMintAddress}
💬 <b>Content:</b> ${truncatedContent}
⏰ <b>Posted:</b> ${new Date(comment.createdAt).toLocaleString()}
`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '🔗 View Comment',
            url: `${this.appUrl}/tokens/${comment.tokenMintAddress}/comments/${comment.id}`,
          },
        ],
      ],
    };

    await this.sendMessage(message, inlineKeyboard);
  }

  async sendMessage(text: string, inlineKeyboard?: any): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.bot.telegram.sendMessage(this.chatId, text, {
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      });
    } catch (error) {
      this.logger.error('Failed to send message to Telegram', error);
      if (error instanceof Error) {
        this.logger.error(`Error message: ${error.message}`);
      }
    }
  }
}
