import { Skeleton } from '@/components/ui/skeleton';
import { formatLargeNumber, truncateAddress } from '@/lib/utils';
import { TokenHolder, TokenStats as TokenStatsType } from '@dyor-hub/types';
import { format, formatDistanceStrict } from 'date-fns';
import { BarChart2, DollarSign, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { SolscanButton } from '../SolscanButton';
import TokenPriceChart from './TokenPriceChart';

interface TokenStatsProps {
  stats: TokenStatsType;
  tokenMintAddress: string;
  tokenSymbol?: string;
}

// Helper function to safely format a price with 6 decimal places
const formatPrice = (price: number | string | undefined | null): string => {
  try {
    if (typeof price === 'number') {
      return price.toFixed(6);
    }

    if (price === null || price === undefined) {
      return '0.000000';
    }

    const numPrice = Number(price);
    return isNaN(numPrice) ? '0.000000' : numPrice.toFixed(6);
  } catch {
    return '0.000000';
  }
};

const formatPercentage = (num: number): string => {
  return num.toFixed(2);
};

const formatDateSafe = (
  dateString: string | Date | undefined | null,
  formatType: 'distance' | 'format' = 'distance',
  formatPattern = 'PPp',
): string => {
  try {
    if (!dateString) return 'Unknown';

    if (typeof dateString === 'object' && dateString !== null && !(dateString instanceof Date)) {
      return 'Invalid date';
    }

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) return 'Invalid date';

    if (formatType === 'distance') {
      return formatDistanceStrict(date, new Date()) + ' ago';
    } else {
      return format(date, formatPattern);
    }
  } catch {
    return 'Invalid date';
  }
};

export const TokenStats = ({ stats, tokenMintAddress, tokenSymbol }: TokenStatsProps) => {
  if (!stats) {
    return (
      <div className='space-y-6'>
        <div className='space-y-3'>
          <Skeleton className='h-5 w-24' />
          <div className='space-y-2'>
            <Skeleton className='h-6 w-full' />
            <Skeleton className='h-6 w-full' />
            <Skeleton className='h-6 w-full' />
          </div>
        </div>

        <div className='w-full h-[120px] bg-zinc-900 rounded-xl'>
          <div className='h-full w-full flex items-center justify-center'>
            <div className='w-full h-[80px] bg-zinc-800/50 animate-pulse rounded-lg'></div>
          </div>
        </div>

        <div className='space-y-3'>
          <Skeleton className='h-5 w-36' />
          <div className='space-y-2'>
            <Skeleton className='h-6 w-full' />
            <Skeleton className='h-6 w-full' />
          </div>
        </div>
      </div>
    );
  }

  const adjustedTotalSupply = stats.totalSupply ? parseFloat(stats.totalSupply) : null;
  const adjustedCirculatingSupply = stats.circulatingSupply
    ? parseFloat(stats.circulatingSupply)
    : null;

  return (
    <div className='space-y-6 text-zinc-300'>
      {/* Market Data */}
      <div className='space-y-3'>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
          <DollarSign className='h-4 w-4 mr-2 text-blue-400' />
          Market Data
        </h3>
        <div className='space-y-2'>
          {/* Price */}
          {stats.price != null && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>Price:</span>
              <span className='font-medium'>${formatPrice(stats.price)}</span>
            </div>
          )}

          {/* Market Cap */}
          {stats.marketCap != null && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>Market Cap:</span>
              <span className='font-medium'>${formatLargeNumber(stats.marketCap)}</span>
            </div>
          )}

          {/* 24h Volume */}
          {stats.volume24h != null && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>24h Volume:</span>
              <div className='flex items-center gap-1'>
                <span className='font-medium'>${formatLargeNumber(stats.volume24h)}</span>
                {stats.volume24hChangePercent != null && (
                  <span
                    className={`flex items-center text-xs ml-1 ${
                      stats.volume24hChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                    {stats.volume24hChangePercent >= 0 ? (
                      <TrendingUp className='w-3 h-3 mr-0.5' />
                    ) : (
                      <TrendingDown className='w-3 h-3 mr-0.5' />
                    )}
                    {Math.abs(stats.volume24hChangePercent).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Buy/Sell Ratio */}
          {stats.buyCount24h != null && stats.sellCount24h != null && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>Buy/Sell Ratio:</span>
              <div className='flex items-center'>
                <span className='font-medium text-green-400'>{stats.buyCount24h}</span>
                <span className='mx-1 text-zinc-500'>/</span>
                <span className='font-medium text-red-400'>{stats.sellCount24h}</span>
              </div>
            </div>
          )}

          {/* Unique Trading Wallets */}
          {stats.uniqueWallets24h != null && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>24h Unique Trading Wallets:</span>
              <span className='font-medium'>{stats.uniqueWallets24h}</span>
            </div>
          )}

          {/* Total Holders */}
          {stats.holders != null && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>Total Holders:</span>
              <span className='font-medium'>
                {typeof stats.holders === 'number' ? stats.holders.toLocaleString() : stats.holders}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Price Chart */}
      <TokenPriceChart
        tokenAddress={tokenMintAddress}
        totalSupply={stats.totalSupply}
        tokenSymbol={tokenSymbol}
      />

      {/* Supply Information */}
      <div className='space-y-3'>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
          <BarChart2 className='h-4 w-4 mr-2 text-blue-400' />
          Supply Information
        </h3>
        <div className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-sm'>Total Supply:</span>
            <span className='font-medium'>{formatLargeNumber(adjustedTotalSupply) || '-'}</span>
          </div>
          {adjustedCirculatingSupply !== null && adjustedCirculatingSupply > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>Circulating Supply:</span>
              <span className='font-medium'>{formatLargeNumber(adjustedCirculatingSupply)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Holders */}
      {stats.topHolders && stats.topHolders.length > 0 && (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
            <Users className='h-4 w-4 mr-2 text-blue-400' />
            Top Holders
          </h3>
          <div className='space-y-2'>
            {stats.topHolders.map((holder: TokenHolder, index: number) => (
              <div key={index} className='flex items-center justify-between'>
                <SolscanButton
                  address={holder.address}
                  type='account'
                  className='text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors cursor-pointer'>
                  {truncateAddress(holder.address)}
                </SolscanButton>
                <div className='flex items-center'>
                  <span className='text-xs font-medium whitespace-nowrap mr-2'>
                    {formatPercentage(holder.percentage)}%
                  </span>
                  <div className='w-[69px] bg-zinc-800 rounded-full h-1.5 overflow-hidden'>
                    <div
                      className='bg-blue-500 h-1.5 rounded-full'
                      style={{ width: `${Math.min(holder.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className='pt-2 text-xs text-zinc-500 text-right'>
        Last updated: {formatDateSafe(stats.lastUpdated, 'format', 'PPp')}
      </div>
    </div>
  );
};
