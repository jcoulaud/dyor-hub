import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_follows')
@Index(['followerId'])
@Index(['followedId'])
export class UserFollows {
  @PrimaryColumn('uuid')
  followerId: string;

  @PrimaryColumn('uuid')
  followedId: string;

  @ManyToOne(() => UserEntity, (user) => user.following, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'followerId' })
  follower: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.followers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'followedId' })
  followed: UserEntity;

  @Column({ type: 'boolean', default: false })
  notify_on_prediction: boolean;

  @Column({ type: 'boolean', default: false })
  notify_on_comment: boolean;

  @Column({ type: 'boolean', default: false })
  notify_on_vote: boolean;

  @CreateDateColumn()
  created_at: Date;
}
