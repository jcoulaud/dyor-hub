export class UserResponseDto {
  displayName: string;
  username: string;
  avatarUrl: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(user: any): UserResponseDto {
    return new UserResponseDto({
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  }
}
