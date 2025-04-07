'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { wallets } from '@/lib/api';
import { walletEvents } from '@/lib/wallet-events';
import { DbWallet } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useState } from 'react';
import { ConnectWalletCard } from './ConnectWalletCard';
import { SavedWalletList } from './SavedWalletList';
import { WalletDetails } from './WalletDetails';

export function WalletContent() {
  const { connected, publicKey } = useWallet();
  const [dbWallets, setDbWallets] = useState<DbWallet[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserWallets = useCallback(async () => {
    setError(null);
    try {
      const userWallets = await wallets.list();
      setDbWallets(userWallets || []);
    } catch (err) {
      console.error('Error fetching user wallets:', err);
      setError('Failed to load your wallet information. Please try refreshing.');
      setDbWallets([]);
    }
  }, []);

  useEffect(() => {
    const handleWalletChange = () => fetchUserWallets();

    const unsubscribeRemoved = walletEvents.subscribe('wallet-removed', handleWalletChange);
    const unsubscribeAdded = walletEvents.subscribe('wallet-added', handleWalletChange);
    const unsubscribeUpdated = walletEvents.subscribe('wallet-updated', handleWalletChange);

    let isMounted = true;
    const performInitialFetch = async () => {
      setIsLoading(true);
      await fetchUserWallets();
      if (isMounted) {
        setIsLoading(false);
      }
    };
    performInitialFetch();

    return () => {
      isMounted = false;
      unsubscribeRemoved();
      unsubscribeAdded();
      unsubscribeUpdated();
    };
  }, [fetchUserWallets]);

  if (isLoading) {
    return (
      <div className='space-y-4 p-6'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-16 w-1/2' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-red-500 text-sm p-4 border border-red-200 bg-red-50/50 rounded-md'>
        {error}
      </div>
    );
  }

  const hasSavedWallets = dbWallets && dbWallets.length > 0;
  const connectedWalletAddress = connected && publicKey ? publicKey.toBase58() : null;

  const showFullConnectCard = !connectedWalletAddress && !hasSavedWallets;

  return (
    <div className='space-y-6'>
      {/* 1. Active Wallet Details (if connected) */}
      {connectedWalletAddress && (
        <div className='mt-6'>
          <WalletDetails key={connectedWalletAddress} />
        </div>
      )}

      {hasSavedWallets && (
        <Card>
          <CardHeader>
            <CardTitle>Your Saved Wallets</CardTitle>
            <CardDescription>
              Manage your saved wallets. You can set one verified wallet as primary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SavedWalletList dbWallets={dbWallets} />
          </CardContent>
        </Card>
      )}

      {showFullConnectCard && <ConnectWalletCard showIntroductoryText={true} />}

      {!hasSavedWallets && error && connectedWalletAddress && (
        <p className='text-sm text-orange-500 mt-4'>
          Could not load saved wallets, but you have a wallet connected.
        </p>
      )}
    </div>
  );
}
