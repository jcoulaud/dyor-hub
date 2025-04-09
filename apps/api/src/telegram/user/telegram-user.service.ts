import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import TelegramBot, { Update } from 'node-telegram-bot-api';
import { Repository } from 'typeorm';
import { TelegramUserConnectionEntity } from '../../entities/telegram-user-connection.entity';

@Injectable()
export class TelegramUserService implements OnModuleInit {
  private readonly logger = new Logger(TelegramUserService.name);
  private bot: TelegramBot;
  private enabled = false;
  private readonly defaultAppUrl: string;
  private webhookUrl: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(TelegramUserConnectionEntity)
    private readonly telegramUserRepository: Repository<TelegramUserConnectionEntity>,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.defaultAppUrl =
      this.configService.get<string>('DEFAULT_APP_URL') || '';
    this.webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');

    if (!token) {
      this.logger.warn(
        'User Telegram notifications disabled. Set TELEGRAM_BOT_TOKEN in .env to enable.',
      );
      this.enabled = false;
      return;
    }

    if (!this.webhookUrl) {
      this.logger.warn(
        'TELEGRAM_WEBHOOK_URL not set. Telegram bot updates via webhook will not work.',
      );
      this.enabled = false;
      return;
    }

    try {
      this.bot = new TelegramBot(token);
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot instance', error);
      this.enabled = false;
    }
  }

  async onModuleInit() {
    if (!this.bot || !this.webhookUrl) {
      this.logger.warn(
        'Skipping webhook setup in onModuleInit (bot/URL not ready).',
      );
      return;
    }

    const webhookPath = '/telegram/webhook';
    const fullWebhookUrl = `${this.webhookUrl}${webhookPath}`;

    try {
      this.logger.log(`Attempting to set webhook to: ${fullWebhookUrl}`);
      const success = await this.bot.setWebHook(fullWebhookUrl);

      if (success) {
        this.logger.log(`Telegram webhook set successfully: ${fullWebhookUrl}`);
        this.enabled = true;
      } else {
        this.logger.error(`Failed to set Telegram webhook: ${fullWebhookUrl}`);
        this.enabled = false;
      }
    } catch (error) {
      this.logger.error(
        `Error during webhook setup process in onModuleInit (URL: ${fullWebhookUrl})`,
        error,
      );
      this.enabled = false;
    }
  }

  async handleWebhookUpdate(update: Update): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (update.message) {
      const { message } = update;
      const chatId = message.chat.id;
      const text = message.text;

      const deepLinkMatch = text?.match(
        /^\/start(?:@\w+)?\s+connect_([a-f0-9]+)$/,
      );
      if (deepLinkMatch && deepLinkMatch[1]) {
        const token = deepLinkMatch[1];
        this.logger.log(`Webhook: Deep link token extracted: ${token}`);
        await this.processConnectionToken(message, token);
        return;
      }

      if (text?.match(/^\/start(?:@\w+)?$/)) {
        await this.sendWelcomeMessage(chatId);
        return;
      }

      if (text?.match(/^\/disconnect(?:@\w+)?$/)) {
        await this.handleDisconnectCommand(message);
        return;
      }

      if (text?.match(/^\/status(?:@\w+)?$/)) {
        await this.handleStatusCommand(message);
        return;
      }

      if (text?.match(/^\/help(?:@\w+)?$/)) {
        await this.handleHelpCommand(message);
        return;
      }

      const connectMatch = text?.match(/^\/connect(?:@\w+)?\s+(.+)$/);
      if (connectMatch && connectMatch[1]) {
        const token = connectMatch[1].trim();
        await this.processConnectionToken(message, token);
        return;
      }
    } else {
      this.logger.log(
        `Webhook: Received non-message update type: ${Object.keys(update).join(', ')}`,
      );
    }
  }

  private async handleDisconnectCommand(msg: TelegramBot.Message) {
    const chatId = msg.chat.id.toString();

    try {
      const connection = await this.telegramUserRepository.findOne({
        where: { telegramChatId: chatId },
      });

      if (!connection) {
        this.logger.log(`No connection found for chat ID: ${chatId}`);
        await this.bot.sendMessage(
          chatId,
          'No connected account found. Use /connect [token] to connect your DYOR Hub account.',
        );
        return;
      }

      await this.telegramUserRepository.remove(connection);

      await this.bot.sendMessage(
        chatId,
        '🔄 Your DYOR Hub account has been disconnected from this Telegram account.',
      );
    } catch (error) {
      this.logger.error(
        `Failed to disconnect Telegram account: ${error.message}`,
        error,
      );
      await this.bot.sendMessage(
        chatId,
        'Sorry, there was an error disconnecting your account. Please try again later.',
      );
    }
  }

  private async handleStatusCommand(msg: TelegramBot.Message) {
    const chatId = msg.chat.id.toString();

    try {
      const connection = await this.telegramUserRepository.findOne({
        where: { telegramChatId: chatId },
        relations: ['user'],
      });

      if (!connection) {
        this.logger.log(`No connection found for chat ID: ${chatId}`);
        await this.bot.sendMessage(
          chatId,
          'ℹ️ Status: Not connected\n\nUse /connect [token] to connect your DYOR Hub account.',
        );
        return;
      }

      await this.bot.sendMessage(
        chatId,
        `✅ Status: Connected\n\n` +
          `Connected to: ${connection.user.displayName}\n` +
          `Connected since: ${connection.createdAt.toLocaleDateString()}\n\n` +
          `Use /disconnect to disconnect this bot from your DYOR hub account.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to check Telegram connection status: ${error.message}`,
        error,
      );
      await this.bot.sendMessage(
        chatId,
        'Sorry, there was an error checking your connection status. Please try again later.',
      );
    }
  }

  private async handleHelpCommand(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    try {
      await this.bot.sendMessage(
        chatId,
        `🔹 <b>Available Commands</b> 🔹\n\n` +
          `/start - Start the bot and get connection info\n` +
          `/connect [token] - Connect your DYOR Hub account using a token\n` +
          `/disconnect - Disconnect your DYOR Hub account\n` +
          `/status - Check your connection status\n` +
          `/help - Show this help message\n\n` +
          `To receive notifications, make sure you've enabled Telegram notifications in your DYOR Hub notification settings.`,
        {
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send help message: ${error.message}`, error);
      await this.bot.sendMessage(
        chatId,
        'Sorry, there was an error sending the help message. Please try again later.',
      );
    }
  }

  async generateConnectionToken(userId: string): Promise<string> {
    try {
      let connection = await this.telegramUserRepository.findOne({
        where: { userId },
      });

      const token = randomBytes(16).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      if (connection) {
        connection.connectionToken = token;
        connection.tokenExpiresAt = expiresAt;
        connection.connectionStatus = 'pending';
        connection.telegramChatId = null;
        connection.telegramUsername = null;
        connection.telegramFirstName = null;
      } else {
        connection = this.telegramUserRepository.create({
          userId,
          connectionToken: token,
          tokenExpiresAt: expiresAt,
          connectionStatus: 'pending',
          telegramChatId: null,
        });
      }

      await this.telegramUserRepository.save(connection);
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to generate connection token for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async hasActiveConnection(userId: string): Promise<boolean> {
    try {
      const connection = await this.telegramUserRepository.findOne({
        where: {
          userId,
          connectionStatus: 'active',
        },
      });
      return !!connection;
    } catch (error) {
      this.logger.error(
        `Failed to check connection status for user ${userId}`,
        error,
      );
      return false;
    }
  }

  async getUserConnection(
    userId: string,
  ): Promise<TelegramUserConnectionEntity | null> {
    try {
      return await this.telegramUserRepository.findOne({
        where: { userId },
      });
    } catch (error) {
      this.logger.error(`Failed to get connection for user ${userId}`, error);
      return null;
    }
  }

  async disconnectUser(userId: string): Promise<boolean> {
    try {
      const connection = await this.telegramUserRepository.findOne({
        where: { userId },
      });

      if (connection) {
        await this.telegramUserRepository.remove(connection);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to disconnect user ${userId}`, error);
      return false;
    }
  }

  async sendNotificationToUser(
    userId: string,
    message: string,
    inlineKeyboard?: any,
  ): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const connection = await this.telegramUserRepository.findOne({
        where: {
          userId,
          connectionStatus: 'active',
        },
      });

      if (!connection || !connection.telegramChatId) {
        return false;
      }

      await this.bot.sendMessage(connection.telegramChatId, message, {
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram notification to user ${userId}`,
        error,
      );
      return false;
    }
  }

  private async processConnectionToken(
    msg: TelegramBot.Message,
    token: string,
  ) {
    this.logger.log(`Processing connection with token: ${token}`);
    const chatId = msg.chat.id;

    try {
      const connection = await this.telegramUserRepository.findOne({
        where: { connectionToken: token },
      });

      if (!connection) {
        this.logger.warn(`No connection found for token: ${token}`);
        await this.bot.sendMessage(
          chatId,
          'Invalid or expired connection token. Please generate a new token from your DYOR Hub notification settings.',
        );
        return;
      }

      if (connection.tokenExpiresAt && new Date() > connection.tokenExpiresAt) {
        await this.bot.sendMessage(
          chatId,
          'Your connection token has expired. Please generate a new token from your DYOR Hub notification settings.',
        );
        return;
      }

      connection.telegramChatId = chatId.toString();
      connection.telegramUsername = msg.chat.username || null;
      connection.telegramFirstName = msg.chat.first_name || null;
      connection.connectionStatus = 'active';
      connection.connectionToken = null;
      connection.tokenExpiresAt = null;

      await this.telegramUserRepository.save(connection);

      await this.bot.sendMessage(
        chatId,
        '✅ Your DYOR hub account is now connected! You will receive notifications based on your preferences.',
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect Telegram account through deep link',
        error,
      );
      await this.bot.sendMessage(
        chatId,
        'Sorry, there was an error connecting your account. Please try again later.',
      );
    }
  }

  private async sendWelcomeMessage(chatId: number) {
    await this.bot.sendMessage(
      chatId,
      `👋 Welcome to the DYOR Hub Notification Bot!\n\n` +
        `To connect this bot to your DYOR Hub account, visit your notification settings page and click the "Connect Telegram" button.\n\n` +
        `Once connected, you'll receive notifications here based on your preferences.`,
      {
        parse_mode: 'HTML',
      },
    );
  }
}
