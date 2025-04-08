import { UserPreferences, defaultUserPreferences } from '@dyor-hub/types';
import { UserEntity } from '../../entities';

export class UserResponseDto {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  isAdmin: boolean;
  preferences?: Partial<UserPreferences>;
  primaryWalletAddress?: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(user: UserEntity): UserResponseDto {
    // Find the primary verified wallet address
    let primaryAddress: string | undefined = undefined;
    if (
      user.wallets &&
      Array.isArray(user.wallets) &&
      user.wallets.length > 0
    ) {
      const primaryWallet = user.wallets.find(
        (w) => w.isPrimary && w.isVerified,
      );
      // Only use the address if a wallet is both primary AND verified.
      primaryAddress = primaryWallet?.address;
    }

    const showAddressPref = user.preferences?.showWalletAddress;

    const finalAddress =
      showAddressPref && primaryAddress ? primaryAddress : undefined;

    return new UserResponseDto({
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin || false,
      preferences: { ...defaultUserPreferences, ...(user.preferences || {}) },
      primaryWalletAddress: finalAddress,
    });
  }
}
