import { Expose, Type } from 'class-transformer';

class TokenDto {
  @Expose()
  tokenMintAddress: string;

  @Expose()
  symbol: string;
}

class LatestCommentUserDto {
  @Expose()
  id: string;

  @Expose()
  displayName: string;

  @Expose()
  avatarUrl: string;
}

export class LatestCommentResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => TokenDto)
  token: TokenDto;

  @Expose()
  @Type(() => LatestCommentUserDto)
  user: LatestCommentUserDto;
}
