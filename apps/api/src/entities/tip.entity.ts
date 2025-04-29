import { TipContentType } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'tips' })
@Index(['transactionSignature'], { unique: true })
export class Tip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Sender ---
  @ManyToOne(() => UserEntity, {
    eager: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'senderId' })
  sender: UserEntity | null;

  @Column({ nullable: true })
  senderId: string | null;

  @Column({ comment: "Sender's public wallet address at the time of tipping" })
  senderWalletAddress: string;

  // --- Recipient ---
  @ManyToOne(() => UserEntity, {
    eager: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'recipientId' })
  recipient: UserEntity | null;

  @Column({ nullable: true })
  recipientId: string | null;

  @Column({
    comment: "Recipient's public wallet address at the time of tipping",
  })
  recipientWalletAddress: string;

  // --- Tip Details ---
  @Column('decimal', {
    precision: 18,
    scale: 6,
    comment: 'Amount of $DYORHUB tipped',
  })
  amount: number;

  @Column({
    length: 100,
    comment: 'Solana transaction signature (base58 encoded)',
  })
  transactionSignature: string;

  @Column({
    type: 'enum',
    enum: TipContentType,
    nullable: true,
    comment: 'The type of content/context the tip relates to',
  })
  contentType: TipContentType | null;

  @Column({
    nullable: true,
    comment: 'ID of the specific content item (e.g., comment ID)',
  })
  contentId: string | null;

  // --- Timestamps ---
  @CreateDateColumn()
  createdAt: Date;
}
