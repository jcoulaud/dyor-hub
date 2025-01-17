import { CommentVote } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommentEntity } from './comment.entity';

@Entity('comment_votes')
export class CommentVoteEntity implements CommentVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  commentId: string;

  @Column()
  ipHash: string;

  @Column()
  isUpvote: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CommentEntity, (comment) => comment.votes)
  @JoinColumn({ name: 'comment_id' })
  comment: CommentEntity;
}
