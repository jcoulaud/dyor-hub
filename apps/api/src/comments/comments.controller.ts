import { CreateCommentDto, UpdateCommentDto, VoteType } from '@dyor-hub/types';
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { CommentsService } from './comments.service';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CommentThreadResponseDto } from './dto/comment-thread-response.dto';
import { LatestCommentResponseDto } from './dto/latest-comment-response.dto';
import { VoteResponseDto } from './dto/vote-response.dto';

@Controller('comments')
@UseInterceptors(ClassSerializerInterceptor)
export class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  async getComments(
    @Query('tokenMintAddress') tokenMintAddress: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @CurrentUser() user?: { id: string },
  ): Promise<{
    data: CommentResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const comments = await this.commentsService.findByTokenMintAddress(
      tokenMintAddress,
      user?.id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );

    if (!comments?.data || !comments?.meta) {
      return {
        data: [],
        meta: {
          total: 0,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: 0,
        },
      };
    }

    return {
      data: comments.data.map((comment) =>
        plainToInstance(CommentResponseDto, comment, {
          excludeExtraneousValues: true,
        }),
      ),
      meta: comments.meta,
    };
  }

  @Get('latest')
  @UseGuards(OptionalAuthGuard)
  async getLatestComments(
    @Query('limit') limit = '5',
  ): Promise<LatestCommentResponseDto[]> {
    const comments = await this.commentsService.findLatestComments(
      parseInt(limit, 10),
    );

    return comments.map((comment) =>
      plainToInstance(LatestCommentResponseDto, comment, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async getCommentById(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string },
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.findById(id, user?.id);

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: { id: string },
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.create(
      createCommentDto,
      user.id,
    );

    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: { id: string },
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.update(id, dto, user.id);
    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.delete(id, user.id);
    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/remove')
  @UseGuards(AuthGuard)
  async removeComment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; isAdmin: boolean },
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.removeComment(
      id,
      user.id,
      user.isAdmin,
    );
    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/vote')
  @UseGuards(AuthGuard)
  async vote(
    @Param('id') id: string,
    @Body('type') type: VoteType,
    @CurrentUser() user: { id: string },
  ): Promise<VoteResponseDto> {
    if (type !== 'upvote' && type !== 'downvote') {
      throw new BadRequestException('Invalid vote type');
    }
    return this.commentsService.vote(id, user.id, type);
  }

  @Get('/thread/:id')
  @UseGuards(OptionalAuthGuard)
  async getCommentThread(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string },
  ): Promise<CommentThreadResponseDto> {
    try {
      const threadData = await this.commentsService.findCommentThread(
        id,
        user?.id,
      );

      return plainToInstance(CommentThreadResponseDto, threadData, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching comment thread: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Could not fetch comment thread: ${error.message}`,
      );
    }
  }
}
