import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentEntity } from './comment.entity';
import { EarlyTokenBuyerEntity } from './early-token-buyer.entity';
import { TokenCallEntity } from './token-call.entity';
import { TokenSentimentEntity } from './token-sentiment.entity';
import { TokenWatchlistEntity } from './token-watchlist.entity';
import { TwitterUsernameHistoryEntity } from './twitter-username-history.entity';
import { UserEntity } from './user.entity';

@Entity('tokens')
export class TokenEntity {
  @PrimaryColumn({ name: 'mint_address', type: 'varchar' })
  mintAddress: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'symbol', type: 'varchar' })
  symbol: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description?: string;

  @Column({ name: 'image_url', nullable: true, type: 'varchar' })
  imageUrl: string;

  @Column({ name: 'website_url', nullable: true, type: 'varchar' })
  websiteUrl?: string;

  @Column({ name: 'telegram_url', nullable: true, type: 'varchar' })
  telegramUrl?: string;

  @Column({ name: 'twitter_handle', nullable: true, type: 'varchar' })
  twitterHandle?: string;

  @Column({ name: 'views_count', default: 0, type: 'integer' })
  viewsCount: number;

  @Column({ type: 'varchar', nullable: true })
  creatorAddress?: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  verifiedCreatorUserId?: string | null;

  @ManyToOne(() => UserEntity, (user) => user.createdTokens, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'verifiedCreatorUserId' })
  verifiedCreatorUser?: UserEntity | null;

  @OneToMany(() => CommentEntity, (comment) => comment.token)
  comments: CommentEntity[];

  @OneToMany(() => TwitterUsernameHistoryEntity, (history) => history.token)
  twitterUsernameHistory: TwitterUsernameHistoryEntity[];

  @OneToMany(() => TokenWatchlistEntity, (watchlist) => watchlist.token, {
    cascade: true,
    eager: false,
  })
  watchlistedBy: TokenWatchlistEntity[];

  @OneToMany(() => TokenSentimentEntity, (sentiment) => sentiment.token, {
    cascade: true,
    eager: false,
  })
  sentiments: TokenSentimentEntity[];

  @OneToMany(() => TokenCallEntity, (call) => call.token)
  tokenCalls: TokenCallEntity[];

  @Column({ type: 'text', nullable: true })
  creationTx: string | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  creationTime: Date | null;

  @OneToMany(() => EarlyTokenBuyerEntity, (earlyBuyer) => earlyBuyer.token, {
    cascade: true,
    eager: false,
  })
  earlyBuyers: EarlyTokenBuyerEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
