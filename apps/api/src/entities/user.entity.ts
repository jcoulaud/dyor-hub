import { UserPreferences } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { AuthMethodEntity } from './auth-method.entity';
import { CommentVoteEntity } from './comment-vote.entity';
import { CommentEntity } from './comment.entity';
import { LeaderboardEntity } from './leaderboard.entity';
import { NotificationPreferenceEntity } from './notification-preference.entity';
import { NotificationEntity } from './notification.entity';
import { Referral } from './referral.entity';
import { TokenCallEntity } from './token-call.entity';
import { TokenSentimentEntity } from './token-sentiment.entity';
import { TokenWatchlistEntity } from './token-watchlist.entity';
import { TokenEntity } from './token.entity';
import { UserActivityEntity } from './user-activity.entity';
import { UserBadgeEntity } from './user-badge.entity';
import { UserFollows } from './user-follows.entity';
import { UserReputationEntity } from './user-reputation.entity';
import { UserStreakEntity } from './user-streak.entity';
import { UserTokenCallStreakEntity } from './user-token-call-streak.entity';
import { WalletEntity } from './wallet.entity';
import { WatchlistFolderEntity } from './watchlist-folder.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'twitter_id', type: 'varchar', nullable: true })
  twitterId: string | null;

  @Column({ name: 'username', type: 'varchar' })
  username: string;

  @Column({ name: 'display_name', type: 'varchar' })
  displayName: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'avatar_url', type: 'varchar' })
  avatarUrl: string;

  @Column({ name: 'twitter_access_token', nullable: true, type: 'varchar' })
  twitterAccessToken: string | null;

  @Column({ name: 'twitter_refresh_token', nullable: true, type: 'varchar' })
  twitterRefreshToken: string | null;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin: boolean;

  @Index({ unique: true, where: '"referral_code" IS NOT NULL' })
  @Column({
    name: 'referral_code',
    type: 'varchar',
    length: 5,
    nullable: true,
    unique: false,
  })
  referralCode: string | null;

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

  @OneToMany(() => AuthMethodEntity, (authMethod) => authMethod.user)
  authMethods: AuthMethodEntity[];

  @OneToMany(() => WalletEntity, (wallet) => wallet.user)
  wallets: WalletEntity[];

  @OneToMany(() => TokenWatchlistEntity, (watchlist) => watchlist.user, {
    cascade: true,
    eager: false,
  })
  watchlistedTokens: TokenWatchlistEntity[];

  @OneToMany(() => WatchlistFolderEntity, (folder) => folder.user, {
    cascade: true,
    eager: false,
  })
  watchlistFolders: WatchlistFolderEntity[];

  // Gamification relationships
  @OneToMany(() => UserActivityEntity, (activity) => activity.user)
  activities: UserActivityEntity[];

  @OneToOne(() => UserStreakEntity, (streak) => streak.user)
  streak: UserStreakEntity;

  @OneToOne(() => UserReputationEntity, (reputation) => reputation.user)
  reputation: UserReputationEntity;

  @OneToMany(() => UserBadgeEntity, (badge) => badge.user)
  badges: UserBadgeEntity[];

  @OneToOne(() => UserTokenCallStreakEntity, (streak) => streak.user)
  tokenCallStreak: UserTokenCallStreakEntity;

  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications: NotificationEntity[];

  @OneToMany(
    () => NotificationPreferenceEntity,
    (preference) => preference.user,
  )
  notificationPreferences: NotificationPreferenceEntity[];

  @OneToMany(() => TokenSentimentEntity, (sentiment) => sentiment.user)
  sentiments: TokenSentimentEntity[];

  @OneToMany(() => LeaderboardEntity, (leaderboard) => leaderboard.user)
  leaderboardRankings: LeaderboardEntity[];

  @OneToMany(() => TokenCallEntity, (call) => call.user)
  tokenCalls: TokenCallEntity[];

  @OneToMany(() => UserFollows, (follow) => follow.follower)
  following: UserFollows[];

  @OneToMany(() => UserFollows, (follow) => follow.followed)
  followers: UserFollows[];

  @OneToMany(() => Referral, (referral) => referral.referrer)
  referralsMade: Referral[];

  @OneToOne(() => Referral, (referral) => referral.referredUser)
  referredBy: Referral;

  @OneToMany(() => TokenEntity, (token) => token.verifiedCreatorUser)
  createdTokens: TokenEntity[];

  @Column({ type: 'int', default: 0, name: 'credits' })
  credits: number;

  @OneToMany(() => CreditTransaction, (transaction) => transaction.user)
  creditTransactions: CreditTransaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
