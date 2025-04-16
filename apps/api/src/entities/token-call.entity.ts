import { TokenCallStatus } from '@dyor-hub/types';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TokenEntity } from './token.entity';
import { UserEntity } from './user.entity';

@Entity('token_calls')
@Index(['userId'])
@Index(['tokenId'])
@Index(['status', 'targetDate'])
// Add check constraint for timeToHitRatio (only relevant if status is VERIFIED_SUCCESS)
@Check(
  `"status" != '${TokenCallStatus.VERIFIED_SUCCESS}' OR "time_to_hit_ratio" IS NOT NULL`,
)
@Check(
  `"status" != '${TokenCallStatus.VERIFIED_SUCCESS}' OR "target_hit_timestamp" IS NOT NULL`,
)
export class TokenCallEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.tokenCalls, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => TokenEntity, (token) => token.tokenCalls, {
    nullable: false,
    onDelete: 'RESTRICT', // Prevent deleting tokens with active calls
  })
  @JoinColumn({ name: 'token_id' })
  token: TokenEntity;

  @Column({ name: 'token_id', type: 'varchar' })
  tokenId: string;

  // --- Call Details ---
  @CreateDateColumn({ name: 'call_timestamp', type: 'timestamptz' })
  callTimestamp: Date;

  @Column('numeric', { precision: 18, scale: 8, name: 'reference_price' })
  referencePrice: number;

  @Column('numeric', {
    precision: 30,
    scale: 8,
    name: 'reference_supply',
    nullable: true,
  })
  referenceSupply?: number | null;

  @Column('numeric', { precision: 18, scale: 8, name: 'target_price' })
  targetPrice: number;

  @Column({ name: 'timeframe_duration', type: 'varchar' })
  timeframeDuration: string;

  @Column({ name: 'target_date', type: 'timestamptz' })
  targetDate: Date;

  // --- Verification Details ---
  @Column({
    name: 'status',
    type: 'enum',
    enum: TokenCallStatus,
    default: TokenCallStatus.PENDING,
  })
  status: TokenCallStatus;

  @Column({
    name: 'verification_timestamp',
    type: 'timestamptz',
    nullable: true,
  })
  verificationTimestamp?: Date | null;

  @Column('numeric', {
    precision: 18,
    scale: 8,
    name: 'peak_price_during_period',
    nullable: true,
  })
  peakPriceDuringPeriod?: number | null;

  @Column('numeric', {
    precision: 18,
    scale: 8,
    name: 'final_price_at_target_date',
    nullable: true,
  })
  finalPriceAtTargetDate?: number | null;

  // --- Success Metrics (only if VERIFIED_SUCCESS) ---
  @Column({ name: 'target_hit_timestamp', type: 'timestamptz', nullable: true })
  targetHitTimestamp?: Date | null;

  @Column('float', { name: 'time_to_hit_ratio', nullable: true })
  timeToHitRatio?: number | null;

  // --- Timestamps ---
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'price_history_url', type: 'varchar', nullable: true })
  priceHistoryUrl?: string | null;
}
