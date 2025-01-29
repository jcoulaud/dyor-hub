import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentVoteEntity } from './comment-vote.entity';
import { TokenEntity } from './token.entity';
import { UserEntity } from './user.entity';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'token_mint_address', type: 'varchar' })
  tokenMintAddress: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parent_id', nullable: true, type: 'uuid' })
  parentId: string | null;

  @Column({ name: 'upvotes_count', type: 'integer', default: 0 })
  upvotes: number;

  @Column({ name: 'downvotes_count', type: 'integer', default: 0 })
  downvotes: number;

  @ManyToOne(() => UserEntity, (user) => user.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => TokenEntity, (token) => token.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'token_mint_address' })
  token: TokenEntity;

  @ManyToOne(() => CommentEntity, (comment) => comment.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: CommentEntity | null;

  @OneToMany(() => CommentEntity, (comment) => comment.parent)
  replies: CommentEntity[];

  @OneToMany(() => CommentVoteEntity, (vote) => vote.comment)
  votes: CommentVoteEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
