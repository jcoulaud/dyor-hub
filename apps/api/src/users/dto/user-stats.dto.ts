import { UserStats } from '@dyor-hub/types';
import { Expose } from 'class-transformer';

export class UserStatsDto implements UserStats {
  @Expose()
  comments: number;

  @Expose()
  replies: number;

  @Expose()
  upvotes: number;

  @Expose()
  downvotes: number;

  constructor(partial: Partial<UserStatsDto>) {
    Object.assign(this, partial);
  }

  static fromRaw(rawStats: {
    comments: number;
    replies: number;
    upvotes: number;
    downvotes: number;
  }): UserStatsDto {
    return new UserStatsDto({
      comments: rawStats.comments || 0,
      replies: rawStats.replies || 0,
      upvotes: rawStats.upvotes || 0,
      downvotes: rawStats.downvotes || 0,
    });
  }
}
