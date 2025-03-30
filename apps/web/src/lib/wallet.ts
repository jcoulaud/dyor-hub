import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

interface VerificationState {
  verified: boolean;
  verifiedAt?: Date;
}

const verifiedWallets = new Map<string, VerificationState>();

let isDeletingWallet = false;
let resetTimeout: NodeJS.Timeout | null = null;

// Generates a unique nonce for signature verification
export function generateNonce(): string {
  return `DYOR-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// Creates the message to be signed by the wallet
export function createSignatureMessage(nonce: string): string {
  return `Sign this message to verify ownership of your wallet with DYOR hub.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
}

// Checks if a wallet is verified and handles expiration
export function isWalletVerified(walletAddress: string): boolean {
  const verification = verifiedWallets.get(walletAddress);

  if (!verification) return false;

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

// Verifies a signature from the wallet against the message
export async function verifyWalletSignature(
  publicKey: PublicKey,
  signature: Uint8Array,
  message: string,
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message);

    try {
      const verified = nacl.sign.detached.verify(messageBytes, signature, publicKey.toBytes());

      if (verified) {
        setWalletVerified(publicKey.toBase58(), true);
      }

      return verified;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
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
    resetTimeout = setTimeout(() => {
      isDeletingWallet = false;
    }, 3000);
  }
}

// Checks if a wallet is currently being deleted
export function isWalletBeingDeleted(): boolean {
  return isDeletingWallet;
}
