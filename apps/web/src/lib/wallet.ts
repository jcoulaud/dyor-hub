interface VerificationState {
  verified: boolean;
  verifiedAt?: Date;
}

// Using a memory store to track verification state
const verifiedWallets = new Map<string, VerificationState>();

// Track wallet deletion state to prevent operations during deletion
let isDeletingWallet = false;
let resetTimeout: NodeJS.Timeout | null = null;

export function createSignatureMessage(nonce: string): string {
  // This must exactly match the format the backend is checking
  return `Sign this message to verify ownership of your wallet with DYOR hub.\n\nNonce: ${nonce}`;
}

export function isWalletVerified(walletAddress: string): boolean {
  if (!walletAddress) return false;

  const verification = verifiedWallets.get(walletAddress);
  if (!verification) return false;

  // Check for verification expiration (24 hours)
  if (verification.verifiedAt) {
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
    const now = new Date();
    const elapsed = now.getTime() - verification.verifiedAt.getTime();

    if (elapsed > expirationTime) {
      verifiedWallets.delete(walletAddress);
      return false;
    }
  }

  return verification.verified;
}

// Sets a wallet's verification status
export function setWalletVerified(walletAddress: string, verified: boolean): void {
  if (!walletAddress) return;

  verifiedWallets.set(walletAddress, {
    verified,
    verifiedAt: new Date(),
  });
}

// Removes verification status for a wallet
export function clearWalletVerification(walletAddress: string): void {
  if (walletAddress) {
    verifiedWallets.delete(walletAddress);
  }
}

// Sets the wallet deletion state with auto-reset
export function setWalletDeletionState(isDeleting: boolean): void {
  isDeletingWallet = isDeleting;

  if (resetTimeout) {
    clearTimeout(resetTimeout);
    resetTimeout = null;
  }

  if (isDeleting) {
    // Auto-reset deletion state after 3 seconds as a safety measure
    resetTimeout = setTimeout(() => {
      isDeletingWallet = false;
    }, 3000);
  }
}

// Checks if a wallet is currently being deleted
export function isWalletBeingDeleted(): boolean {
  return isDeletingWallet;
}
