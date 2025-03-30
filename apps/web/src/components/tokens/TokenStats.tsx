import { Skeleton } from '@/components/ui/skeleton';
import { truncateAddress } from '@/lib/utils';
import type { TokenStats as TokenStatsType, TwitterUsernameHistoryEntity } from '@dyor-hub/types';
import { TokenHolder } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';
import { BarChart2, DollarSign, History, Twitter, Users } from 'lucide-react';
import Link from 'next/link';
import { SolscanButton } from '../SolscanButton';
import TokenPriceChart from './TokenPriceChart';
import TopHoldersPieChart from './TokenHolderPieChart';

interface TokenStatsProps {
  stats: TokenStatsType;
  tokenMintAddress: string;
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

// Helper function to format large numbers with K/M/B suffixes
const formatLargeNumber = (num: string | number | undefined): string => {
  if (num === undefined) return '0';

  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';

  if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K';
  }
  return value.toFixed(2);
};

const formatPercentage = (num: number): string => {
  return num.toFixed(2);
};

export const TokenStats = ({ stats, twitterHistory, tokenMintAddress }: TokenStatsProps) => {
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

      {/* Price Chart */}
      <TokenPriceChart tokenAddress={tokenMintAddress} totalSupply={stats.totalSupply} />

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
          {/* Pie Chart */}
          <TopHoldersPieChart topHolders={stats.topHolders} />
        </div>
      )}

      {/* Twitter History */}
      {twitterHistory?.history && twitterHistory.history.length > 0 && (
        <div className='space-y-3 mt-8'>
          <h3 className='text-sm font-medium text-zinc-400 flex items-center justify-between'>
            <div className='flex items-center'>
              <History className='h-4 w-4 mr-2 text-red-400' />
              Twitter History
            </div>
            <Link
              href={`https://twitter.com/${twitterHistory.twitterUsername}`}
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-red-300 transition-colors cursor-pointer'>
              <Twitter className='h-4 w-4 text-red-400' />
            </Link>
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
};
