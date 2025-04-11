import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../entities';
import { TokenCallEntity } from '../entities/token-call.entity';
import { CreateTokenCallDto } from './dto/create-token-call.dto';
import {
  PaginatedTokenCallsResult,
  TokenCallsService,
} from './token-calls.service';

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

  @Get()
  async findAllPublic(
    @Query('userId') userId?: string,
    @Query('tokenId') tokenId?: string,
    @Query('page') pageString = '1',
    @Query('limit') limitString = '20',
  ): Promise<PaginatedTokenCallsResult> {
    const page = parseInt(pageString, 10);
    const limit = parseInt(limitString, 10);

    if (isNaN(page) || page < 1) {
      throw new Error('Invalid page number');
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new Error('Invalid limit value (must be between 1 and 100)');
    }

    const filters = {
      ...(userId && { userId }),
      ...(tokenId && { tokenId }),
    };

    try {
      return this.tokenCallsService.findAllPublic({ page, limit }, filters);
    } catch (error) {
      this.logger.error(`Error fetching public token calls:`, error);
      throw new InternalServerErrorException('Could not fetch token calls.');
    }
  }

  @Get(':callId')
  async findOne(
    @Param('callId', ParseUUIDPipe) callId: string,
  ): Promise<TokenCallEntity> {
    try {
      return await this.tokenCallsService.findOneById(callId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Public call not found for ID ${callId}`);
        throw error;
      }
      this.logger.error(`Error fetching public call ${callId}:`, error);
      throw new InternalServerErrorException(
        `Failed to retrieve token call details.`,
      );
    }
  }
}
