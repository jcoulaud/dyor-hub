import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TokenEntity } from './token.entity';

@Entity('twitter_username_history')
export class TwitterUsernameHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_mint_address', type: 'varchar' })
  tokenMintAddress: string;

  @Column({ name: 'twitter_username', type: 'varchar' })
  twitterUsername: string;

  @Column({ name: 'history', type: 'jsonb', nullable: true })
  history: Array<{
    last_checked: string;
    username: string;
  }> | null;

  @ManyToOne(() => TokenEntity, (token) => token.twitterUsernameHistory)
  @JoinColumn({ name: 'token_mint_address' })
  token: TokenEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
