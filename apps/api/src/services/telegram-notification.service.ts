import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { CommentEntity } from '../entities/comment.entity';

@Injectable()
export class TelegramNotificationService implements OnModuleInit {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private bot: TelegramBot;
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

    if (token && this.chatId) {
      this.bot = new TelegramBot(token, { polling: false });
      this.enabled = true;
      this.logger.log('Telegram admin notifications enabled');
    } else {
      this.logger.warn(
        'Telegram admin notifications disabled. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable.',
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

  private sanitizeHtml(text: string): string {
    if (!text) return '';

    const withoutTags = text.replace(/<\/?[^>]+(>|$)/g, '');

    return withoutTags
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async notifyNewComment(comment: CommentEntity): Promise<void> {
    if (!this.enabled) return;

    const sanitizedContent = this.sanitizeHtml(comment.content);
    const truncatedContent =
      sanitizedContent.length > 100
        ? `${sanitizedContent.substring(0, 100)}...`
        : sanitizedContent;

    const displayName = this.sanitizeHtml(
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
            url: `${this.appUrl}/tokens/${comment.tokenMintAddress}?comment=${comment.id}`,
          },
        ],
      ],
    };

    await this.sendMessage(message, inlineKeyboard);
  }

  async sendMessage(text: string, inlineKeyboard?: any): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.bot.sendMessage(this.chatId, text, {
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
