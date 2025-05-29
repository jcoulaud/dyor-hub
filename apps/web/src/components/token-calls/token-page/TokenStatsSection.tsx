'use client';

import { tokenCalls } from '@/lib/api';
import { TokenCall } from '@dyor-hub/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TokenCallsStats } from './TokenCallsStats';

interface TokenStatsSectionProps {
  tokenId: string;
}

export function TokenStatsSection({ tokenId }: TokenStatsSectionProps) {
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
  }, [fetchStatsData]);

  const memoizedStatsComponent = useMemo(() => {
    return <TokenCallsStats tokenCalls={tokenCallsData} isLoading={isLoadingStats} />;
  }, [tokenCallsData, isLoadingStats]);

  return memoizedStatsComponent;
}
