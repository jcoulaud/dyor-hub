'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { wallets } from '@/lib/api';
import { truncateAddress } from '@/lib/utils';
import { clearWalletVerification, setWalletDeletionState } from '@/lib/wallet';
import { walletEvents } from '@/lib/wallet-events';
import { DbWallet } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  AlertTriangleIcon,
  CopyIcon,
  Loader2Icon,
  ShieldIcon,
  SquareArrowOutUpRightIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WalletVerification } from './WalletVerification';

export function WalletDetails() {
  const wallet = useWallet();
  const { publicKey, disconnect } = wallet || {};
  const [error, setError] = useState<string | null>(null);
  const [associationConflictError, setAssociationConflictError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssociating, setIsAssociating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [dbWallet, setDbWallet] = useState<DbWallet | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const { toast } = useToast();
  const previousWalletAddress = useRef<string | null>(null);
  const isFetching = useRef(false);

  const copyToClipboard = useCallback(async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      toast({ title: 'Copied!', description: 'Wallet address copied to clipboard' });
    } catch (err) {
      console.error('Failed to copy wallet address:', err);
    }
  }, [publicKey, toast]);

  const openExplorer = useCallback(() => {
    if (!publicKey) return;
    window.open(`https://solscan.io/account/${publicKey.toBase58()}`, '_blank');
  }, [publicKey]);

  const refreshWalletData = useCallback(
    async (showToast = false, isAssociationAttempt = false) => {
      if (!publicKey || isFetching.current) return;

      const walletAddress = publicKey.toBase58();
      isFetching.current = true;
      if (!isAssociationAttempt) setIsLoading(true);
      setError(null);
      setAssociationConflictError(null);

      try {
        const userWallets = await wallets.list();
        const foundWallet = userWallets.find((w) => w.address === walletAddress);

        if (foundWallet) {
          setDbWallet(foundWallet);
          setIsPrimary(foundWallet.isPrimary === true);
          if (showToast) {
            toast({ title: 'Wallet Data Refreshed' });
          }
        } else if (!isAssociationAttempt) {
          setIsAssociating(true);
          try {
            const newWallet = await wallets.connect(walletAddress);
            toast({
              title: 'Wallet Linked',
              description: 'Wallet linked to your account. Please verify ownership.',
            });
            setDbWallet(newWallet);
            setIsPrimary(newWallet.isPrimary === true);
            walletEvents.emit('wallet-added', {
              walletId: newWallet.id,
              address: newWallet.address,
            });
          } catch (connectErr: unknown) {
            const alreadyConnectedMsg = 'Wallet address already connected to another account';
            let backendErrorMessage = '';

            if (typeof connectErr === 'object' && connectErr !== null) {
              if (
                'response' in connectErr &&
                typeof connectErr.response === 'object' &&
                connectErr.response !== null
              ) {
                const response = connectErr.response as { message?: string | string[] };
                if (typeof response.message === 'string') backendErrorMessage = response.message;
                else if (Array.isArray(response.message))
                  backendErrorMessage = response.message.join(', ');
              }
              if (
                !backendErrorMessage &&
                'message' in connectErr &&
                typeof connectErr.message === 'string'
              ) {
                backendErrorMessage = connectErr.message;
              }
            }

            if (backendErrorMessage.includes(alreadyConnectedMsg)) {
              const conflictMsg =
                'This wallet is linked to another account. The other account must remove it first.';
              setAssociationConflictError(conflictMsg);
              toast({
                title: 'Association Conflict',
                description: conflictMsg,
                variant: 'destructive',
              });
            } else {
              const generalErrorMsg = 'Failed to automatically link this wallet to your account.';
              setError(generalErrorMsg);
              toast({
                title: 'Association Failed',
                description: generalErrorMsg,
                variant: 'destructive',
              });
            }
            setDbWallet(null);
            setIsPrimary(false);
          } finally {
            setIsAssociating(false);
          }
        } else {
          setDbWallet(null);
          setIsPrimary(false);
        }
      } catch {
        setError('Failed to fetch wallet details. Please refresh.');
        toast({
          title: 'Error',
          description: 'Could not fetch wallet data.',
          variant: 'destructive',
        });
        setDbWallet(null);
        setIsPrimary(false);
      } finally {
        setIsLoading(false);
        isFetching.current = false;
      }
    },
    [publicKey, toast],
  );

  const handleSetPrimary = useCallback(async () => {
    if (!dbWallet?.id || isPrimary) return;
    const walletAddress = publicKey?.toBase58();
    if (!walletAddress) return;

    setIsSettingPrimary(true);
    try {
      const result = await wallets.setPrimary(dbWallet.id);
      if (result.success) {
        toast({
          title: 'Primary Wallet Set',
          description: `Wallet ${truncateAddress(walletAddress)} is now primary.`,
        });
        refreshWalletData(false);
        walletEvents.emit('wallet-updated', {
          walletId: dbWallet.id,
          address: walletAddress,
        });
      } else {
        throw new Error('API indicated failure setting primary wallet');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to set primary wallet.',
        variant: 'destructive',
      });
    } finally {
      setIsSettingPrimary(false);
    }
  }, [dbWallet, isPrimary, refreshWalletData, toast, publicKey]);

  const handleDisconnect = useCallback(async () => {
    if (isRemoving) return;
    const walletAddress = publicKey?.toBase58();
    if (!walletAddress) return;

    const walletIdToRemove = dbWallet?.id;
    setIsRemoving(true);
    setWalletDeletionState(true);

    try {
      clearWalletVerification(walletAddress);
      if (typeof disconnect === 'function') {
        await disconnect();
      }
      if (walletIdToRemove) {
        await wallets.delete(walletIdToRemove);
        walletEvents.emit('wallet-removed', { walletId: walletIdToRemove, address: walletAddress });
        toast({
          title: 'Wallet Removed',
          description: `Successfully removed wallet ${truncateAddress(walletAddress)}`,
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to remove wallet completely.',
        variant: 'destructive',
      });
      setWalletDeletionState(false);
    } finally {
      setIsRemoving(false);
    }
  }, [publicKey, disconnect, dbWallet, isRemoving, toast]);

  useEffect(() => {
    if (!publicKey) {
      setError(null);
      setAssociationConflictError(null);
      setDbWallet(null);
      setIsPrimary(false);
      setIsLoading(false);
      setIsAssociating(false);
      previousWalletAddress.current = null;
      isFetching.current = false;
      return;
    }

    const walletAddress = publicKey.toBase58();

    if (previousWalletAddress.current === walletAddress) {
      return;
    }

    previousWalletAddress.current = walletAddress;
    refreshWalletData(false, false);
  }, [publicKey, refreshWalletData]);

  if (isLoading && !dbWallet) {
    return (
      <Card className='w-full overflow-hidden border bg-card'>
        <CardContent className='p-6 space-y-4'>
          <Skeleton className='h-8 w-3/4' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-1/2' />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='w-full border-red-200 bg-red-50/10'>
        <CardContent className='p-6 text-center text-red-500 text-sm'>{error}</CardContent>
      </Card>
    );
  }

  if (!publicKey) {
    return (
      <Card className='w-full border-red-200 bg-red-50/10'>
        <CardContent className='p-6 text-center text-muted-foreground text-sm'>
          Wallet disconnected.
        </CardContent>
      </Card>
    );
  }

  const walletAddress = publicKey.toBase58();

  return (
    <Card className='w-full overflow-hidden border bg-card'>
      <CardContent className='p-0'>
        <div className='flex flex-col divide-y divide-border'>
          <div className='p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/30'>
            <div>
              <div className='text-xs text-muted-foreground mb-1'>Currently Connected Wallet</div>
              <div className='flex items-center gap-2'>
                <span className='font-mono text-lg font-medium'>
                  {truncateAddress(walletAddress)}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 bg-muted/50 hover:bg-muted'
                  onClick={copyToClipboard}
                  title='Copy address'>
                  <CopyIcon className='h-3.5 w-3.5' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 bg-muted/50 hover:bg-muted'
                  onClick={openExplorer}
                  title='View on Explorer'>
                  <SquareArrowOutUpRightIcon className='h-3.5 w-3.5' />
                </Button>
              </div>
            </div>
            <div className='flex items-center gap-2 flex-wrap'>
              {dbWallet && !isPrimary && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleSetPrimary}
                  disabled={isSettingPrimary}
                  title='Make this your primary wallet for all operations'
                  className='bg-yellow-500/10 text-white border border-yellow-500/30 hover:bg-yellow-500/20 hover:text-white transition-colors font-medium'>
                  {isSettingPrimary ? (
                    <Loader2Icon className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <StarIcon className='mr-1.5 h-3.5 w-3.5 fill-yellow-400 stroke-yellow-600' />
                  )}
                  Set as Primary
                </Button>
              )}
              <Button
                variant='destructive'
                size='sm'
                onClick={handleDisconnect}
                disabled={isRemoving}
                title={
                  dbWallet ? 'Disconnect and remove from account' : 'Disconnect wallet adapter'
                }>
                {isRemoving && dbWallet ? (
                  <Loader2Icon className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                ) : (
                  <Trash2Icon className='mr-1.5 h-3.5 w-3.5' />
                )}
                {dbWallet ? 'Remove' : 'Disconnect'}
              </Button>
            </div>
          </div>

          {isAssociating && (
            <div className='p-4 md:p-6 text-sm text-muted-foreground flex items-center gap-2'>
              <Loader2Icon className='h-4 w-4 animate-spin' />
              <span>Linking wallet to your account...</span>
            </div>
          )}

          {associationConflictError && (
            <div className='p-4 md:p-6 bg-red-500/10 border-t border-red-500/20'>
              <div className='flex items-center gap-2'>
                <AlertTriangleIcon className='h-4 w-4 text-red-300 flex-shrink-0' />
                <p className='text-xs text-red-300'>{associationConflictError}</p>
              </div>
            </div>
          )}

          {dbWallet && !associationConflictError && (
            <div
              className={`p-4 md:p-6 border-t border-border ${!dbWallet.isVerified ? 'bg-yellow-500/5 border-l-4 border-l-yellow-500' : ''}`}>
              <div className='flex flex-col gap-1.5'>
                <div className='text-sm font-medium text-muted-foreground flex items-center gap-1.5'>
                  <ShieldIcon className='h-3.5 w-3.5' />
                  Verification Status
                </div>
                {!dbWallet.isVerified && (
                  <p className='text-xs text-yellow-200/80 mb-2'>
                    Verification is required to display your wallet address publicly and to access
                    token gated features.
                  </p>
                )}
                <WalletVerification
                  dbWallet={dbWallet}
                  onVerificationSuccess={() => {
                    refreshWalletData(true);
                    walletEvents.emit('wallet-updated', {
                      walletId: dbWallet.id,
                      address: dbWallet.address,
                    });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
