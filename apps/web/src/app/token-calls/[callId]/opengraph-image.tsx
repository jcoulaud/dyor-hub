import { tokenCalls } from '@/lib/api';
import { TokenCallStatus } from '@dyor-hub/types';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'DYOR hub - Token Call';
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

const calculateMultiplier = (
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

  try {
    // Convert to numbers if they're strings
    const refPrice =
      typeof referencePrice === 'string' ? parseFloat(referencePrice) : referencePrice;
    const tgtPrice = typeof targetPrice === 'string' ? parseFloat(targetPrice) : targetPrice;

    // Validate numbers
    if (isNaN(refPrice) || isNaN(tgtPrice) || refPrice === 0) {
      return null;
    }

    return tgtPrice / refPrice;
  } catch {
    return null;
  }
};

const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  try {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    if (numValue < 0.000001) {
      return `$${numValue.toFixed(10)}`;
    } else if (numValue < 0.001) {
      return `$${numValue.toFixed(8)}`;
    } else if (numValue < 1) {
      return `$${numValue.toFixed(4)}`;
    } else if (numValue < 1000) {
      return `$${numValue.toFixed(2)}`;
    } else {
      return `$${numValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }
  } catch {
    return '$0.00';
  }
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

const getStatusDisplay = (status: TokenCallStatus): { name: string; color: string } => {
  switch (status) {
    case TokenCallStatus.VERIFIED_SUCCESS:
      return { name: 'success', color: '#22c55e' };
    case TokenCallStatus.VERIFIED_FAIL:
      return { name: 'fail', color: '#ef4444' };
    case TokenCallStatus.PENDING:
      return { name: 'pending', color: '#f59e0b' };
    default:
      return { name: 'unknown', color: '#a3a3a3' };
  }
};

interface ImageProps {
  params: { callId: string };
}

export default async function ImageGenerator({ params }: ImageProps) {
  let callData;
  try {
    callData = await tokenCalls.getById(params.callId);
  } catch (error) {
    console.error(`[OG Image] Error fetching token call data:`, error);
  }

  if (!callData) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
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
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              marginBottom: 20,
              display: 'flex',
            }}>
            DYOR hub Token Call
          </div>
          <div
            style={{
              fontSize: 32,
              marginBottom: 40,
              color: '#a3a3a3',
              display: 'flex',
            }}>
            View this prediction on dyorhub.xyz
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const { user, token, status, referencePrice, targetPrice, targetDate, createdAt } = callData;
  const username = user?.displayName || 'Anonymous';
  const tokenSymbol = token?.symbol || 'Token';
  const tokenName = token?.name || 'Unknown Token';

  const multiplier = calculateMultiplier(referencePrice, targetPrice);
  const isUp = multiplier !== null && multiplier > 1;
  const statusDisplay = getStatusDisplay(status);

  // Fetch profile picture, token image, and logo
  const [userAvatarUrl, tokenImageUrl, logoSrc] = await Promise.all([
    user?.avatarUrl ? fetchImageAsDataUrl(user.avatarUrl) : Promise.resolve(null),
    token?.imageUrl ? fetchImageAsDataUrl(token.imageUrl) : Promise.resolve(null),
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
        {/* Header with Logo and User */}
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
              <span>Token Call</span>
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
                {username}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: '#a3a3a3',
                  display: 'flex',
                }}>
                @{user?.username || username.toLowerCase().replace(/\s+/g, '')}
              </div>
            </div>
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                width={64}
                height={64}
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
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
                  fontSize: 28,
                  fontWeight: 'bold',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                }}>
                <span>{username.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Box */}
        <div
          style={{
            display: 'flex',
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '24px',
            flex: 1,
          }}>
          {/* Left: Token Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '30%',
              paddingRight: '24px',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
            {tokenImageUrl ? (
              <img
                src={tokenImageUrl}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  marginBottom: 24,
                  border: '4px solid rgba(255, 255, 255, 0.1)',
                }}
                alt={tokenSymbol}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: '#374151',
                  marginBottom: 24,
                  fontSize: 60,
                  fontWeight: 'bold',
                  border: '4px solid rgba(255, 255, 255, 0.1)',
                }}>
                {tokenSymbol.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                fontWeight: 'bold',
                marginBottom: 8,
                textAlign: 'center',
              }}>
              {tokenName}
            </div>
            <div style={{ display: 'flex', fontSize: 20, color: '#9ca3af', textAlign: 'center' }}>
              ${tokenSymbol}
            </div>
          </div>

          {/* Right: Call Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '70%',
              paddingLeft: '24px',
            }}>
            {/* Prices Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 36,
              }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    color: '#9ca3af',
                    marginBottom: 8,
                    fontSize: 20,
                  }}>
                  Reference Price
                </div>
                <div style={{ display: 'flex', fontWeight: 'bold', fontSize: 30 }}>
                  {formatCurrency(referencePrice)}
                </div>
              </div>

              {/* Multiplier */}
              {multiplier !== null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: 30,
                    color: isUp ? '#22c55e' : '#ef4444',
                    background: isUp ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    padding: '8px 16px',
                    borderRadius: 12,
                  }}>
                  {multiplier.toFixed(2)}x
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div
                  style={{
                    display: 'flex',
                    color: '#9ca3af',
                    marginBottom: 8,
                    fontSize: 20,
                  }}>
                  Target Price
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontWeight: 'bold',
                    fontSize: 30,
                    color: isUp ? '#22c55e' : '#ef4444',
                  }}>
                  {formatCurrency(targetPrice)}
                </div>
              </div>
            </div>

            {/* Status & Dates */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: 24,
              }}>
              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: statusDisplay.color,
                    marginRight: 14,
                    boxShadow: `0 0 8px ${statusDisplay.color}`,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      display: 'flex',
                      color: '#9ca3af',
                      marginBottom: 8,
                      fontSize: 18,
                    }}>
                    Status
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontWeight: 'bold',
                      fontSize: 24,
                      textTransform: 'capitalize',
                    }}>
                    {status.replace('VERIFIED_', '').toLowerCase()}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  alignItems: 'flex-end',
                }}>
                {/* Call Date */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      display: 'flex',
                      color: '#9ca3af',
                      marginBottom: 4,
                      fontSize: 18,
                    }}>
                    Call Date
                  </div>
                  <div style={{ display: 'flex', fontWeight: 'bold', fontSize: 20 }}>
                    {formatDate(createdAt)}
                  </div>
                </div>

                {/* Target Date */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      display: 'flex',
                      color: '#9ca3af',
                      marginBottom: 4,
                      fontSize: 18,
                    }}>
                    Target Date
                  </div>
                  <div style={{ display: 'flex', fontWeight: 'bold', fontSize: 20 }}>
                    {formatDate(targetDate)}
                  </div>
                </div>
              </div>
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
              <span>See call</span>
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
