import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class CommentUserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  avatarUrl: string;
}

@Exclude()
export class CommentResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  tokenMintAddress: string;

  @Expose()
  upvotes: number;

  @Expose()
  downvotes: number;

  @Expose()
  parentId: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => CommentUserDto)
  user: CommentUserDto;
}
