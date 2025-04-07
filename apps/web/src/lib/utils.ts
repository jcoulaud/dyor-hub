import { PublicKey } from '@solana/web3.js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function isValidSolanaAddress(value: string): boolean {
  if (!value) return false;

  try {
    const publicKey = new PublicKey(value);
    return PublicKey.isOnCurve(publicKey);
  } catch {
    return false;
  }
}

/**
 * Truncates a blockchain address for display purposes
 * @param address The full address to truncate
 * @returns A shortened version of the address (e.g., "abc123...def4")
 */
export function truncateAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 16) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Improves avatar quality by removing '_normal' from Twitter avatar URLs
 * @param url The original avatar URL that might contain '_normal'
 * @returns A high-resolution version of the avatar URL
 */
export function getHighResAvatar(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace('_normal', '');
}

/**
 * Strips HTML tags from a string and decodes basic HTML entities.
 * @param html The string containing HTML to sanitize.
 * @returns The string with HTML tags removed and entities decoded.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Basic regex to remove tags
  let text = html.replace(/<[^>]*>?/gm, '');
  // Basic entity decoding
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  return text.trim();
}
