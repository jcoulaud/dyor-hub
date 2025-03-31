import { comments, tokens } from '@/lib/api';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'DYOR hub - New Comment';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: { mintAddress: string; commentId: string };
}) {
  const { mintAddress, commentId } = params;

  let commentContent = '';
  let username = '';
  let avatarUrl = '';
  let tokenSymbol = '';
  let tokenImageUrl = '';

  try {
    const [commentData, tokenData] = await Promise.all([
      comments.get(commentId),
      tokens.getByMintAddress(mintAddress),
    ]);

    commentContent = commentData.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 220); // Limit to 220 chars

    username = commentData.user.displayName || commentData.user.username || 'Anonymous';
    avatarUrl = commentData.user.avatarUrl || '';
    tokenSymbol = tokenData.symbol || tokenData.name || 'Token';
    tokenImageUrl = tokenData.imageUrl || '';
  } catch {
    commentContent = 'Check out this comment on DYOR hub';
    username = 'User';
    tokenSymbol = 'Token';
  }

  // Load font
  let fontData;
  try {
    fontData = await readFile(join(process.cwd(), 'apps/web/public/fonts/Inter-SemiBold.ttf'));
  } catch {
    // Fallback to system fonts if Inter is not available
  }

  // Load logo
  let logoSrc;
  try {
    const logoData = await readFile(join(process.cwd(), 'apps/web/public/logo-white.png'));
    logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;
  } catch {
    // Will use fallback if logo can't be loaded
  }

  const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      if (!url || !url.startsWith('http')) return null;

      const res = await fetch(url);
      if (!res.ok) return null;

      const arrayBuffer = await res.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  };

  // Fetch images in parallel
  const [avatarSrc, tokenImageSrc] = await Promise.all([
    avatarUrl ? fetchImageAsDataUrl(avatarUrl) : Promise.resolve(null),
    tokenImageUrl ? fetchImageAsDataUrl(tokenImageUrl) : Promise.resolve(null),
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
          fontFamily: fontData ? 'Inter' : 'sans-serif',
        }}>
        {/* Header with Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          {logoSrc ? (
            <img
              src={logoSrc}
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
                <span>
                  {tokenSymbol
                    ? `$${tokenSymbol}`
                    : mintAddress.substring(0, 6) +
                      '...' +
                      mintAddress.substring(mintAddress.length - 4)}
                </span>
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
      ...(fontData && {
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
            weight: 600,
          },
        ],
      }),
    },
  );
}
