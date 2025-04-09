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

@Entity('telegram_user_connections')
export class TelegramUserConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'telegram_chat_id', type: 'varchar', nullable: true })
  telegramChatId: string;

  @Column({ name: 'telegram_username', type: 'varchar', nullable: true })
  telegramUsername: string;

  @Column({ name: 'telegram_first_name', type: 'varchar', nullable: true })
  telegramFirstName: string;

  @Column({ name: 'connection_status', type: 'varchar', default: 'active' })
  connectionStatus: string;

  @Column({ name: 'connection_token', type: 'varchar', nullable: true })
  connectionToken: string;

  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
