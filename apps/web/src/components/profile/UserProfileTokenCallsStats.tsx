'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { tokenCalls } from '@/lib/api';
import { formatLargeNumber } from '@/lib/utils';
import { BarChart3, CheckCircle, Clock, HelpCircle, Scale, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface UserProfileTokenCallsStatsProps {
  userId: string;
  username: string;
}

interface UserTokenCallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  accuracyRate: number;
  averageGainPercent?: number | null;
  averageTimeToHitRatio?: number | null;
  averageMultiplier?: number | null;
  averageMarketCapAtCallTime?: number | null;
}

export function UserProfileTokenCallsStats({ userId, username }: UserProfileTokenCallsStatsProps) {
  const [stats, setStats] = useState<UserTokenCallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTokenCallStats() {
      if (!userId) return;

      try {
        setIsLoading(true);
        const data = await tokenCalls.getUserStats(userId);
        setStats(data);
      } catch (error) {
        console.error('Error fetching token call stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTokenCallStats();
  }, [userId]);

  const formatAccuracyRate = (rate: number | undefined, verifiedCalls: number) => {
    if (rate === undefined || rate === null || verifiedCalls === 0) return '-';

    const percentage = rate * 100;
    return percentage % 1 === 0 ? `${Math.round(percentage)}%` : `${percentage.toFixed(1)}%`;
  };

  const formatAvgTimeToHit = (ratio: number | undefined | null) => {
    if (ratio === undefined || ratio === null) return '-';

    const percentage = ratio * 100;
    return percentage % 1 === 0 ? `${Math.round(percentage)}%` : `${percentage.toFixed(1)}%`;
  };

  const formatAvgMultiplier = (multiplier: number | undefined | null) => {
    if (multiplier === undefined || multiplier === null) return '-';

    return multiplier % 1 === 0 ? `${Math.round(multiplier)}x` : `${multiplier.toFixed(2)}x`;
  };

  if (isLoading) {
    return (
      <div className='mt-6 mb-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl'>
        <div className='p-4 border-b border-white/5 flex justify-between items-center'>
          <Skeleton className='h-6 w-36' />
          <Skeleton className='h-8 w-24' />
        </div>
        <div className='p-4'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='flex items-center'>
                <Skeleton className='h-10 w-10 rounded-md mr-3' />
                <div>
                  <Skeleton className='h-3 w-16 mb-2' />
                  <Skeleton className='h-5 w-8' />
                </div>
              </div>
            ))}
            <div className='flex items-center'>
              <Skeleton className='h-10 w-10 rounded-md mr-3' />
              <div>
                <Skeleton className='h-3 w-16 mb-2' />
                <Skeleton className='h-5 w-8' />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalCalls === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className='mt-6 mb-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl'>
        <div className='p-4 border-b border-white/5 flex justify-between items-center'>
          <div className='flex items-center gap-2'>
            <BarChart3 className='h-5 w-5 text-indigo-400' />
            <h2 className='text-lg font-semibold text-white'>Token Call Stats</h2>
          </div>
          <Link href={`/token-calls?username=${username}`} passHref>
            <Button
              variant='outline'
              size='sm'
              className='text-xs border-indigo-500/40 bg-indigo-900/30 hover:bg-indigo-800/40 text-indigo-300 hover:text-indigo-200 hover:border-indigo-500/60 transition-colors cursor-pointer'>
              View All Calls
            </Button>
          </Link>
        </div>

        <div className='p-4'>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
            {/* Total Calls */}
            <div className='flex items-center'>
              <div className='w-10 h-10 rounded bg-zinc-800/80 flex items-center justify-center mr-3'>
                <BarChart3 className='h-5 w-5 text-indigo-400' />
              </div>
              <div>
                <p className='text-zinc-400 text-xs flex items-center gap-1'>
                  Calls
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className='h-3 w-3 opacity-60' />
                    </TooltipTrigger>
                    <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                      <p>Total token calls made (Successful/Total)</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <div className='flex items-center'>
                  <p className='text-base font-semibold text-white'>{stats.totalCalls}</p>
                  <span className='text-xs text-zinc-500 ml-1'>
                    ({stats.successfulCalls}/{stats.totalCalls})
                  </span>
                </div>
              </div>
            </div>

            {/* Success Rate / Hit Rate */}
            <div className='flex items-center'>
              <div className='w-10 h-10 rounded bg-zinc-800/80 flex items-center justify-center mr-3'>
                <CheckCircle className='h-5 w-5 text-green-400' />
              </div>
              <div>
                <p className='text-zinc-400 text-xs flex items-center gap-1'>
                  Hit Rate
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className='h-3 w-3 opacity-60' />
                    </TooltipTrigger>
                    <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                      <p>Percentage of successful token calls out of verified calls</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className='text-base font-semibold text-white'>
                  {formatAccuracyRate(
                    stats.accuracyRate,
                    stats.successfulCalls + stats.failedCalls,
                  )}
                </p>
              </div>
            </div>

            {/* Time Accuracy - Always show */}
            <div className='flex items-center'>
              <div className='w-10 h-10 rounded bg-zinc-800/80 flex items-center justify-center mr-3'>
                <Clock className='h-5 w-5 text-amber-400' />
              </div>
              <div>
                <p className='text-zinc-400 text-xs flex items-center gap-1'>
                  Time Accuracy
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className='h-3 w-3 opacity-60' />
                    </TooltipTrigger>
                    <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                      <p>Avg. timing relative to target date (100% = hit on target date)</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className='text-base font-semibold text-white'>
                  {formatAvgTimeToHit(stats.averageTimeToHitRatio)}
                </p>
              </div>
            </div>

            {/* Average Multiplier */}
            <div className='flex items-center'>
              <div className='w-10 h-10 rounded bg-zinc-800/80 flex items-center justify-center mr-3'>
                <Scale className='h-5 w-5 text-purple-400' />
              </div>
              <div>
                <p className='text-zinc-400 text-xs flex items-center gap-1'>
                  Avg Multiplier
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className='h-3 w-3 opacity-60' />
                    </TooltipTrigger>
                    <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                      <p>Average multiplier achieved on successful calls</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className='text-base font-semibold text-white'>
                  {formatAvgMultiplier(stats.averageMultiplier)}
                </p>
              </div>
            </div>

            {/* Average MCAP */}
            <div className='flex items-center'>
              <div className='w-10 h-10 rounded bg-zinc-800/80 flex items-center justify-center mr-3'>
                <Trophy className='h-5 w-5 text-teal-400' />
              </div>
              <div>
                <p className='text-zinc-400 text-xs flex items-center gap-1'>
                  Avg MCAP
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className='h-3 w-3 opacity-60' />
                    </TooltipTrigger>
                    <TooltipContent className='bg-zinc-800 border-zinc-700 text-zinc-200'>
                      <p>Average market cap at time of call</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className='text-base font-semibold text-white'>
                  {stats.averageMarketCapAtCallTime !== null &&
                  stats.averageMarketCapAtCallTime !== undefined
                    ? `$${formatLargeNumber(stats.averageMarketCapAtCallTime)}`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
