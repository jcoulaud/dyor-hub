import { LeaderboardCategory, LeaderboardTimeframe } from '@dyor-hub/types';
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
