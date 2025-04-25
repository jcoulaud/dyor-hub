import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('referrals')
@Unique(['referredUserId'])
@Index(['referrerId'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  referrerId: string;

  @Column('uuid')
  referredUserId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'referrerId' })
  referrer: UserEntity;

  @OneToOne(() => UserEntity, (user) => user.referredBy)
  @JoinColumn({ name: 'referredUserId' })
  referredUser: UserEntity;
}
