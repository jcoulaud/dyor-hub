import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TokenEntity } from './token.entity';

@Entity('early_token_buyers')
@Unique('UQ_TOKEN_BUYER_RANK', ['token', 'rank'])
@Unique('UQ_TOKEN_BUYER_ADDRESS', ['token', 'buyerWalletAddress'])
@Index('IDX_EARLY_BUYER_TOKEN_MINT', ['tokenMintAddress'])
export class EarlyTokenBuyerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, name: 'token_mint_address' })
  tokenMintAddress: string;

  @ManyToOne(() => TokenEntity, (token) => token.earlyBuyers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'token_mint_address',
    referencedColumnName: 'mintAddress',
  })
  token: TokenEntity;

  @Column({ type: 'varchar', length: 100 })
  buyerWalletAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  initialPurchaseTxSignature?: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  initialPurchaseTimestamp?: Date | null;

  @Column({ type: 'smallint' })
  rank: number;

  @Column({ type: 'bigint', nullable: true })
  firstBuyTime?: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  totalInvested?: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  averageBuyAmount?: number | null;

  @Column({ type: 'smallint', nullable: true })
  buyTransactions?: number | null;

  @Column({ type: 'smallint', nullable: true })
  sellTransactions?: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
