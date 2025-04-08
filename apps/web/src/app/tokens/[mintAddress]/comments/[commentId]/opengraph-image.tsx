import { comments, tokens } from '@/lib/api';
import { sanitizeHtml } from '@/lib/utils';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'DYOR hub - New Comment';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    // Handle local files from public directory
    if (url.startsWith('/')) {
      const relativePath = url.slice(1);
      const data = await readFile(join(process.cwd(), 'public', relativePath));
      return `data:image/png;base64,${Buffer.from(data).toString('base64')}`;
    }

    // Handle remote URLs
    if (url.startsWith('http')) {
      const res = await fetch(url, {
        cache: 'no-store',
        next: { revalidate: 0 },
      });
      if (!res.ok) return null;

      const arrayBuffer = await res.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    }

    return null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: { mintAddress: string; commentId: string };
}) {
  const { mintAddress, commentId } = params;

  // Initialize default values
  let commentContent = 'Check out this comment on DYOR hub';
  let username = 'User';
  let avatarUrl = '';
  let tokenSymbol = '';
  let tokenImageUrl = '';

  try {
    const [commentResult, tokenResult] = await Promise.allSettled([
      comments.get(commentId),
      tokens.getByMintAddress(mintAddress),
    ]);

    if (commentResult.status === 'fulfilled' && commentResult.value) {
      const commentData = commentResult.value;
      commentContent = sanitizeHtml(commentData.content, {
        preserveLineBreaks: true,
        maxLength: 220,
      });
      username = commentData.user.displayName || commentData.user.username || 'Anonymous';
      avatarUrl = commentData.user.avatarUrl || '';
    }

    if (tokenResult.status === 'fulfilled' && tokenResult.value) {
      const tokenData = tokenResult.value;
      tokenSymbol = tokenData.symbol || tokenData.name || '';
      tokenImageUrl = tokenData.imageUrl || '';
    }
  } catch {
    // Continue with default values set above
  }

  const [avatarSrc, tokenImageSrc, logoSrc] = await Promise.all([
    avatarUrl ? fetchImageAsDataUrl(avatarUrl) : Promise.resolve(null),
    tokenImageUrl ? fetchImageAsDataUrl(tokenImageUrl) : Promise.resolve(null),
    fetchImageAsDataUrl('/logo-white.png'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f0f10',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          padding: 40,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}>
        {/* Header with Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          {logoSrc ? (
            <img
              src={logoSrc as unknown as string}
              width={120}
              height={40}
              style={{
                objectFit: 'contain',
                marginRight: 20,
              }}
              alt='DYOR hub Logo'
            />
          ) : (
            <div
              style={{
                backgroundColor: '#8b5cf6',
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 24,
                fontWeight: 'bold',
                marginRight: 20,
              }}>
              D
            </div>
          )}
          <div
            style={{
              color: '#ffffff',
              fontSize: 30,
              fontWeight: 'bold',
              display: 'flex',
              marginLeft: logoSrc ? 20 : 0,
            }}>
            <span>New comment on DYOR hub!</span>
          </div>
        </div>

        {/* Comment content with token info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: 32,
            flex: 1,
          }}>
          {/* User and Token info row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 32,
              justifyContent: 'space-between',
            }}>
            {/* User info (left side) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  width={64}
                  height={64}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginRight: 16,
                  }}
                  alt={username}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 32,
                    fontWeight: 'bold',
                    marginRight: 16,
                  }}>
                  <span>{username.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: '#ffffff',
                  display: 'flex',
                }}>
                <span>{username}</span>
              </div>
            </div>

            {/* Token info (right side) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  color: '#3b82f6',
                  fontSize: 32,
                  fontWeight: 'bold',
                  display: 'flex',
                  marginRight: tokenImageSrc ? 16 : 0,
                }}>
                <span>{tokenSymbol ? `$${tokenSymbol}` : ''}</span>
              </div>
              {tokenImageSrc && (
                <img
                  src={tokenImageSrc}
                  width={64}
                  height={64}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                  alt='Token'
                />
              )}
            </div>
          </div>

          {/* Comment text */}
          <div
            style={{
              fontSize: 38,
              fontWeight: 'bold',
              color: '#ffffff',
              lineHeight: 1.4,
              marginBottom: 24,
              flex: 1,
              display: 'flex',
              whiteSpace: 'pre-line',
            }}>
            <span>
              &ldquo;{commentContent}&rdquo;{commentContent.length > 220 ? '...' : ''}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
          <div style={{ color: '#a3a3a3', fontSize: 22, display: 'flex' }}>
            <span>dyorhub.xyz</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: 9999,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 8,
              paddingBottom: 8,
            }}>
            <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold', display: 'flex' }}>
              <span>Join the discussion</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
