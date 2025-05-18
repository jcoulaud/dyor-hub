import { comments, tokenCalls, tokens } from '@/lib/api';
import { formatLargeNumber } from '@/lib/utils';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'DYOR hub - Token Info';
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

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
};

// Function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export default async function Image({ params }: { params: { mintAddress: string } }) {
  const { mintAddress } = params;

  // Initialize default values
  let tokenSymbol = '';
  let tokenName = '';
  let tokenDescription = 'Token information on DYOR hub';
  let tokenImageUrl = '';
  let price: number | null = null;
  let marketCap: number | null = null;
  let volume24h: number | null = null;
  let holders: number | null = null;
  let verifiedCreator = false;
  let commentCount = 0;
  let tokenCallsCount = 0;

  try {
    const [tokenResult, tokenStatsResult, commentResult, tokenCallsResult] =
      await Promise.allSettled([
        tokens.getByMintAddress(mintAddress),
        tokens.getTokenStats(mintAddress),
        comments.list(mintAddress, 1, 1),
        tokenCalls.list({ tokenId: mintAddress }, { page: 1, limit: 1 }),
      ]);

    if (tokenResult.status === 'fulfilled' && tokenResult.value) {
      const tokenData = tokenResult.value;
      tokenSymbol = tokenData.symbol || '';
      tokenName = tokenData.name || '';
      tokenDescription = tokenData.description || 'Token information on DYOR hub';
      tokenImageUrl = tokenData.imageUrl || '';
      verifiedCreator = !!tokenData.verifiedCreatorUserId;
    }

    if (tokenStatsResult.status === 'fulfilled' && tokenStatsResult.value) {
      const statsData = tokenStatsResult.value;
      price = statsData.price || null;
      marketCap = statsData.marketCap || null;
      volume24h = statsData.volume24h || null;
      holders = statsData.holders || null;
    }

    if (commentResult.status === 'fulfilled' && commentResult.value) {
      commentCount = commentResult.value.meta.total || 0;
    }

    if (tokenCallsResult.status === 'fulfilled' && tokenCallsResult.value) {
      tokenCallsCount = tokenCallsResult.value.total || 0;
    }
  } catch {
    // Continue with default values set above
  }

  const [tokenImageSrc, logoSrc] = await Promise.all([
    tokenImageUrl ? fetchImageAsDataUrl(tokenImageUrl) : Promise.resolve(null),
    fetchImageAsDataUrl('/logo-white.png'),
  ]);

  // Format metrics for display
  const priceDisplay = price !== null ? formatPrice(price) : 'N/A';
  const marketCapDisplay = marketCap !== null ? `$${formatLargeNumber(marketCap)}` : 'N/A';
  const volumeDisplay = volume24h !== null ? `$${formatLargeNumber(volume24h)}` : 'N/A';
  const holdersDisplay = holders !== null ? holders.toLocaleString() : 'N/A';
  const commentCountDisplay = commentCount.toLocaleString();
  const tokenCallsCountDisplay = tokenCallsCount.toLocaleString();

  // Truncate description to prevent overflow
  const truncatedDescription = truncateText(tokenDescription, 160);

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
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}>
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px 40px',
            backgroundColor: '#1e293b', // Darker blue background
            borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {logoSrc ? (
              <img
                src={logoSrc as unknown as string}
                width={100}
                height={33}
                style={{ objectFit: 'contain', marginRight: 16 }}
                alt='DYOR hub Logo'
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 100,
                  height: 33,
                }}>
                <span
                  style={{ display: 'flex', color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>
                  DYOR hub
                </span>
              </div>
            )}
            <span style={{ display: 'flex', color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
              Token Overview
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '32px 40px 30px',
            justifyContent: 'flex-start',
          }}>
          {/* Token Information Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 30, // Reduced spacing before button
            }}>
            {/* Top section with token info and market cap */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 20,
                alignItems: 'flex-start',
              }}>
              {/* Left side - token info */}
              <div style={{ display: 'flex', maxWidth: '75%' }}>
                {/* Token image */}
                {tokenImageSrc ? (
                  <img
                    src={tokenImageSrc}
                    width={80}
                    height={80}
                    style={{ borderRadius: '50%', marginRight: 20, flexShrink: 0 }}
                    alt={tokenName}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      marginRight: 20,
                      flexShrink: 0,
                    }}>
                    <span
                      style={{ display: 'flex', color: 'white', fontSize: 32, fontWeight: 'bold' }}>
                      {tokenSymbol.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Token details */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        display: 'flex',
                        color: '#3b82f6',
                        fontSize: 42,
                        fontWeight: 'bold',
                        marginRight: 12,
                      }}>
                      ${tokenSymbol}
                    </span>
                    {verifiedCreator && (
                      <span
                        style={{
                          display: 'flex',
                          backgroundColor: 'rgba(34, 197, 94, 0.2)',
                          borderRadius: 8,
                          padding: '4px 12px',
                          color: '#22c55e',
                          fontSize: 16,
                          fontWeight: 'bold',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <span style={{ display: 'flex', color: '#ffffff', fontSize: 24, marginTop: 4 }}>
                    {tokenName}
                  </span>
                </div>
              </div>

              {/* Right side - market cap */}
              {marketCap !== null && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                  }}>
                  <span style={{ display: 'flex', color: '#9ca3af', fontSize: 18 }}>
                    Market Cap
                  </span>
                  <span
                    style={{ display: 'flex', color: '#ffffff', fontSize: 32, fontWeight: 'bold' }}>
                    {marketCapDisplay}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div
              style={{
                display: 'flex',
                marginBottom: 24,
                minHeight: 60,
                maxHeight: 80,
                overflow: 'hidden',
              }}>
              <span
                style={{
                  display: 'flex',
                  color: '#ffffff',
                  fontSize: 18,
                  lineHeight: 1.4,
                  opacity: 0.9,
                }}>
                {truncatedDescription}
              </span>
            </div>

            {/* Stats Row 1 - Price and Volume */}
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 12,
                  padding: 20,
                  marginRight: 16,
                  flex: 1,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                <span style={{ display: 'flex', color: '#9ca3af', fontSize: 16, marginBottom: 6 }}>
                  Price
                </span>
                <span
                  style={{ display: 'flex', color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
                  {priceDisplay}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 12,
                  padding: 20,
                  flex: 1,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                <span style={{ display: 'flex', color: '#9ca3af', fontSize: 16, marginBottom: 6 }}>
                  24h Volume
                </span>
                <span
                  style={{ display: 'flex', color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
                  {volumeDisplay}
                </span>
              </div>
            </div>

            {/* Stats Row 2 - Holders, Comments, Token Calls */}
            <div style={{ display: 'flex' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 12,
                  padding: 20,
                  marginRight: 16,
                  flex: 1,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                <span style={{ display: 'flex', color: '#9ca3af', fontSize: 16, marginBottom: 6 }}>
                  Holders
                </span>
                <span
                  style={{ display: 'flex', color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
                  {holdersDisplay}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 12,
                  padding: 20,
                  marginRight: 16,
                  flex: 1,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                <span style={{ display: 'flex', color: '#9ca3af', fontSize: 16, marginBottom: 6 }}>
                  Comments
                </span>
                <span
                  style={{ display: 'flex', color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
                  {commentCountDisplay}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 12,
                  padding: 20,
                  flex: 1,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                <span style={{ display: 'flex', color: '#9ca3af', fontSize: 16, marginBottom: 6 }}>
                  Token Calls
                </span>
                <span
                  style={{ display: 'flex', color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
                  {tokenCallsCountDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Button - Centered */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#3b82f6',
              borderRadius: 8,
              padding: '10px 24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              alignSelf: 'center',
            }}>
            <span
              style={{
                display: 'flex',
                color: 'white',
                fontSize: 18,
                fontWeight: 'bold',
              }}>
              Visit DYOR hub for more insights →
            </span>
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
