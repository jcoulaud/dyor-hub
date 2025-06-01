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
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-zinc-600/30 to-zinc-500/30 rounded-xl blur opacity-30'></div>
              <div className='relative bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4'>
                <div className='flex items-center'>
                  <Skeleton className='h-10 w-10 rounded-lg mr-3' />
                  <div className='flex-1'>
                    <Skeleton className='h-3 w-16 mb-2' />
                    <Skeleton className='h-6 w-8' />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statsData = [
    {
      id: 'total',
      label: 'Total Calls',
      value: stats.total,
      icon: Activity,
      color: 'indigo',
      bgGradient: 'from-indigo-500/10 to-indigo-600/10',
      borderColor: 'border-indigo-500/20',
      iconColor: 'text-indigo-400',
      glowColor: 'shadow-indigo-500/10',
    },
    {
      id: 'ongoing',
      label: 'Ongoing',
      value: stats.ongoing,
      icon: Clock,
      color: 'amber',
      bgGradient: 'from-amber-500/10 to-yellow-600/10',
      borderColor: 'border-amber-500/20',
      iconColor: 'text-amber-400',
      glowColor: 'shadow-amber-500/10',
    },
    {
      id: 'successful',
      label: 'Successful',
      value: stats.successful,
      icon: CheckCircle2,
      color: 'emerald',
      bgGradient: 'from-emerald-500/10 to-green-600/10',
      borderColor: 'border-emerald-500/20',
      iconColor: 'text-emerald-400',
      glowColor: 'shadow-emerald-500/10',
    },
    {
      id: 'success-rate',
      label: 'Success Rate',
      value: stats.successRate !== null ? `${stats.successRate}%` : '-',
      icon: TrendingUp,
      color: 'purple',
      bgGradient: 'from-purple-500/10 to-violet-600/10',
      borderColor: 'border-purple-500/20',
      iconColor: 'text-purple-400',
      glowColor: 'shadow-purple-500/10',
    },
  ];

  return (
    <div className='space-y-6'>
      {/* Main Stats Grid */}
      <div className='grid grid-cols-2 gap-4'>
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.id} className='relative group'>
              <div
                className={`absolute -inset-0.5 bg-gradient-to-r ${stat.bgGradient} rounded-xl blur opacity-30 group-hover:opacity-50 transition-all duration-300`}></div>
              <div
                className={`relative bg-zinc-900/60 backdrop-blur-sm border ${stat.borderColor} rounded-xl p-4 group-hover:${stat.glowColor} group-hover:shadow-lg transition-all duration-300`}>
                <div className='flex items-center'>
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.bgGradient} border ${stat.borderColor} flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <div className='flex-1'>
                    <p className='text-zinc-400 text-xs font-medium mb-1'>{stat.label}</p>
                    <p className='text-lg font-bold text-white'>{stat.value}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
