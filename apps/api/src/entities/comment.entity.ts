import { Comment } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommentVoteEntity } from './comment-vote.entity';
import { TokenEntity } from './token.entity';

@Entity('comments')
export class CommentEntity implements Omit<Comment, 'tokenMintAddress'> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TokenEntity, (token) => token.comments)
  @JoinColumn({ name: 'token_mint_address' })
  token: TokenEntity;

  @Column()
  content: string;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @Column()
  ipHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => CommentVoteEntity, (vote) => vote.comment)
  votes: CommentVoteEntity[];
}
