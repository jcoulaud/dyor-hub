import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BadgeEntity } from './badge.entity';
import { UserEntity } from './user.entity';

@Entity('user_badges')
@Unique(['userId', 'badgeId'])
export class UserBadgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'badge_id', type: 'uuid' })
  badgeId: string;

  @Column({ name: 'earned_at', type: 'timestamp' })
  earnedAt: Date;

  @Column({ name: 'is_displayed', type: 'boolean', default: false })
  isDisplayed: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => BadgeEntity)
  @JoinColumn({ name: 'badge_id' })
  badge: BadgeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
