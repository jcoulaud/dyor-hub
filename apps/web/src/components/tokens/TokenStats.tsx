import { truncateAddress } from '@/lib/utils';
import type { TokenStats as TokenStatsType, TwitterUsernameHistoryEntity } from '@dyor-hub/types';
import { TokenHolder } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';
import { BarChart2, DollarSign, History, Users } from 'lucide-react';
import { SolscanButton } from '../SolscanButton';

interface TokenStatsProps {
  stats: TokenStatsType;
  twitterHistory?: TwitterUsernameHistoryEntity | null;
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

// Helper function to format large numbers with appropriate suffixes (K, M, B, T)
const formatLargeNumber = (num: number | string | undefined | null): string => {
  try {
    if (num === null || num === undefined) {
      return '0';
    }

    const numValue = typeof num === 'number' ? num : Number(num);

    if (isNaN(numValue)) {
      return '0';
    }

    if (numValue < 1000) {
      return numValue.toLocaleString();
    } else if (numValue < 1000000) {
      return (numValue / 1000).toFixed(2) + 'K';
    } else if (numValue < 1000000000) {
      return (numValue / 1000000).toFixed(2) + 'M';
    } else if (numValue < 1000000000000) {
      return (numValue / 1000000000).toFixed(2) + 'B';
    } else {
      return (numValue / 1000000000000).toFixed(2) + 'T';
    }
  } catch {
    return '0';
  }
};

// Helper function to safely format a percentage with 2 decimal places
const formatPercentage = (percentage: number | string | undefined | null): string => {
  try {
    if (typeof percentage === 'number') {
      return percentage.toFixed(2);
    }

    if (percentage === null || percentage === undefined) {
      return '0.00';
    }

    const numPercentage = Number(percentage);
    return isNaN(numPercentage) ? '0.00' : numPercentage.toFixed(2);
  } catch {
    return '0.00';
  }
};

export function TokenStats({ stats, twitterHistory }: TokenStatsProps) {
  return (
    <div className='space-y-6 text-zinc-300'>
      {/* Market Data */}
      {(stats.price || stats.marketCap || stats.volume24h) && (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
            <DollarSign className='h-4 w-4 mr-2 text-green-400' />
            Market Data
          </h3>
          <div className='space-y-2'>
            {stats.price !== undefined && (
              <div className='flex justify-between items-center'>
                <span className='text-sm'>Price:</span>
                <span className='font-medium'>${formatPrice(stats.price)}</span>
              </div>
            )}
            {stats.marketCap !== undefined && (
              <div className='flex justify-between items-center'>
                <span className='text-sm'>Market Cap:</span>
                <span className='font-medium'>${formatLargeNumber(stats.marketCap)}</span>
              </div>
            )}
            {stats.volume24h !== undefined && (
              <div className='flex justify-between items-center'>
                <span className='text-sm'>24h Volume:</span>
                <span className='font-medium'>${formatLargeNumber(stats.volume24h)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supply Information */}
      <div className='space-y-3'>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
          <BarChart2 className='h-4 w-4 mr-2 text-blue-400' />
          Supply Information
        </h3>
        <div className='space-y-2'>
          <div className='flex justify-between items-center'>
            <span className='text-sm'>Total Supply:</span>
            <span className='font-medium'>{formatLargeNumber(stats.totalSupply)}</span>
          </div>
          {stats.circulatingSupply && (
            <div className='flex justify-between items-center'>
              <span className='text-sm'>Circulating Supply:</span>
              <span className='font-medium'>{formatLargeNumber(stats.circulatingSupply)}</span>
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

      {/* Twitter History */}
      {twitterHistory?.history && twitterHistory.history.length > 0 && (
        <div className='space-y-3 mt-8'>
          <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
            <History className='h-4 w-4 mr-2 text-red-400' />
            Twitter History
          </h3>
          <div className='space-y-2'>
            {[...twitterHistory.history].reverse().map((entry, index) => (
              <div key={index} className='flex items-center justify-between py-1'>
                <span className='text-sm font-medium text-red-400'>@{entry.username}</span>
                <span className='text-xs text-zinc-500'>
                  {formatDistanceToNow(new Date(entry.last_checked), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className='pt-2 text-xs text-zinc-500 text-right'>
        Last updated: {new Date(stats.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
