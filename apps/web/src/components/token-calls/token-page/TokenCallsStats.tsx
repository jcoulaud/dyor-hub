'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { TokenCall, TokenCallStatus } from '@dyor-hub/types';
import { Activity, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface TokenCallsStatsProps {
  tokenCalls: TokenCall[];
  isLoading: boolean;
}

export function TokenCallsStats({ tokenCalls, isLoading }: TokenCallsStatsProps) {
  const stats = useMemo(() => {
    if (!tokenCalls.length) {
      return {
        total: 0,
        ongoing: 0,
        successful: 0,
        failed: 0,
        successRate: null,
      };
    }

    const total = tokenCalls.length;
    const ongoing = tokenCalls.filter((call) => call.status === TokenCallStatus.PENDING).length;
    const successful = tokenCalls.filter(
      (call) => call.status === TokenCallStatus.VERIFIED_SUCCESS,
    ).length;
    const failed = tokenCalls.filter(
      (call) => call.status === TokenCallStatus.VERIFIED_FAIL,
    ).length;

    const completedCalls = successful + failed;
    const successRate = completedCalls > 0 ? Math.round((successful / completedCalls) * 100) : null;

    return {
      total,
      ongoing,
      successful,
      failed,
      successRate,
    };
  }, [tokenCalls]);

  if (isLoading) {
    return (
      <div className='bg-zinc-900/40 rounded-lg p-3 mb-4'>
        <div className='grid grid-cols-2 gap-3'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='flex items-center'>
              <Skeleton className='h-8 w-8 rounded-md mr-3' />
              <div>
                <Skeleton className='h-3 w-12 mb-1' />
                <Skeleton className='h-5 w-6' />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-zinc-900/40 rounded-lg p-3 mb-4'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-3'>
        <div className='flex items-center'>
          <div className='w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center mr-3'>
            <Activity className='h-4 w-4 text-indigo-400' />
          </div>
          <div>
            <p className='text-zinc-500 text-xs'>Total Calls</p>
            <p className='text-base font-semibold'>{stats.total}</p>
          </div>
        </div>

        <div className='flex items-center'>
          <div className='w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center mr-3'>
            <Clock className='h-4 w-4 text-amber-400' />
          </div>
          <div>
            <p className='text-zinc-500 text-xs'>Ongoing</p>
            <p className='text-base font-semibold'>{stats.ongoing}</p>
          </div>
        </div>

        <div className='flex items-center'>
          <div className='w-8 h-8 rounded bg-green-500/10 flex items-center justify-center mr-3'>
            <CheckCircle2 className='h-4 w-4 text-green-400' />
          </div>
          <div>
            <p className='text-zinc-500 text-xs'>Successful</p>
            <p className='text-base font-semibold'>{stats.successful}</p>
          </div>
        </div>

        <div className='flex items-center'>
          <div className='w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center mr-3'>
            <TrendingUp className='h-4 w-4 text-purple-400' />
          </div>
          <div>
            <p className='text-zinc-500 text-xs'>Success Rate</p>
            <p className='text-base font-semibold'>
              {stats.successRate !== null ? `${stats.successRate}%` : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
