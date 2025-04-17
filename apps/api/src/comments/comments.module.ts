import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { PerspectiveModule } from '../services/perspective.module';
import { PerspectiveService } from '../services/perspective.service';
import { TelegramModule } from '../telegram/telegram.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommentEntity,
      CommentVoteEntity,
      TokenEntity,
      UserEntity,
    ]),
    forwardRef(() => AuthModule),
    PerspectiveModule,
    GamificationModule,
    TelegramModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService, PerspectiveService],
  exports: [CommentsService],
})
export class CommentsModule {}
