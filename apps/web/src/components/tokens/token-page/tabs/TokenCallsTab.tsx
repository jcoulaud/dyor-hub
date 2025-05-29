'use client';

import { TokenPredictionsSection } from '@/components/token-calls/token-page/TokenPredictionsSection';
import { TokenStatsSection } from '@/components/token-calls/token-page/TokenStatsSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Token, TokenCall, TokenCallStatus } from '@dyor-hub/types';
import { BarChart3, ExternalLink, Target } from 'lucide-react';
import Link from 'next/link';
import { memo, useState } from 'react';

interface TokenCallsTabProps {
  tokenData: Token | null;
  userCalls: TokenCall[];
  isLoadingUserCalls: boolean;
  currentPrice: number;
  isPriceValid: boolean;
  onCallCreated: () => void;
}

export const TokenCallsTab = memo(function TokenCallsTab({
  tokenData,
  userCalls,
  isLoadingUserCalls,
  currentPrice,
  isPriceValid,
  onCallCreated,
}: TokenCallsTabProps) {
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const currentCall = userCalls[currentPredictionIndex];

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
      {/* Left Column - Calls */}
      <div className='relative group'>
        <div className='absolute -inset-1 bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-yellow-500/20 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-500'></div>
        <Card className='relative !bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl h-full overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-amber-600/5 via-transparent to-yellow-600/5 opacity-60'></div>
          <CardContent className='p-8 h-full flex flex-col relative'>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center'>
                <div className='relative'>
                  <div className='h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-xl shadow-amber-500/20'>
                    <Target className='h-6 w-6 text-white' />
                  </div>
                  <div className='absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse'></div>
                </div>
                <div className='ml-4'>
                  <h3 className='text-xl font-bold text-white'>Calls</h3>
                  <p className='text-zinc-400 text-sm'>Track your calls and performance</p>
                </div>
              </div>

              {userCalls.length > 0 && (
                <div className='flex items-center gap-3'>
                  <div className='text-right'>
                    <div className='text-xs font-medium text-zinc-400'>
                      {userCalls.length > 1
                        ? `${currentPredictionIndex + 1} of ${userCalls.length}`
                        : 'Active'}
                    </div>
                    {currentCall && (
                      <Badge
                        variant={
                          currentCall.status === TokenCallStatus.VERIFIED_FAIL
                            ? 'destructive'
                            : 'default'
                        }
                        className={cn(
                          'rounded-lg shadow-md text-xs font-medium mt-1',
                          currentCall.status === TokenCallStatus.VERIFIED_SUCCESS &&
                            'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30',
                          currentCall.status === TokenCallStatus.PENDING &&
                            'bg-amber-500/20 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30',
                          currentCall.status === TokenCallStatus.ERROR &&
                            'bg-zinc-500/20 text-zinc-300 hover:bg-zinc-500/30 border border-zinc-500/30',
                        )}>
                        {currentCall.status.replace('VERIFIED_', '')}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Predictions Content */}
            <div className='flex-1 flex flex-col'>
              {tokenData && (
                <TokenPredictionsSection
                  tokenId={tokenData.mintAddress}
                  tokenSymbol={tokenData.symbol}
                  currentTokenPrice={currentPrice}
                  isPriceValid={isPriceValid}
                  userCalls={userCalls}
                  isLoadingUserCalls={isLoadingUserCalls}
                  onCallCreated={onCallCreated}
                  onPredictionIndexChange={setCurrentPredictionIndex}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Community Stats */}
      <div className='relative group'>
        <div className='absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/10 to-blue-500/20 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-500'></div>
        <Card className='relative !bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl h-full overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-cyan-600/5 opacity-60'></div>
          <CardContent className='p-8 h-full flex flex-col relative'>
            {/* Enhanced Header */}
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center'>
                <div className='relative'>
                  <div className='h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-xl shadow-blue-500/20'>
                    <BarChart3 className='h-6 w-6 text-white' />
                  </div>
                  <div className='absolute -top-1 -right-1 h-4 w-4 bg-blue-400 rounded-full border-2 border-zinc-900'></div>
                </div>
                <div className='ml-4'>
                  <h3 className='text-xl font-bold text-white'>Community Insights</h3>
                  <p className='text-zinc-400 text-sm'>See how others are calling this token</p>
                </div>
              </div>

              {tokenData && (
                <Link href={`/token-calls?tokenSearch=${tokenData.symbol}`}>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 gap-1.5 px-3 bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all'>
                    <span className='text-xs font-medium'>View All</span>
                    <ExternalLink className='h-3 w-3' />
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats Content */}
            <div className='flex-1'>
              {tokenData && <TokenStatsSection tokenId={tokenData.mintAddress} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
