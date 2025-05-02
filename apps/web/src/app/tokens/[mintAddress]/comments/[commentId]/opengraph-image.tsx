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
  let isTokenCreator = false;

  try {
    const [commentResult, tokenResult] = await Promise.allSettled([
      comments.get(commentId),
      tokens.getByMintAddress(mintAddress),
    ]);

    let userId: string | undefined;

    if (commentResult.status === 'fulfilled' && commentResult.value) {
      const commentData = commentResult.value;
      commentContent = sanitizeHtml(commentData.content, {
        preserveLineBreaks: true,
        maxLength: 220,
        replaceImagesWithText: true,
      });
      username = commentData.user.displayName || commentData.user.username || 'Anonymous';
      avatarUrl = commentData.user.avatarUrl || '';
      userId = commentData.user.id;
    }

    if (tokenResult.status === 'fulfilled' && tokenResult.value) {
      const tokenData = tokenResult.value;
      tokenSymbol = tokenData.symbol || tokenData.name || '';
      tokenImageUrl = tokenData.imageUrl || '';

      // Check if the commenter is the verified creator of the token
      if (userId && tokenData.verifiedCreatorUserId === userId) {
        isTokenCreator = true;
      }
    }
  } catch {
    // Continue with default values set above
  }

  const [avatarSrc, tokenImageSrc, logoSrc, shieldIconSrc] = await Promise.all([
    avatarUrl ? fetchImageAsDataUrl(avatarUrl) : Promise.resolve(null),
    tokenImageUrl ? fetchImageAsDataUrl(tokenImageUrl) : Promise.resolve(null),
    fetchImageAsDataUrl('/logo-white.png'),
    fetchImageAsDataUrl('/shield-icon.png').catch(() => Promise.resolve(null)), // Try to load shield icon
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                }}>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    display: 'flex',
                  }}>
                  <span>{username}</span>
                </div>

                {/* Team Badge */}
                {isTokenCreator && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: 8,
                      padding: '4px 12px',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}>
                    {shieldIconSrc ? (
                      <img src={shieldIconSrc} width={16} height={16} alt='' />
                    ) : (
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: '#22c55e', // Green color
                          display: 'flex',
                        }}
                      />
                    )}
                    <span
                      style={{
                        color: '#22c55e',
                        fontWeight: 'bold',
                        fontSize: 16,
                      }}>
                      {tokenSymbol ? `$${tokenSymbol} team` : 'Team'}
                    </span>
                  </div>
                )}
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
            }}>
            <span style={{ whiteSpace: 'pre-line' }}>&ldquo;{commentContent}&rdquo;</span>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>
              <span>← Join the conversation on DYOR hub</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      emoji: 'twemoji',
    },
  );
}
