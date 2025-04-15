import {
  PaginatedTokenCallsResult,
  TokenCallSortBy,
  TokenCallStatus,
} from '@dyor-hub/types';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseArrayPipe,
  ParseEnumPipe,
  ParseIntPipe,
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
import { TokenCallFilters, TokenCallsService } from './token-calls.service';

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

    return this.tokenCallsService.create(createTokenCallDto, user.id);
  }

  @Get()
  async findAllPublic(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('username') username?: string,
    @Query('userId') userId?: string,
    @Query('tokenId') tokenId?: string,
    @Query('tokenSearch') tokenSearch?: string,
    @Query(
      'status',
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    status?: TokenCallStatus[],
    @Query('callStartDate') callStartDate?: string,
    @Query('callEndDate') callEndDate?: string,
    @Query('targetStartDate') targetStartDate?: string,
    @Query('targetEndDate') targetEndDate?: string,
    @Query(
      'sortBy',
      new DefaultValuePipe(TokenCallSortBy.CREATED_AT),
      new ParseEnumPipe(TokenCallSortBy, { optional: true }),
    )
    sortBy?: TokenCallSortBy,
    @Query(
      'sortOrder',
      new DefaultValuePipe('DESC'),
      new ParseEnumPipe(['ASC', 'DESC'], { optional: true }),
    )
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedTokenCallsResult> {
    if (limit > 100) {
      limit = 100;
    }

    const filters: TokenCallFilters = {
      ...(username && { username }),
      ...(userId && { userId }),
      ...(tokenId && { tokenId }),
      ...(tokenSearch && { tokenSearch }),
      ...(status && { status }),
      ...(callStartDate && { callStartDate }),
      ...(callEndDate && { callEndDate }),
      ...(targetStartDate && { targetStartDate }),
      ...(targetEndDate && { targetEndDate }),
    };

    const sort = { sortBy, sortOrder };

    try {
      return this.tokenCallsService.findAllPublic(
        { page, limit },
        filters,
        sort,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching public token calls: ${error.message}`,
        error.stack,
      );
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
