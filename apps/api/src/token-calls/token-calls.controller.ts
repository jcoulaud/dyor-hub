import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
  Res,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';
import { Stream } from 'stream';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentResponseDto } from '../comments/dto/comment-response.dto';
import { UserEntity } from '../entities';
import { CreateTokenCallDto } from './dto/create-token-call.dto';
import { TokenCallResponseDto } from './dto/token-call-response.dto';
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
  ): Promise<{ tokenCall: TokenCallResponseDto; comment: CommentResponseDto }> {
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
  async findOne(@Param('callId', ParseUUIDPipe) callId: string): Promise<{
    tokenCall: TokenCallResponseDto;
    comment: CommentResponseDto | null;
  }> {
    try {
      const call = await this.tokenCallsService.findOneById(callId);
      const tokenCall = plainToInstance(TokenCallResponseDto, call, {
        excludeExtraneousValues: true,
      });
      let comment: CommentResponseDto | null = null;
      if (call.explanationComment) {
        comment = plainToInstance(CommentResponseDto, call.explanationComment, {
          excludeExtraneousValues: true,
        });
      }
      return { tokenCall, comment };
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

  @Get(':callId/price-history')
  async getPriceHistory(@Param('callId') callId: string, @Res() res: Response) {
    try {
      const call = await this.tokenCallsService.findOneById(callId);

      if (!call?.priceHistoryUrl) {
        return res.status(404).json({ message: 'No price history found' });
      }

      const match = call.priceHistoryUrl.match(/amazonaws\.com\/(.+)$/);
      const key = match ? match[1] : null;

      if (!key) {
        return res.status(400).json({ message: 'Invalid S3 URL' });
      }

      const s3 = new S3Client({
        region: process.env.S3_REGION,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      });

      try {
        const s3Res = await s3.send(
          new GetObjectCommand({
            Bucket: process.env.S3_TOKEN_HISTORY_BUCKET!,
            Key: key,
          }),
        );

        res.setHeader('Content-Type', 'application/json');
        (s3Res.Body as Stream).pipe(res);
      } catch (s3Err) {
        this.logger.error(
          `getPriceHistory - S3 GetObject failed for key ${key}:`,
          s3Err.stack || s3Err.message,
        );
        if (s3Err.name === 'NoSuchKey') {
          return res
            .status(404)
            .json({ message: 'Price history file not found in S3' });
        } else if (s3Err.name === 'AccessDenied') {
          return res
            .status(403)
            .json({ message: 'Access denied fetching price history from S3' });
        } else {
          return res.status(500).json({
            message: 'Error fetching price history from storage',
          });
        }
      }
    } catch (generalErr) {
      this.logger.error(
        `getPriceHistory - Unexpected error for call ${callId}:`,
        generalErr.stack || generalErr.message,
      );
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
