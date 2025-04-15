import { tokenCalls, users } from '@/lib/api';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface TokenCallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  accuracyRate: number;
  averageGainPercent?: number | null;
  averageTimeToHitRatio?: number | null;
  averageMultiplier?: number | null;
}

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

const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  const percentage = value * 100;
  // Remove decimal if it's zero (e.g., 56.0 -> 56)
  const formattedValue = percentage.toFixed(1).replace(/\.0$/, '');
  return `${formattedValue}%`;
};

const formatMultiplier = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  // Round to integer if above 10, otherwise show with 2 decimal places
  return value >= 10 ? `${Math.round(value)}x` : `${value.toFixed(2)}x`;
};

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
  let tokenCallStats: TokenCallStats | null = null;
  let userId = '';

  try {
    const userData = await users.getByUsername(username);
    displayName = userData.displayName || userData.username || 'Anonymous';
    avatarUrl = userData.avatarUrl || '';
    userId = userData.id;

    if (userId) {
      const [userStatsResult, tokenCallStatsResult] = await Promise.allSettled([
        users.getUserStats(username),
        tokenCalls.getUserStats(userId),
      ]);

      if (userStatsResult.status === 'fulfilled') {
        stats = userStatsResult.value;
      }

      if (tokenCallStatsResult.status === 'fulfilled') {
        if (tokenCallStatsResult.value.totalCalls > 0) {
          tokenCallStats = tokenCallStatsResult.value;
        }
      }
    } else {
      stats = await users.getUserStats(username);
    }
  } catch (error) {
    console.error(`Failed to fetch data for user ${username}:`, error);
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
            padding: '16px 24px 24px 24px',
            flex: 1,
            justifyContent: 'center',
          }}>
          {/* Social Stats Title */}
          <div
            style={{
              color: '#a3a3a3',
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 10,
              width: '100%',
              textAlign: 'left',
              paddingLeft: 4,
              display: 'flex',
            }}>
            Social Stats
          </div>
          {/* First Row: Social Stats */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap', // Ensure 4 items per row
              gap: 12,
              width: '100%',
              marginBottom: 16, // Space before next title
            }}>
            {/* Comments Stat Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {stats.comments}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Comments</div>
            </div>
            {/* Replies Stat Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#8b5cf6',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {stats.replies}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Replies</div>
            </div>
            {/* Upvotes Stat Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#22c55e',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {stats.upvotes}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Upvotes</div>
            </div>
            {/* Downvotes Stat Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#ef4444',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {stats.downvotes}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Downvotes</div>
            </div>
          </div>

          {/* Token Call Stats Title */}
          <div
            style={{
              color: '#a3a3a3',
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 10,
              width: '100%',
              textAlign: 'left',
              paddingLeft: 4,
              display: 'flex',
            }}>
            Token Call Stats
          </div>
          {/* Second Row: Token Call Stats */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap', // Ensure 4 items per row
              gap: 12,
              width: '100%',
            }}>
            {/* Total Calls Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#60a5fa',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {tokenCallStats ? tokenCallStats.totalCalls : '-'}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Total Calls</div>
            </div>

            {/* Hit Rate Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#4ade80',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {tokenCallStats ? formatPercentage(tokenCallStats.accuracyRate) : '-'}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Hit Rate</div>
            </div>

            {/* Average Multiplier Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(250, 204, 21, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#facc15',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {tokenCallStats ? formatMultiplier(tokenCallStats.averageMultiplier) : '-'}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Avg Multiplier</div>
            </div>

            {/* Average Time to Hit Box */}
            <div
              style={{
                flex: '1 1 23%',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 'bold',
                  color: '#f87171',
                  marginBottom: 2,
                  display: 'flex',
                }}>
                {tokenCallStats ? formatPercentage(tokenCallStats.averageTimeToHitRatio) : '-'}
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 14, display: 'flex' }}>Avg Time/Hit</div>
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
