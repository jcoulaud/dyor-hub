'use client';

import { TokenPredictionsSection } from '@/components/token-calls/token-page/TokenPredictionsSection';
import { TokenStatsSection } from '@/components/token-calls/token-page/TokenStatsSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Token, TokenCall, TokenCallStatus } from '@dyor-hub/types';
import { TrendingUp } from 'lucide-react';
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
      {/* Left Column - Your Predictions */}
      <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl h-full'>
        <CardContent className='p-8 h-full flex flex-col'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center'>
              <div className='h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center mr-3 shadow-lg'>
                <TrendingUp className='h-5 w-5 text-white' />
              </div>
              <h3 className='text-xl font-bold text-white'>Your Predictions</h3>
            </div>
            {userCalls.length > 0 && (
              <div className='flex items-center gap-2'>
                <div className='text-sm font-medium text-zinc-400'>
                  {userCalls.length > 1
                    ? `${currentPredictionIndex + 1}/${userCalls.length}`
                    : '1/1'}
                </div>
                {currentCall && (
                  <Badge
                    variant={
                      currentCall.status === TokenCallStatus.VERIFIED_FAIL
                        ? 'destructive'
                        : 'default'
                    }
                    className={cn(
                      'rounded-md shadow-sm text-xs font-medium',
                      currentCall.status === TokenCallStatus.VERIFIED_SUCCESS &&
                        'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30',
                      currentCall.status === TokenCallStatus.PENDING &&
                        'bg-amber-500/20 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30',
                      currentCall.status === TokenCallStatus.ERROR &&
                        'bg-zinc-500/20 text-zinc-300 hover:bg-zinc-500/30 border border-zinc-500/30',
                    )}>
                    {currentCall.status.replace('VERIFIED_', '')}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className='flex-1'>
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

      {/* Right Column - Stats & CTA */}
      <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl h-full'>
        <CardContent className='p-8 h-full flex flex-col'>
          <div className='flex items-center mb-4'>
            <div className='h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-3 shadow-lg'>
              <TrendingUp className='h-5 w-5 text-white' />
            </div>
            <h3 className='text-xl font-bold text-white'>Token Calls Stats</h3>
          </div>

          <div className='flex-1'>
            {tokenData && <TokenStatsSection tokenId={tokenData.mintAddress} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
