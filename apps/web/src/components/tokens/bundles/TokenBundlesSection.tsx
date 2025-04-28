'use client';

import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/api';
import type { ProcessedBundleData } from '@dyor-hub/types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BundleSummaryCard } from './BundleSummaryCard';

interface TokenBundlesSectionProps {
  mintAddress: string;
}

interface CacheEntry {
  data: ProcessedBundleData | null;
  error: string | null;
  timestamp: number;
}

const pendingRequests = new Map<string, Promise<CacheEntry>>();
const dataCache = new Map<string, CacheEntry>();

const fetchBundleData = (mintAddress: string, forceRefresh = false): Promise<CacheEntry> => {
  if (forceRefresh) {
    dataCache.delete(mintAddress);
    pendingRequests.delete(mintAddress);
  }

  if (pendingRequests.has(mintAddress)) {
    return pendingRequests.get(mintAddress)!;
  }

  const cachedEntry = dataCache.get(mintAddress);
  if (!forceRefresh && cachedEntry && Date.now() - cachedEntry.timestamp < 60000) {
    return Promise.resolve(cachedEntry);
  }

  const requestPromise = new Promise<CacheEntry>(async (resolve) => {
    try {
      const data = await tokens.getBundles(mintAddress);
      const entry: CacheEntry = {
        data,
        error: null,
        timestamp: Date.now(),
      };
      dataCache.set(mintAddress, entry);
      resolve(entry);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bundle data.';
      const formattedError = errorMessage.includes('timed out')
        ? 'Could not load bundle data (request timed out). Please try again later.'
        : errorMessage.includes('(404)') || errorMessage.toLowerCase().includes('not found')
          ? 'No bundle data found for this token.'
          : errorMessage;

      const entry: CacheEntry = {
        data: null,
        error: formattedError,
        timestamp: Date.now(),
      };
      dataCache.set(mintAddress, entry);
      resolve(entry);
    } finally {
      setTimeout(() => {
        pendingRequests.delete(mintAddress);
      }, 0);
    }
  });

  pendingRequests.set(mintAddress, requestPromise);
  return requestPromise;
};

export const TokenBundlesSection = ({ mintAddress }: TokenBundlesSectionProps) => {
  const [bundleData, setBundleData] = useState<ProcessedBundleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setIsLoading(true);
    setError(null);

    fetchBundleData(mintAddress, true)
      .then((entry) => {
        setBundleData(entry.data);
        setError(entry.error);
        setIsLoading(false);
      })
      .finally(() => {
        setIsRetrying(false);
      });
  };

  useEffect(() => {
    if (!mintAddress) {
      setBundleData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let mounted = true;

    fetchBundleData(mintAddress).then((entry) => {
      if (!mounted) return;

      setBundleData(entry.data);
      setError(entry.error);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [mintAddress]);

  if (isLoading) {
    return (
      <div className='space-y-4 sm:space-y-6 xl:space-y-8'>
        <BundleSummaryCard bundleData={null} isLoading={true} />
      </div>
    );
  }

  if (error && error !== 'No bundle data found for this token.') {
    const isTimeout = error.includes('timed out');

    return (
      <div className='relative group'>
        <div className='absolute -inset-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
        <div className='relative h-full bg-zinc-900/40 backdrop-blur-sm border border-red-500/30 rounded-xl overflow-hidden p-4'>
          <div className='flex flex-col items-center justify-center text-center space-y-2'>
            <div className='flex items-center text-red-400'>
              <AlertTriangle className='h-4 w-4 mr-2' />
              <span className='font-medium text-sm'>Error Loading Bundles</span>
            </div>

            {isTimeout && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleRetry}
                disabled={isRetrying}
                className='border-red-500/40 text-red-300 hover:bg-red-950/50 hover:text-red-200 px-2 py-1'>
                <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4 sm:space-y-6 xl:space-y-8'>
      <BundleSummaryCard bundleData={bundleData} isLoading={false} />
    </div>
  );
};
