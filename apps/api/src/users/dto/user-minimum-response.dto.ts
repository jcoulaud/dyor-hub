import { Expose } from 'class-transformer';

export class UserMinimumResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  avatarUrl: string;
}
