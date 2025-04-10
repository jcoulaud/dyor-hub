import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../entities';
import { TokenCallEntity } from '../entities/token-call.entity';
import { CreateTokenCallDto } from './dto/create-token-call.dto';
import { TokenCallsService } from './token-calls.service';

@Controller('token-calls')
export class TokenCallsController {
  private readonly logger = new Logger(TokenCallsController.name);

  constructor(private readonly tokenCallsService: TokenCallsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTokenCallDto: CreateTokenCallDto,
    @CurrentUser() user: UserEntity,
  ): Promise<TokenCallEntity> {
    if (!user) {
      this.logger.error(
        'User object not found after auth guard. Auth configuration issue?',
      );
      throw new Error('Authentication error: User object missing.');
    }

    this.logger.log(
      `Received request to create token call from user ${user.id}`,
    );
    return this.tokenCallsService.create(createTokenCallDto, user.id);
  }
}
