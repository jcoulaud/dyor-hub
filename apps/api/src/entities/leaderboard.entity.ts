import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum LeaderboardCategory {
  COMMENTS = 'comments',
  POSTS = 'posts',
  UPVOTES_GIVEN = 'upvotes_given',
  UPVOTES_RECEIVED = 'upvotes_received',
  REPUTATION = 'reputation',
}

export enum LeaderboardTimeframe {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

@Entity('leaderboards')
@Unique(['userId', 'category', 'timeframe'])
export class LeaderboardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'category',
    type: 'enum',
    enum: LeaderboardCategory,
  })
  category: LeaderboardCategory;

  @Column({
    name: 'timeframe',
    type: 'enum',
    enum: LeaderboardTimeframe,
  })
  timeframe: LeaderboardTimeframe;

  @Column({ name: 'rank', type: 'integer' })
  rank: number;

  @Column({ name: 'score', type: 'integer' })
  score: number;

  @Column({ name: 'previous_rank', type: 'integer', nullable: true })
  previousRank: number | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
