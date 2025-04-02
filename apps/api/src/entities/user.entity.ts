import { UserPreferences } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentVoteEntity } from './comment-vote.entity';
import { CommentEntity } from './comment.entity';
import { TokenWatchlistEntity } from './token-watchlist.entity';
import { WalletEntity } from './wallet.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'twitter_id', type: 'varchar' })
  twitterId: string;

  @Column({ name: 'username', type: 'varchar' })
  username: string;

  @Column({ name: 'display_name', type: 'varchar' })
  displayName: string;

  @Column({ name: 'avatar_url', type: 'varchar' })
  avatarUrl: string;

  @Column({ name: 'twitter_access_token', nullable: true, type: 'varchar' })
  twitterAccessToken: string;

  @Column({ name: 'twitter_refresh_token', nullable: true, type: 'varchar' })
  twitterRefreshToken: string;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin: boolean;

  @Column({
    name: 'preferences',
    type: 'jsonb',
    nullable: true,
    default: () => "'{}'",
  })
  preferences: Partial<UserPreferences>;

  @OneToMany(() => CommentEntity, (comment) => comment.user)
  comments: CommentEntity[];

  @OneToMany(() => CommentVoteEntity, (vote) => vote.user)
  commentVotes: CommentVoteEntity[];

  @OneToMany(() => WalletEntity, (wallet) => wallet.user)
  wallets: WalletEntity[];

  @OneToMany(() => TokenWatchlistEntity, (watchlist) => watchlist.user, {
    cascade: true,
    eager: false,
  })
  watchlistedTokens: TokenWatchlistEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
