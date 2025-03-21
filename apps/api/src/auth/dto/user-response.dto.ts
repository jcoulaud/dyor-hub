export class UserResponseDto {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  isAdmin: boolean;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(user: any): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin || false,
    });
  }
}
