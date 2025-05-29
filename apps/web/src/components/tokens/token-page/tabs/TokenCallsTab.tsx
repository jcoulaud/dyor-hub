'use client';

import { TokenCallsSection } from '@/components/token-calls/token-page/TokenCallsSection';
import { Card, CardContent } from '@/components/ui/card';
import { Token, TokenCall } from '@dyor-hub/types';
import { TrendingUp } from 'lucide-react';
import { memo } from 'react';

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
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
      {/* Left Column - Your Predictions */}
      <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl h-full'>
        <CardContent className='p-8 h-full flex flex-col'>
          <div className='flex items-center mb-6'>
            <div className='h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center mr-3 shadow-lg'>
              <TrendingUp className='h-5 w-5 text-white' />
            </div>
            <h3 className='text-xl font-bold text-white'>Your Predictions</h3>
          </div>

          <div className='flex-1'>
            {tokenData && (
              <TokenCallsSection
                tokenId={tokenData.mintAddress}
                tokenSymbol={tokenData.symbol}
                currentTokenPrice={currentPrice}
                isPriceValid={isPriceValid}
                userCalls={userCalls}
                isLoadingUserCalls={isLoadingUserCalls}
                onCallCreated={onCallCreated}
                showOnlyPredictions={true}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Column - Stats & CTA */}
      <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl h-full'>
        <CardContent className='p-8 h-full flex flex-col'>
          <div className='flex items-center mb-6'>
            <div className='h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-3 shadow-lg'>
              <TrendingUp className='h-5 w-5 text-white' />
            </div>
            <h3 className='text-xl font-bold text-white'>Token Calls Stats</h3>
          </div>

          <div className='flex-1'>
            {tokenData && (
              <TokenCallsSection
                tokenId={tokenData.mintAddress}
                tokenSymbol={tokenData.symbol}
                currentTokenPrice={currentPrice}
                isPriceValid={isPriceValid}
                userCalls={userCalls}
                isLoadingUserCalls={isLoadingUserCalls}
                onCallCreated={onCallCreated}
                showOnlyStats={true}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
