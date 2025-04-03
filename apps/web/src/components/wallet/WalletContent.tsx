'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { wallets } from '@/lib/api';
import { DbWallet } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { ConnectWalletCard } from './ConnectWalletCard';
import { SavedWalletList } from './SavedWalletList';
import { WalletDetails } from './WalletDetails';

export function WalletContent() {
  const { connected, publicKey } = useWallet();
  const [dbWallets, setDbWallets] = useState<DbWallet[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserWallets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userWallets = await wallets.list();
        setDbWallets(userWallets || []);
      } catch (err) {
        console.error('Error fetching user wallets:', err);
        setError('Failed to load your wallet information. Please try refreshing.');
        setDbWallets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserWallets();
  }, []);

  if (isLoading) {
    return (
      <div className='space-y-4 p-6'>
        <Skeleton className='h-8 w-3/4' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-10 w-1/2' />
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

  if (connected && publicKey) {
    return <WalletDetails />;
  }

  if (!dbWallets || dbWallets.length === 0) {
    return <ConnectWalletCard />;
  } else {
    return <SavedWalletList dbWallets={dbWallets} />;
  }
}
