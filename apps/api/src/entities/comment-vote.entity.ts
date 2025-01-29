import { VoteType } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CommentEntity } from './comment.entity';
import { UserEntity } from './user.entity';

@Entity('comment_votes')
@Unique(['userId', 'commentId'])
export class CommentVoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'vote_type', type: 'enum', enum: ['upvote', 'downvote'] })
  type: VoteType;

  @ManyToOne(() => CommentEntity, (comment) => comment.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment: CommentEntity;

  @ManyToOne(() => UserEntity, (user) => user.commentVotes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
