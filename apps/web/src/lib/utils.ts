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
 * @param options.replaceImagesWithText Whether to replace images with text (default: false).
 * @returns The string with HTML tags removed and entities decoded.
 */
export function sanitizeHtml(
  html: string,
  options?: {
    preserveLineBreaks?: boolean;
    lineBreakChar?: string;
    maxLength?: number;
    replaceImagesWithText?: boolean;
  },
): string {
  if (!html) return '';

  const {
    preserveLineBreaks = false,
    lineBreakChar = '\n',
    maxLength,
    replaceImagesWithText = false,
  } = options || {};

  let text = html;

  // Replace images with placeholder text if requested
  if (replaceImagesWithText) {
    // Replace GIFs
    text = text.replace(
      /<img[^>]*(?:giphy\.com\/[^>]*\.gif|\.gif)[^>]*>/gi,
      ' [Click to see the GIF] ',
    );

    // Replace all other images
    text = text.replace(/<img[^>]*>/gi, ' [Click to see the image] ');
  }

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
    text = text.substring(0, maxLength) + '...';
  }

  return text;
}

const formatLargeNumber = (num: string | number | undefined | null): string => {
  if (num === null || num === undefined) return '-';
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '-';
  if (number === 0) return '0';

  const absNum = Math.abs(number);
  const sign = number < 0 ? '-' : '';

  // Options for K and T (no decimals)
  const formatOptionsNoDecimals: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
  // Options for M and B (two decimals)
  const formatOptionsTwoDecimals: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  if (absNum < 1000)
    return `${sign}${number.toLocaleString('en-US', { maximumFractionDigits: 2 })}`; // Keep original logic for < 1k

  let formattedNum = '';
  let suffix = '';

  if (absNum < 999500) {
    // K: No decimals
    formattedNum = (number / 1e3).toLocaleString('en-US', formatOptionsNoDecimals);
    suffix = 'K';
  } else if (absNum < 999500000) {
    // M: Always 2 decimals, remove .00
    formattedNum = (number / 1e6).toLocaleString('en-US', formatOptionsTwoDecimals);
    suffix = 'M';
  } else if (absNum < 999500000000) {
    // B: Always 2 decimals, remove .00
    formattedNum = (number / 1e9).toLocaleString('en-US', formatOptionsTwoDecimals);
    suffix = 'B';
  } else {
    // T: No decimals
    formattedNum = (number / 1e12).toLocaleString('en-US', formatOptionsNoDecimals);
    suffix = 'T';
  }

  // Remove .00 for M and B if necessary
  if ((suffix === 'M' || suffix === 'B') && formattedNum.endsWith('.00')) {
    formattedNum = formattedNum.slice(0, -3); // Remove the last 3 characters (.00)
  }

  return `${sign}${formattedNum}${suffix}`;
};

export { formatLargeNumber };

export const formatPrice = (price: number | string | undefined | null): string => {
  if (price === null || price === undefined) return '0'; // Handle null/undefined
  const num = typeof price === 'string' ? Number(price) : price;
  if (isNaN(num)) {
    return '0';
  }

  // Format the number with up to 6 decimal places
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(num);

  return formatted;
};

/**
 * Calculates the multiplier between target price and reference price
 * @param referencePrice The reference price
 * @param targetPrice The target price
 * @returns The multiplier or null if reference price is 0 or invalid
 */
export const calculateMultiplier = (
  referencePrice: number | string | null | undefined,
  targetPrice: number | string | null | undefined,
): number | null => {
  if (
    referencePrice === null ||
    referencePrice === undefined ||
    targetPrice === null ||
    targetPrice === undefined
  ) {
    return null;
  }

  // Convert to numbers if they're strings
  const refPrice = typeof referencePrice === 'string' ? parseFloat(referencePrice) : referencePrice;
  const tgtPrice = typeof targetPrice === 'string' ? parseFloat(targetPrice) : targetPrice;

  // Validate numbers
  if (isNaN(refPrice) || isNaN(tgtPrice) || refPrice === 0) {
    return null;
  }

  return tgtPrice / refPrice;
};

export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
