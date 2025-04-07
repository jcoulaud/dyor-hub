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

  @Expose()
  currentStreak: number;

  @Expose()
  longestStreak: number;

  @Expose()
  reputation: number;

  constructor(partial: Partial<UserStatsDto> = {}) {
    Object.assign(this, partial);
  }

  static fromRaw(raw: {
    comments: number;
    replies: number;
    upvotes: number;
    downvotes: number;
    currentStreak?: number;
    longestStreak?: number;
    reputation?: number;
  }): UserStatsDto {
    return new UserStatsDto({
      comments: raw.comments || 0,
      replies: raw.replies || 0,
      upvotes: raw.upvotes || 0,
      downvotes: raw.downvotes || 0,
      currentStreak: raw.currentStreak || 0,
      longestStreak: raw.longestStreak || 0,
      reputation: raw.reputation || 0,
    });
  }
}
