'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { wallets } from '@/lib/api';
import { truncateAddress } from '@/lib/utils';
import {
  clearWalletVerification,
  isWalletBeingDeleted,
  setWalletDeletionState,
} from '@/lib/wallet';
import { DbWallet } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { ExternalLinkIcon, ShieldIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { WalletVerification } from './WalletVerification';

export function WalletDetails() {
  const wallet = useWallet();
  const { publicKey, disconnect } = wallet || {};
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [dbWallet, setDbWallet] = useState<DbWallet | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const { toast } = useToast();
  const hasFetchedWallet = useRef(false);
  const previousWalletAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      setError('Wallet context not available');
      return;
    }

    if (!publicKey) {
      setError('Wallet not connected');
      if (dbWallet) {
        hasFetchedWallet.current = false;
        previousWalletAddress.current = null;
        setDbWallet(null);
      }
      return;
    }

    const walletAddress = publicKey.toBase58();

    if (previousWalletAddress.current === walletAddress && hasFetchedWallet.current) {
      return;
    }

    if (isWalletBeingDeleted()) {
      return;
    }

    setError(null);
    previousWalletAddress.current = walletAddress;

    const fetchWallet = async () => {
      try {
        hasFetchedWallet.current = true;
        const userWallets = await wallets.list();
        const foundWallet = userWallets.find((w) => w.address === walletAddress);

        if (foundWallet) {
          const isPrimaryWallet = foundWallet.isPrimary === true;

          setDbWallet({
            ...foundWallet,
            isPrimary: isPrimaryWallet,
          });
          setIsPrimary(isPrimaryWallet);

          if (!dbWallet) {
            toast({
              title: 'Wallet Connected',
              description: `Successfully connected wallet ${truncateAddress(walletAddress)}`,
            });
          }
          return;
        }

        const newWallet = await wallets.connect(walletAddress);

        let isPrimaryWallet = newWallet.isPrimary === true;

        if (!isPrimaryWallet && userWallets.length === 0 && newWallet.id) {
          try {
            const result = await wallets.setPrimary(newWallet.id);

            if (result.success) {
              isPrimaryWallet = true;

              toast({
                title: 'Primary Wallet Set',
                description: `Wallet ${truncateAddress(walletAddress)} has been set as your primary wallet`,
              });
            }
          } catch (err) {
            console.error('Error setting primary wallet:', err);
          }
        }

        setDbWallet({
          ...newWallet,
          isPrimary: isPrimaryWallet,
        });
        setIsPrimary(isPrimaryWallet);

        toast({
          title: 'Wallet Connected',
          description: `Successfully connected wallet ${truncateAddress(walletAddress)}`,
        });
      } catch (err) {
        console.error('Error fetching wallet:', err);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect wallet to your account',
          variant: 'destructive',
        });
      }
    };

    fetchWallet();
  }, [wallet, publicKey, toast, dbWallet]);

  if (error || !publicKey || !wallet) {
    return (
      <Card className='w-full border-red-200 bg-red-50/10'>
        <CardContent className='p-6'>
          <div className='text-center text-red-500 text-sm'>
            {error || 'Wallet connection issue. Please refresh the page and try again.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const walletAddress = publicKey.toBase58();

  const handleDisconnect = async () => {
    if (isRemoving) return;

    try {
      setIsRemoving(true);
      setWalletDeletionState(true);

      const walletId = dbWallet?.id;
      const walletAddressToRemove = walletAddress;

      clearWalletVerification(walletAddressToRemove);

      if (typeof disconnect === 'function') {
        disconnect();
      }

      hasFetchedWallet.current = false;
      previousWalletAddress.current = null;
      setDbWallet(null);

      if (walletId) {
        const result = await wallets.delete(walletId);

        if (result.success) {
          toast({
            title: 'Wallet Removed',
            description: `Successfully removed wallet ${truncateAddress(walletAddressToRemove)}`,
          });
        } else {
          throw new Error('Failed to remove wallet from database');
        }
      }
    } catch (err) {
      console.error('Error removing wallet:', err);

      toast({
        title: 'Error',
        description: 'Failed to remove wallet completely. Please try again.',
        variant: 'destructive',
      });

      setWalletDeletionState(false);
    } finally {
      setIsRemoving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);

      toast({
        title: 'Copied!',
        description: 'Wallet address copied to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openExplorer = () => {
    window.open(`https://solscan.io/account/${walletAddress}`, '_blank');
  };

  const setPrimaryWallet = async () => {
    if (!dbWallet?.id) return;

    try {
      const result = await wallets.setPrimary(dbWallet.id);

      if (result.success) {
        setIsPrimary(true);
        setDbWallet({
          ...dbWallet,
          isPrimary: true,
        });

        toast({
          title: 'Primary Wallet Set',
          description: `Wallet ${truncateAddress(walletAddress)} is now your primary wallet`,
        });

        setTimeout(() => {
          hasFetchedWallet.current = false;
        }, 1000);
      } else {
        throw new Error('Failed to set primary wallet');
      }
    } catch (err) {
      console.error('Error setting primary wallet:', err);
      toast({
        title: 'Error',
        description: 'Failed to set primary wallet',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className='w-full overflow-hidden border bg-card'>
      <CardContent className='p-0'>
        <div className='flex flex-col divide-y'>
          {/* Wallet info header */}
          <div className='p-6 flex flex-wrap items-center justify-between gap-4 bg-muted/30'>
            <div className='flex flex-col gap-1'>
              <div className='flex items-center gap-2'>
                <div className='text-sm font-medium text-muted-foreground'>Connected Wallet</div>
                {isPrimary && (
                  <Badge className='h-5 rounded-md px-1.5 bg-primary/15 text-primary text-xs font-medium pointer-events-none'>
                    Primary
                  </Badge>
                )}
              </div>
              <div className='flex items-center gap-2'>
                <button
                  onClick={openExplorer}
                  className='relative flex items-center gap-1 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 h-8 px-3 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'>
                  <span className='font-mono text-zinc-200 text-xs'>
                    {truncateAddress(walletAddress)}
                  </span>
                  <ExternalLinkIcon className='h-3.5 w-3.5 text-blue-400' />
                </button>
                <button
                  onClick={copyToClipboard}
                  className='flex items-center justify-center h-8 w-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer'>
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='text-blue-400'>
                    <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
                    <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                  </svg>
                  <span className='sr-only'>Copy address</span>
                </button>
              </div>
            </div>

            <div className='flex gap-2'>
              {!isPrimary && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={setPrimaryWallet}
                  className='text-primary border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer'>
                  Set as Primary
                </Button>
              )}
              <Button
                variant='outline'
                size='sm'
                onClick={handleDisconnect}
                disabled={isRemoving}
                className='bg-red-950/30 text-white border-red-900/50 hover:bg-red-900/40 hover:text-white hover:border-red-800/60 focus:ring-1 focus:ring-red-900/20 transition-all duration-200 cursor-pointer flex items-center gap-1.5 px-3 rounded-md shadow-sm'>
                <Trash2Icon className='h-4 w-4' />
                {isRemoving ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </div>

          {/* Wallet details */}
          <div className='p-6'>
            <div className='flex flex-col gap-1.5'>
              <div className='text-sm font-medium text-muted-foreground flex items-center gap-1.5'>
                <ShieldIcon className='h-3.5 w-3.5' />
                Verification Status
              </div>
              <WalletVerification />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
