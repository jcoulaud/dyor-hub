import { UserEntity } from '../../entities';

export class AdminUserListItemDto {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  isAdmin: boolean;
  createdAt: string;

  constructor(partial: Partial<AdminUserListItemDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(user: UserEntity): AdminUserListItemDto {
    return new AdminUserListItemDto({
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin || false,
      createdAt: user.createdAt.toISOString(),
    });
  }
}
