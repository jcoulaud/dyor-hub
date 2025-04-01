import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentEntity } from './comment.entity';
import { TokenWatchlistEntity } from './token-watchlist.entity';
import { TwitterUsernameHistoryEntity } from './twitter-username-history.entity';

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => CommentEntity, (comment) => comment.token)
  comments: CommentEntity[];

  @OneToMany(() => TwitterUsernameHistoryEntity, (history) => history.token)
  twitterUsernameHistory: TwitterUsernameHistoryEntity[];

  @OneToMany(() => TokenWatchlistEntity, (watchlist) => watchlist.token)
  watchlistedBy: TokenWatchlistEntity[];
}
