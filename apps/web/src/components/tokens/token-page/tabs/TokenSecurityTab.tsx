'use client';

import { TokenStats } from '@/components/tokens/TokenStats';
import { TokenBundlesSection } from '@/components/tokens/bundles/TokenBundlesSection';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  SolanaTrackerHoldersChartResponse,
  Token,
  TokenStats as TokenStatsType,
} from '@dyor-hub/types';
import { Eye, Info, Shield } from 'lucide-react';
import { memo } from 'react';

interface TokenSecurityTabProps {
  tokenData: Token | null;
  tokenStatsData: TokenStatsType | null;
  holderHistoryData: SolanaTrackerHoldersChartResponse | null;
  isLoadingHolderHistory: boolean;
  mintAddress: string;
}

const isDev = process.env.NODE_ENV === 'development';

export const TokenSecurityTab = memo(function TokenSecurityTab({
  tokenData,
  tokenStatsData,
  holderHistoryData,
  isLoadingHolderHistory,
  mintAddress,
}: TokenSecurityTabProps) {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
      {/* Left Column */}
      <div className='space-y-8'>
        {/* Token Information Card */}
        <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl'>
          <CardContent className='p-8'>
            <div className='flex items-center mb-6'>
              <div className='h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mr-3 shadow-lg'>
                <Shield className='h-5 w-5 text-white' />
              </div>
              <h3 className='text-xl font-bold text-white'>Token Information</h3>
            </div>

            {tokenData ? (
              <div className='space-y-8'>
                {/* Supply Information */}
                {!isDev && tokenStatsData ? (
                  <TokenStats
                    stats={tokenStatsData}
                    tokenMintAddress={tokenData.mintAddress}
                    tokenSymbol='TOKEN'
                    holderHistoryData={holderHistoryData?.holders ?? null}
                    isLoadingHolderHistory={isLoadingHolderHistory}
                    tokenData={tokenData}
                  />
                ) : (
                  <div className='space-y-4'>
                    {/* Market data disabled message */}
                    <div className='flex items-center justify-center py-8'>
                      <div className='inline-flex items-center px-6 py-3 rounded-xl bg-red-500/10 backdrop-blur-sm border border-red-500/20 shadow-lg'>
                        <Shield className='h-5 w-5 text-red-400 mr-3' />
                        <span className='text-sm font-medium text-zinc-200'>
                          {isDev
                            ? 'Market data disabled in local dev.'
                            : 'Unable to load market data.'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className='space-y-6'>
                <div className='space-y-4'>
                  <Skeleton className='h-6 w-32 bg-zinc-700/50' />
                  <div className='space-y-3'>
                    <Skeleton className='h-8 w-full bg-zinc-700/50' />
                    <Skeleton className='h-8 w-full bg-zinc-700/50' />
                    <Skeleton className='h-8 w-full bg-zinc-700/50' />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className='space-y-8'>
        {/* Bubblemap */}
        <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl min-h-[400px]'>
          <CardContent className='p-8 h-full'>
            <div className='flex items-center mb-6'>
              <div className='h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mr-3 shadow-lg'>
                <Eye className='h-5 w-5 text-white' />
              </div>
              <h3 className='text-xl font-bold text-white'>Bubblemap</h3>
            </div>

            <div className='h-full flex items-center justify-center'>
              <iframe
                src={`https://app.bubblemaps.io/sol/token/${mintAddress}`}
                className='w-full h-[300px] rounded-xl border border-zinc-700/30 bg-zinc-800/30'
                title='Bubblemap'
              />
            </div>
          </CardContent>
        </Card>

        {/* Bundle Analysis */}
        <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl'>
          <CardContent className='p-8'>
            <div className='flex items-center mb-2'>
              <div className='h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-3 shadow-lg'>
                <Shield className='h-5 w-5 text-white' />
              </div>
              <h3 className='text-xl font-bold text-white'>Bundle Analysis</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className='ml-2 p-1 rounded-full hover:bg-zinc-700/50 transition-colors'>
                      <Info className='h-4 w-4 text-zinc-400 hover:text-zinc-300' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-xs'>
                    <p className='text-sm'>
                      Analyze bundled wallets and their token control to identify potential risks
                      and coordinated activities.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <TokenBundlesSection mintAddress={mintAddress} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
