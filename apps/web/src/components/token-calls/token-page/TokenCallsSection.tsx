'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokenCalls } from '@/lib/api';
import { TokenCall } from '@dyor-hub/types';
import { LineChart } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DisplayUserCall } from './DisplayUserCall';
import { MakeCallModal } from './MakeCallModal';
import { TokenCallsStats } from './TokenCallsStats';

interface TokenCallsSectionProps {
  tokenId: string;
  tokenSymbol: string;
  currentTokenPrice: number;
  isPriceValid: boolean;
  userCall: TokenCall | null | undefined;
  isLoadingUserCall: boolean;
  onCallCreated?: () => void;
}

export function TokenCallsSection({
  tokenId,
  tokenSymbol,
  currentTokenPrice,
  isPriceValid,
  userCall,
  isLoadingUserCall,
  onCallCreated,
}: TokenCallsSectionProps) {
  const [tokenCallsData, setTokenCallsData] = useState<TokenCall[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStatsData = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const result = await tokenCalls.list({ tokenId: tokenId }, { page: 1, limit: 20 });
      setTokenCallsData(result.items);
    } catch {
      setTokenCallsData([]);
    } finally {
      setIsLoadingStats(false);
    }
  }, [tokenId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchStatsData();
      } catch {
        setIsLoadingStats(false);
      }
    };

    loadData();
    return () => {};
  }, [fetchStatsData]);

  const handleCallCreated = useCallback(() => {
    fetchStatsData();

    if (onCallCreated) {
      onCallCreated();
    }
  }, [fetchStatsData, onCallCreated]);

  const renderPredictionSection = () => {
    if (isLoadingUserCall) {
      return (
        <div className='relative group'>
          <Card className='relative rounded-2xl'>
            <CardContent>
              <Skeleton className='h-20 w-full' />
            </CardContent>
          </Card>
        </div>
      );
    }
    if (userCall && userCall.tokenId === tokenId) {
      return <DisplayUserCall call={userCall} currentTokenPrice={currentTokenPrice} />;
    }
    if (isPriceValid) {
      return (
        <MakeCallModal
          tokenId={tokenId}
          tokenSymbol={tokenSymbol}
          currentTokenPrice={currentTokenPrice}
          onCallCreated={handleCallCreated}
        />
      );
    }
    return (
      <div className='relative group'>
        <div className='absolute -inset-0.5 bg-gradient-to-r from-zinc-500 to-zinc-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
        <Card className='relative rounded-2xl opacity-60'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Make a Prediction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              Current price data is unavailable for this token, cannot make predictions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className='relative group'>
      <div className='absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
      <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-amber-600/5 to-amber-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
        <CardHeader className='pb-2 relative'>
          <div className='flex items-center mb-4'>
            <div className='h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center mr-4 group-hover:bg-amber-500/20 transition-colors duration-300'>
              <LineChart className='h-5 w-5 text-amber-400' />
            </div>
            <div className='flex items-center justify-between flex-grow'>
              <CardTitle className='text-xl font-semibold text-white'>Token Calls</CardTitle>
              {tokenCallsData.length > 0 && (
                <Link
                  href={`/token-calls?tokenSearch=${tokenSymbol}`}
                  className='text-xs text-amber-400/70 hover:text-amber-400 px-2 py-1 rounded-md border border-amber-500/30 hover:border-amber-500/60 transition-colors duration-200'>
                  View all
                </Link>
              )}
            </div>
          </div>
          <div className='w-full h-0.5 bg-gradient-to-r from-amber-500/20 to-transparent'></div>
        </CardHeader>
        <CardContent className='relative pt-0 space-y-6 px-3'>
          <TokenCallsStats tokenCalls={tokenCallsData} isLoading={isLoadingStats} />
          <div>{renderPredictionSection()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
