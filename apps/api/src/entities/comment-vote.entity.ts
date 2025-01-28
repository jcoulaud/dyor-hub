import { VoteType } from '@dyor-hub/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentEntity } from './comment.entity';
import { UserEntity } from './user.entity';

@Entity('comment_votes')
export class CommentVoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['upvote', 'downvote'],
  })
  type: VoteType;

  @ManyToOne(() => CommentEntity, (comment) => comment.votes, {
    onDelete: 'CASCADE',
  })
  comment: CommentEntity;

  @ManyToOne(() => UserEntity, (user) => user.commentVotes, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
