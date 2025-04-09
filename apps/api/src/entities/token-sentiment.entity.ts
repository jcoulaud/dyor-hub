import { SentimentType } from '@dyor-hub/types';
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
import { TokenEntity } from './token.entity';
import { UserEntity } from './user.entity';

@Entity('token_sentiments')
@Unique(['userId', 'tokenMintAddress'])
export class TokenSentimentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'token_mint_address', type: 'varchar' })
  tokenMintAddress: string;

  @Column({
    name: 'sentiment_type',
    type: 'enum',
    enum: SentimentType,
  })
  sentimentType: SentimentType;

  @Column({ name: 'value', type: 'integer', default: 1 })
  value: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => TokenEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'token_mint_address' })
  token: TokenEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
