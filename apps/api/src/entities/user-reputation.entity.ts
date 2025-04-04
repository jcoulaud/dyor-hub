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

@Entity('user_reputations')
export class UserReputationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'total_points', type: 'integer', default: 0 })
  totalPoints: number;

  @Column({ name: 'weekly_points', type: 'integer', default: 0 })
  weeklyPoints: number;

  @Column({
    name: 'weekly_points_last_reset',
    type: 'timestamp',
    nullable: true,
  })
  weeklyPointsLastReset: Date | null;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
