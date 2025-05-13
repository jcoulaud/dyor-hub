import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { TokenEntity } from '../entities/token.entity';
import { UserFollows } from '../entities/user-follows.entity';
import { UserEntity } from '../entities/user.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PerspectiveModule } from '../services/perspective.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TokensModule } from '../tokens/tokens.module';
import { UploadsModule } from '../uploads/uploads.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommentEntity,
      CommentVoteEntity,
      TokenEntity,
      UserEntity,
      UserFollows,
    ]),
    forwardRef(() => AuthModule),
    PerspectiveModule,
    GamificationModule,
    NotificationsModule,
    TelegramModule,
    UploadsModule,
    forwardRef(() => TokensModule),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
