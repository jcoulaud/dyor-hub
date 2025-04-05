import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum NotificationType {
  STREAK_AT_RISK = 'streak_at_risk',
  STREAK_ACHIEVED = 'streak_achieved',
  STREAK_BROKEN = 'streak_broken',
  BADGE_EARNED = 'badge_earned',
  LEADERBOARD_CHANGE = 'leaderboard_change',
  REPUTATION_MILESTONE = 'reputation_milestone',
  COMMENT_REPLY = 'comment_reply',
  UPVOTE_RECEIVED = 'upvote_received',
  SYSTEM = 'system',
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'related_entity_id', type: 'varchar', nullable: true })
  relatedEntityId: string | null;

  @Column({ name: 'related_entity_type', type: 'varchar', nullable: true })
  relatedEntityType: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
