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

// Detect issues with storage access that might affect wallet signing
export async function checkBrowserStorageAccess(): Promise<{
  hasAccess: boolean;
  error?: string;
}> {
  try {
    // Try localStorage
    const testKey = '_wallet_storage_test';
    localStorage.setItem(testKey, 'test');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    // Try sessionStorage
    const sessionTestKey = '_wallet_session_test';
    sessionStorage.setItem(sessionTestKey, 'test');
    const sessionTestValue = sessionStorage.getItem(sessionTestKey);
    sessionStorage.removeItem(sessionTestKey);

    return {
      hasAccess: testValue === 'test' && sessionTestValue === 'test',
    };
  } catch (error) {
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface WindowWithWallets extends Window {
  phantom?: unknown;
  solflare?: unknown;
  solana?: {
    isPhantom?: boolean;
    isSolflare?: boolean;
  };
  backpack?: unknown;
  glow?: unknown;
  slope?: unknown;
}

export function getWalletType(): string {
  if (typeof window !== 'undefined') {
    const extendedWindow = window as WindowWithWallets;

    if (extendedWindow.phantom) return 'Phantom';
    if (extendedWindow.solflare) return 'Solflare';
    if (extendedWindow.solana?.isPhantom) return 'Phantom';
    if (extendedWindow.solana?.isSolflare) return 'Solflare';
    if (extendedWindow.backpack) return 'Backpack';
    if (extendedWindow.glow) return 'Glow';
    if (extendedWindow.slope) return 'Slope';
  }

  return 'Unknown';
}

export function checkForKnownWalletIssues(): {
  hasKnownIssues: boolean;
  issueType?: string;
  description?: string;
} {
  if (typeof window === 'undefined') return { hasKnownIssues: false };

  const walletType = getWalletType();
  const userAgent = navigator.userAgent.toLowerCase();

  if (walletType === 'Phantom' && userAgent.includes('brave')) {
    return {
      hasKnownIssues: true,
      issueType: 'brave-phantom',
      description:
        'Brave browser shields may block Phantom wallet storage access. Try disabling shields for this site.',
    };
  }

  if (userAgent.includes('firefox') && walletType === 'Phantom') {
    return {
      hasKnownIssues: true,
      issueType: 'firefox-storage',
      description:
        'Firefox may restrict storage access for extensions. Try using a different browser.',
    };
  }

  if (/safari/i.test(userAgent) && !/chrome|chromium|crios/i.test(userAgent)) {
    return {
      hasKnownIssues: true,
      issueType: 'safari-extension',
      description:
        'Safari has limited support for wallet extensions. Try using Chrome or Firefox instead.',
    };
  }

  return { hasKnownIssues: false };
}
