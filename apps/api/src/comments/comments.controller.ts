import {
  CreateCommentDto,
  UpdateCommentDto,
  VoteCommentDto,
} from '@dyor-hub/types';
import {
  Body,
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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { CommentsService } from './comments.service';

@Controller('comments')
export class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async getComments(
    @Query('tokenMintAddress') tokenMintAddress: string,
  ): Promise<CommentEntity[]> {
    return this.commentsService.findByTokenMintAddress(tokenMintAddress);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: any,
  ): Promise<CommentEntity> {
    if (!req.user) {
      this.logger.error('No user found in request');
      throw new UnauthorizedException('User not authenticated');
    }

    return this.commentsService.create(createCommentDto, req.user);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.commentsService.delete(id, req.user.id);
  }

  @Post(':id/vote')
  @UseGuards(AuthGuard('jwt'))
  async voteComment(
    @Param('id') commentId: string,
    @Body() voteCommentDto: VoteCommentDto,
    @Req() req: any,
  ): Promise<CommentVoteEntity> {
    if (!req.user) {
      this.logger.error('No user found in request');
      throw new UnauthorizedException('User not authenticated');
    }

    return this.commentsService.vote(commentId, voteCommentDto.type, req.user);
  }
}
