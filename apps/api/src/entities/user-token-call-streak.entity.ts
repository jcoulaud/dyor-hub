import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_token_call_streaks')
export class UserTokenCallStreakEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'current_success_streak', type: 'integer', default: 0 })
  currentSuccessStreak: number;

  @Column({ name: 'longest_success_streak', type: 'integer', default: 0 })
  longestSuccessStreak: number;

  @Column({
    name: 'last_verified_call_timestamp',
    type: 'timestamptz',
    nullable: true,
  })
  lastVerifiedCallTimestamp: Date | null;

  @OneToOne(() => UserEntity, (user) => user.tokenCallStreak, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
