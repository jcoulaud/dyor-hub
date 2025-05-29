'use client';

import { EarlyBuyersInfo } from '@/components/tokens/EarlyBuyersInfo';
import { TokenAiTradingAnalysis } from '@/components/tokens/TokenAiTradingAnalysis';
import { TokenHolderAnalysisInfo } from '@/components/tokens/TokenHolderAnalysisInfo';
import { TopTradersAnalysisInfo } from '@/components/tokens/TopTradersAnalysisInfo';
import { Card, CardContent } from '@/components/ui/card';
import { Token } from '@dyor-hub/types';
import { BarChart3 } from 'lucide-react';
import { memo } from 'react';

interface TokenAnalysisTabProps {
  mintAddress: string;
  tokenData: Token | null;
  userDyorHubBalance?: number;
}

export const TokenAnalysisTab = memo(function TokenAnalysisTab({
  mintAddress,
  tokenData,
  userDyorHubBalance,
}: TokenAnalysisTabProps) {
  return (
    <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl'>
      <CardContent className='p-8'>
        <div className='flex items-center mb-8'>
          <div className='h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-3 shadow-lg'>
            <BarChart3 className='h-5 w-5 text-white' />
          </div>
          <h3 className='text-xl font-bold text-white'>Advanced Analysis</h3>
        </div>

        <div className='max-w-6xl mx-auto'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8'>
            <TokenAiTradingAnalysis
              mintAddress={mintAddress}
              tokenCreationTime={tokenData?.creationTime}
              userPlatformTokenBalance={userDyorHubBalance}
            />
            <TokenHolderAnalysisInfo
              mintAddress={mintAddress}
              userPlatformTokenBalance={userDyorHubBalance}
            />
            <EarlyBuyersInfo
              mintAddress={mintAddress}
              userPlatformTokenBalance={userDyorHubBalance}
            />
            <TopTradersAnalysisInfo
              mintAddress={mintAddress}
              userPlatformTokenBalance={userDyorHubBalance}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
