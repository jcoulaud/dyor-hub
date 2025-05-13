import { CreditTransactionType } from '@dyor-hub/types'; // Corrected import
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../entities/user.entity';

@Entity()
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.creditTransactions)
  @Index()
  user: UserEntity;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: CreditTransactionType,
  })
  type: CreditTransactionType;

  @Column('int')
  amount: number;

  @Column({ nullable: true, unique: true })
  @Index()
  solanaTransactionId?: string;

  @Column({ nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt: Date;
}
