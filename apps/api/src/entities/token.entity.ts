import { Token } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { CommentEntity } from './comment.entity';

@Entity('tokens')
export class TokenEntity implements Partial<Token> {
  @PrimaryColumn()
  mintAddress: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column({ nullable: true })
  websiteUrl?: string;

  @Column({ nullable: true })
  telegramUrl?: string;

  @Column({ nullable: true })
  twitterHandle?: string;

  @Column({ default: 0 })
  viewsCount: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @OneToMany(() => CommentEntity, (comment) => comment.token)
  comments: CommentEntity[];
}
