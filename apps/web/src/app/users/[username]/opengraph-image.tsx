import { users } from '@/lib/api';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'DYOR hub - User Profile';
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
      const res = await fetch(url);
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

export default async function Image({ params }: { params: { username: string } }) {
  const { username } = params;

  let displayName = 'User';
  let avatarUrl = '';
  let stats = {
    comments: 0,
    replies: 0,
    upvotes: 0,
    downvotes: 0,
  };

  try {
    const [userData, userStats] = await Promise.all([
      users.getByUsername(username),
      users.getUserStats(username),
    ]);

    displayName = userData.displayName || userData.username || 'Anonymous';
    avatarUrl = userData.avatarUrl || '';
    stats = userStats;
  } catch {
    // Use default values set above if fetching fails
  }

  const [avatarSrc, logoSrc] = await Promise.all([
    avatarUrl ? fetchImageAsDataUrl(avatarUrl) : Promise.resolve(null),
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
        {/* Header with Logo and Profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
            justifyContent: 'space-between',
          }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
              <span>DYOR hub Profile</span>
            </div>
          </div>

          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginRight: 20,
              }}>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: 4,
                  display: 'flex',
                }}>
                {displayName}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: '#a3a3a3',
                  display: 'flex',
                }}>
                @{username}
              </div>
            </div>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                width={64}
                height={64}
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                }}
                alt={displayName}
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
                  fontSize: 28,
                  fontWeight: 'bold',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                }}>
                <span>{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '24px',
            flex: 1,
            justifyContent: 'center',
          }}>
          {/* Stats grid */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              width: '100%',
            }}>
            <div
              style={{
                width: '49.25%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 12,
                padding: '19px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  marginBottom: 4,
                  display: 'flex',
                }}>
                {stats.comments}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 20, display: 'flex' }}>Comments</div>
            </div>
            <div
              style={{
                width: '49.25%',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 12,
                padding: '19px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 'bold',
                  color: '#8b5cf6',
                  marginBottom: 4,
                  display: 'flex',
                }}>
                {stats.replies}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 20, display: 'flex' }}>Replies</div>
            </div>
            <div
              style={{
                width: '49.25%',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 12,
                padding: '19px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 'bold',
                  color: '#22c55e',
                  marginBottom: 4,
                  display: 'flex',
                }}>
                {stats.upvotes}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 20, display: 'flex' }}>Upvotes</div>
            </div>
            <div
              style={{
                width: '49.25%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 12,
                padding: '19px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 'bold',
                  color: '#ef4444',
                  marginBottom: 4,
                  display: 'flex',
                }}>
                {stats.downvotes}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 20, display: 'flex' }}>Downvotes</div>
            </div>
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
              <span>See profile</span>
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
