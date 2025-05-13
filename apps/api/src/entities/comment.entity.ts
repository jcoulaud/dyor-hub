import { COMMENT_MAX_LENGTH, CommentType } from '@dyor-hub/types';
import { MaxLength } from 'class-validator';
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
import { TokenCallEntity } from './token-call.entity';
import { TokenEntity } from './token.entity';
import { UserEntity } from './user.entity';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content', type: 'text' })
  @MaxLength(COMMENT_MAX_LENGTH, {
    message: `Comment cannot be longer than ${COMMENT_MAX_LENGTH} characters`,
  })
  content: string;

  @Column({
    name: 'market_cap_at_creation',
    type: 'double precision',
    nullable: true,
  })
  marketCapAtCreation: number | null;

  @Column({
    name: 'type',
    type: 'enum',
    enum: CommentType,
    default: CommentType.COMMENT,
  })
  type: CommentType;

  @Column({ name: 'token_mint_address', type: 'varchar' })
  tokenMintAddress: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parent_id', nullable: true, type: 'uuid' })
  parentId: string | null;

  @Column({ name: 'token_call_id', nullable: true, type: 'uuid' })
  tokenCallId: string | null;

  @Column({ name: 'upvotes_count', type: 'integer', default: 0 })
  upvotes: number;

  @Column({ name: 'downvotes_count', type: 'integer', default: 0 })
  downvotes: number;

  @Column({ name: 'removed_by_id', type: 'uuid', nullable: true })
  removedById: string | null;

  @Column({ name: 'removal_reason', type: 'varchar', nullable: true })
  removalReason: string | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'removed_by_id' })
  removedBy: UserEntity | null;

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

  @ManyToOne(
    () => TokenCallEntity,
    (tokenCall) => tokenCall.explanationComment,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'token_call_id' })
  tokenCall: TokenCallEntity | null;

  @OneToMany(() => CommentEntity, (comment) => comment.parent)
  replies: CommentEntity[];

  @OneToMany(() => CommentVoteEntity, (vote) => vote.comment)
  votes: CommentVoteEntity[];

  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
