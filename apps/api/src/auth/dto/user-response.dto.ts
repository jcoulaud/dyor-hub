import { UserPreferences } from '@dyor-hub/types';

export class UserResponseDto {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  isAdmin: boolean;
  // Optional, but only populate specific keys publicly
  preferences?: Partial<UserPreferences>;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(user: any): UserResponseDto {
    // Selectively build the preferences object for public view
    const publicPreferences: Partial<UserPreferences> = {};
    if (user.preferences?.showWalletAddress !== undefined) {
      publicPreferences.showWalletAddress = user.preferences.showWalletAddress;
    }

    return new UserResponseDto({
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin || false,
      preferences: publicPreferences,
    });
  }
}
