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
 * @param options Optional configuration options.
 * @param options.preserveLineBreaks Whether to preserve line breaks from <br> and <p> tags (default: false).
 * @param options.lineBreakChar Character to use for line breaks (default: '\n').
 * @param options.maxLength Optional maximum length for the returned string.
 * @returns The string with HTML tags removed and entities decoded.
 */
export function sanitizeHtml(
  html: string,
  options?: {
    preserveLineBreaks?: boolean;
    lineBreakChar?: string;
    maxLength?: number;
  },
): string {
  if (!html) return '';

  const { preserveLineBreaks = false, lineBreakChar = '\n', maxLength } = options || {};

  let text = html;

  // Replace <br> and paragraph tags with line breaks if requested
  if (preserveLineBreaks) {
    text = text
      .replace(/<br\s*\/?>/gi, lineBreakChar)
      .replace(/<\/p>\s*<p>/gi, `${lineBreakChar}${lineBreakChar}`)
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, lineBreakChar);
  }

  // Basic regex to remove tags
  text = text.replace(/<[^>]*>?/gm, '');

  // Basic entity decoding
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');

  // Trim the text
  text = text.trim();

  // Apply max length if specified
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength);
  }

  return text;
}

const formatLargeNumber = (num: string | number | undefined | null): string => {
  if (num === null || num === undefined) return 'N/A';
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return 'N/A';
  if (number === 0) return '0';

  const absNum = Math.abs(number);
  const sign = number < 0 ? '-' : '';

  if (absNum < 999.5) return `${sign}${number.toFixed(2)}`; // Keep decimals below 1K
  if (absNum < 999500) return `${sign}${(number / 1e3).toFixed(1)}K`; // Use 1 decimal for K (up to ~1M)
  if (absNum < 999500000) return `${sign}${(number / 1e6).toFixed(1)}M`; // Use 1 decimal for M (up to ~1B)
  if (absNum < 999500000000) return `${sign}${(number / 1e9).toFixed(1)}B`; // Use 1 decimal for B (up to ~1T)
  return `${sign}${(number / 1e12).toFixed(1)}T`; // Use 1 decimal for T
};

export { formatLargeNumber };

export const formatPrice = (price: number | string | undefined | null): string => {
  if (price === null || price === undefined) return '0.00'; // Handle null/undefined
  const num = typeof price === 'string' ? Number(price) : price;
  if (isNaN(num)) {
    return '0.00';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(num);
};
