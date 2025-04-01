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

@Entity('token_watchlists')
@Unique(['userId', 'tokenMintAddress'])
export class TokenWatchlistEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.watchlistedTokens, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => TokenEntity, (token) => token.watchlistedBy, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({
    name: 'token_mint_address',
    referencedColumnName: 'mintAddress',
  })
  token: TokenEntity;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'token_mint_address' })
  tokenMintAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
