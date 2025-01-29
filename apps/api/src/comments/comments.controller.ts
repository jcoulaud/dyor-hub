import {
  CreateCommentDto,
  UpdateCommentDto,
  VoteCommentDto,
} from '@dyor-hub/types';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CommentResponseDto } from './dto/comment-response.dto';

@Controller('comments')
@UseInterceptors(ClassSerializerInterceptor)
export class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async getComments(
    @Query('tokenMintAddress') tokenMintAddress: string,
    @Req() req: any,
  ): Promise<CommentResponseDto[]> {
    const comments = await this.commentsService.findByTokenMintAddress(
      tokenMintAddress,
      req.user?.id,
    );
    return comments.map((comment) =>
      plainToInstance(CommentResponseDto, comment, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: any,
  ): Promise<CommentResponseDto> {
    if (!req.user) {
      this.logger.error('No user found in request');
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const comment = await this.commentsService.create(
        createCommentDto,
        req.user.id,
      );

      return plainToInstance(CommentResponseDto, comment, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error('Failed to create comment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user.id,
      });
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.update(id, dto, req.user.id);
    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.delete(id, req.user.id);
    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  async vote(
    @Param('id') id: string,
    @Body() dto: VoteCommentDto,
    @Req() req: any,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.vote(id, dto.type, req.user.id);
    return plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }
}
