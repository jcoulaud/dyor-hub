import { tokenCalls } from '@/lib/api';
import { calculateMultiplier, formatLargeNumber } from '@/lib/utils';
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

// Format large number for display with dollar sign
const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  const formatted = formatLargeNumber(value);
  return formatted === '-' ? formatted : `$${formatted}`;
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`;
  } catch {
    return 'Invalid Date';
  }
};

const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
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

  const {
    user,
    token,
    status,
    referencePrice,
    targetPrice,
    targetDate,
    createdAt,
    referenceSupply,
  } = callData;
  const username = user?.displayName || 'Anonymous';
  const tokenSymbol = token?.symbol || 'Token';
  const tokenName = token?.name || 'Unknown Token';

  const multiplier = calculateMultiplier(referencePrice, targetPrice);
  const isUp = multiplier !== null && multiplier > 1;
  const statusDisplay = getStatusDisplay(status);

  // Calculate market caps
  const referenceMarketCap =
    referencePrice && referenceSupply ? referencePrice * referenceSupply : null;
  const targetMarketCap = targetPrice && referenceSupply ? targetPrice * referenceSupply : null;

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
            borderRadius: 20,
            backgroundColor: 'rgba(18, 18, 23, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            padding: '32px',
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}>
          {/* Background gradient accent */}
          <div
            style={{
              position: 'absolute',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0) 70%)',
              top: '-150px',
              right: '-150px',
              zIndex: 0,
            }}
          />

          {/* Left: Token Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '30%',
              paddingRight: '40px',
              position: 'relative',
              zIndex: 1,
            }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 22,
                position: 'relative',
                marginTop: 24,
              }}>
              <div
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  position: 'absolute',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                }}
              />
              {tokenImageUrl ? (
                <img
                  src={tokenImageUrl}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    border: '4px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                    objectFit: 'cover',
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
                    background: 'linear-gradient(135deg, #3d4a5c 0%, #2d3748 100%)',
                    fontSize: 60,
                    fontWeight: 'bold',
                    border: '4px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                    position: 'relative',
                  }}>
                  {tokenSymbol.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 32,
                fontWeight: 'bold',
                marginBottom: 8,
                textAlign: 'center',
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              }}>
              {tokenName}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#a3a3a3',
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                fontWeight: 'bold',
                letterSpacing: '0.03em',
              }}>
              ${tokenSymbol}
            </div>
          </div>

          {/* Vertical Divider */}
          <div
            style={{
              width: 1,
              alignSelf: 'stretch',
              background:
                'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.1), transparent)',
              margin: '16px 0',
              zIndex: 1,
            }}
          />

          {/* Right: Call Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '70%',
              paddingLeft: '40px',
              position: 'relative',
              zIndex: 1,
            }}>
            {/* Price Comparison Card */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 16,
                padding: '24px 32px',
                marginBottom: 32,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
              }}>
              {/* Reference Market Cap */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    color: '#9ca3af',
                    marginBottom: 10,
                    fontSize: 20,
                    fontWeight: 500,
                  }}>
                  Reference MCap
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontWeight: 'bold',
                    fontSize: 32,
                    color: '#f1f5f9',
                  }}>
                  {formatCurrency(referenceMarketCap)}
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
                    fontSize: 36,
                    color: isUp ? '#22c55e' : '#ef4444',
                    background: isUp ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    padding: '12px 20px',
                    borderRadius: 12,
                    boxShadow: isUp
                      ? '0 0 20px rgba(34, 197, 94, 0.2)'
                      : '0 0 20px rgba(239, 68, 68, 0.2)',
                    border: isUp
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : '1px solid rgba(239, 68, 68, 0.3)',
                    marginTop: 8,
                  }}>
                  {multiplier.toFixed(2)}x
                </div>
              )}

              {/* Target Market Cap */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div
                  style={{
                    display: 'flex',
                    color: '#9ca3af',
                    marginBottom: 10,
                    fontSize: 20,
                    fontWeight: 500,
                  }}>
                  Target MCap
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontWeight: 'bold',
                    fontSize: 32,
                    color: isUp ? '#22c55e' : '#ef4444',
                    textShadow: isUp
                      ? '0 0 8px rgba(34, 197, 94, 0.3)'
                      : '0 0 8px rgba(239, 68, 68, 0.3)',
                  }}>
                  {formatCurrency(targetMarketCap)}
                </div>
              </div>
            </div>

            {/* Status and Dates Section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 16,
                padding: '24px 32px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}>
              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: statusDisplay.color,
                    marginRight: 16,
                    boxShadow: `0 0 12px ${statusDisplay.color}`,
                    border: `2px solid ${
                      statusDisplay.color === '#f59e0b'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : statusDisplay.color === '#22c55e'
                          ? 'rgba(34, 197, 94, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)'
                    }`,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      display: 'flex',
                      color: '#9ca3af',
                      marginBottom: 8,
                      fontSize: 18,
                      fontWeight: 500,
                    }}>
                    Status
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontWeight: 'bold',
                      fontSize: 26,
                      textTransform: 'capitalize',
                      color: statusDisplay.color,
                    }}>
                    {status.replace('VERIFIED_', '').toLowerCase()}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div
                style={{
                  display: 'flex',
                  gap: '32px',
                }}>
                {/* Call Date */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      display: 'flex',
                      color: '#9ca3af',
                      marginBottom: 8,
                      fontSize: 18,
                      fontWeight: 500,
                    }}>
                    Call Date
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                    <div
                      style={{
                        display: 'flex',
                        fontWeight: 'bold',
                        fontSize: 22,
                        color: '#f1f5f9',
                        alignItems: 'center',
                      }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          marginRight: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: '#9ca3af',
                        }}>
                        📅
                      </div>
                      {formatDate(createdAt)}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        marginLeft: 26,
                        fontSize: 16,
                        fontWeight: 'medium',
                        color: '#f59e0b',
                      }}>
                      {formatTime(createdAt)}
                    </div>
                  </div>
                </div>

                {/* Target Date */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      display: 'flex',
                      color: '#9ca3af',
                      marginBottom: 8,
                      fontSize: 18,
                      fontWeight: 500,
                    }}>
                    Target Date
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                    <div
                      style={{
                        display: 'flex',
                        fontWeight: 'bold',
                        fontSize: 22,
                        color: '#f1f5f9',
                        alignItems: 'center',
                      }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          marginRight: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: '#9ca3af',
                        }}>
                        🎯
                      </div>
                      {formatDate(targetDate)}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        marginLeft: 26,
                        fontSize: 16,
                        fontWeight: 'medium',
                        color: '#f59e0b',
                      }}>
                      {formatTime(targetDate)}
                    </div>
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
