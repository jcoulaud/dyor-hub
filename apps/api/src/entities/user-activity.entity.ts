import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum ActivityType {
  COMMENT = 'comment',
  POST = 'post',
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
  LOGIN = 'login',
}

@Entity('user_activities')
export class UserActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'activity_type',
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId: string | null;

  @Column({ name: 'entity_type', type: 'varchar', nullable: true })
  entityType: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
