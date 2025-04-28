'use client';

import { tokens } from '@/lib/api';
import type { ProcessedBundleData } from '@dyor-hub/types';
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

    const processedAddress = mintAddress.trim().toLowerCase();
    const endsWithPump = processedAddress.endsWith('pump');
    if (!endsWithPump) {
      setBundleData(null);
      setError('Bundle analysis currently only supports pump.fun tokens.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

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

  return (
    <div className='space-y-4 sm:space-y-6 xl:space-y-8'>
      <BundleSummaryCard
        bundleData={bundleData}
        isLoading={isLoading}
        error={error}
        isRetrying={isRetrying}
        onRetry={handleRetry}
      />
    </div>
  );
};
