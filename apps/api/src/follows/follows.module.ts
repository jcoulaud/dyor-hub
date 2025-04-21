import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFollows } from '../entities';
import { UsersModule } from '../users/users.module';
import { FollowsService } from './follows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserFollows]),
    forwardRef(() => UsersModule),
  ],
  providers: [FollowsService],
  controllers: [],
  exports: [FollowsService],
})
export class FollowsModule {}
