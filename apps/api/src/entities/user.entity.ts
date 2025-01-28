import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentVoteEntity } from './comment-vote.entity';
import { CommentEntity } from './comment.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  twitterId: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column()
  displayName: string;

  @Column()
  avatarUrl: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  twitterAccessToken?: string;

  @Column({ nullable: true })
  twitterRefreshToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CommentEntity, (comment) => comment.user)
  comments: CommentEntity[];

  @OneToMany(() => CommentVoteEntity, (vote) => vote.user)
  commentVotes: CommentVoteEntity[];
}
