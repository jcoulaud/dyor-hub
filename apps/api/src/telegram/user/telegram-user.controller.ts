import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Adjust path if needed
import { TelegramUserService } from './telegram-user.service';

// Define a type for the authenticated request
interface AuthenticatedRequest extends Request {
  user: {
    id: string; // Assuming your JWT payload has a user object with an id
  };
}

@Controller('telegram/user')
@UseGuards(JwtAuthGuard)
export class TelegramUserController {
  constructor(private readonly telegramUserService: TelegramUserService) {}

  @Post('generate-token')
  async generateToken(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ token: string }> {
    const userId = req.user.id;
    try {
      const token =
        await this.telegramUserService.generateConnectionToken(userId);
      return { token };
    } catch (error) {
      throw new Error('Failed to generate Telegram connection token');
    }
  }

  @Get('status')
  async getStatus(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const connection = await this.telegramUserService.getUserConnection(userId);

    return {
      isConnected: !!(connection && connection.connectionStatus === 'active'),
      status: connection?.connectionStatus ?? 'disconnected',
      connectedUsername: connection?.telegramUsername ?? null,
      connectedFirstName: connection?.telegramFirstName ?? null,
      connectedAt: connection?.createdAt ?? null,
    };
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@Req() req: AuthenticatedRequest): Promise<void> {
    const userId = req.user.id;
    const disconnected = await this.telegramUserService.disconnectUser(userId);
    if (!disconnected) {
      throw new NotFoundException(
        'No active Telegram connection found for this user.',
      );
    }
  }
}
