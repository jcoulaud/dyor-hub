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
