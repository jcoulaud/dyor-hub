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
  const { commentId, mintAddress } = params;

  let commentContent = '';
  let username = '';
  let avatarUrl = '';
  let tokenSymbol = '';
  let tokenImageUrl = '';

  try {
    const commentData = await comments.get(commentId);

    commentContent = commentData.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 220); // Limit to 220 chars

    username = commentData.user.displayName || commentData.user.username || 'Anonymous';
    avatarUrl = commentData.user.avatarUrl || '';

    const tokenData = await tokens.getByMintAddress(mintAddress);
    tokenSymbol = tokenData.symbol || '';
    tokenImageUrl = tokenData.imageUrl || '';
  } catch {
    commentContent = 'Check out this comment on DYOR hub';
    username = 'User';
  }

  let fontData;
  try {
    fontData = await readFile(join(process.cwd(), 'apps/web/public/fonts/Inter-SemiBold.ttf'));
  } catch {}

  let avatarSrc: string | null = null;
  let tokenImageSrc: string | null = null;
  let logoSrc: string | null = null;

  const fetchImageAsDataUrl = async (url: string, type = 'image/jpeg'): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:${type};base64,${base64}`;
    } catch {
      return null;
    }
  };

  const logoData = await readFile(join(process.cwd(), 'public/logo-white.png'));
  logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

  if (avatarUrl) {
    avatarSrc = await fetchImageAsDataUrl(avatarUrl);
  }

  if (tokenImageUrl) {
    tokenImageSrc = await fetchImageAsDataUrl(tokenImageUrl);
  }

  const fontOptions = fontData
    ? {
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal' as const,
            weight: 600 as const,
          },
        ],
      }
    : {};

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
          justifyContent: 'flex-start',
          fontFamily: fontData ? 'Inter' : 'sans-serif',
        }}>
        {/* Header with Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
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
          <div
            style={{
              color: '#ffffff',
              fontSize: 30,
              fontWeight: 'bold',
              display: 'flex',
              marginLeft: 20,
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
              {tokenImageSrc ? (
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
              ) : null}
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
      ...fontOptions,
    },
  );
}
