'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { wallets } from '@/lib/api';
import { truncateAddress } from '@/lib/utils';
import { createSignatureMessage, isWalletBeingDeleted, setWalletVerified } from '@/lib/wallet';
import { useWallet } from '@solana/wallet-adapter-react';
import { CheckCircleIcon, Loader2Icon, ShieldIcon, XCircleIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export function WalletVerification() {
  const { publicKey, signMessage } = useWallet();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedVerification = useRef(false);
  const hasConnectedWallet = useRef<string | null>(null);
  const { toast } = useToast();

  const handleVerify = useCallback(async () => {
    if (!publicKey || typeof signMessage !== 'function') {
      setError('Wallet does not support message signing');
      toast({
        title: 'Verification Error',
        description: 'Wallet does not support message signing',
        variant: 'destructive',
      });
      return;
    }

    if (isVerifying) return;

    try {
      setIsVerifying(true);
      setError(null);

      const walletAddress = publicKey.toBase58();
      const { nonce } = await wallets.generateNonce(walletAddress);
      const message = createSignatureMessage(nonce);
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase64 = Buffer.from(signature).toString('base64');
      const verificationResult = await wallets.verify(walletAddress, signatureBase64);

      if (verificationResult.isVerified) {
        setWalletVerified(walletAddress, true);
        setIsVerified(true);

        try {
          const userWallets = await wallets.list();
          const hasPrimaryWallet = userWallets.some((w) => w.isPrimary === true);

          if (!hasPrimaryWallet && verificationResult.id) {
            const primaryResult = await wallets.setPrimary(verificationResult.id);

            if (primaryResult.success) {
              toast({
                title: 'Wallet Verified & Set as Primary',
                description: `Successfully verified wallet ${truncateAddress(walletAddress)} and set as your primary wallet`,
              });
              return;
            }
          }
        } catch (err) {
          console.error('Error checking/setting primary wallet:', err);
        }

        toast({
          title: 'Wallet Verified',
          description: `Successfully verified wallet ${truncateAddress(walletAddress)}`,
        });
      } else {
        throw new Error('Server verification failed');
      }
    } catch (err) {
      console.error('Signature verification failed:', err);
      setError('Failed to verify wallet ownership. Please try again.');
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify wallet ownership. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [publicKey, signMessage, toast, isVerifying]);

  useEffect(() => {
    if (!publicKey) return;

    const walletAddress = publicKey.toBase58();
    setError(null);

    if (isWalletBeingDeleted()) return;

    if (hasConnectedWallet.current === walletAddress) return;

    hasConnectedWallet.current = walletAddress;
    hasAttemptedVerification.current = false;
    setIsVerified(false);

    const checkWalletStatus = async () => {
      try {
        const userWallets = await wallets.list();
        const foundWallet = userWallets.find((w) => w.address === walletAddress);

        if (foundWallet) {
          setIsVerified(foundWallet.isVerified);

          if (foundWallet.isVerified) {
            setWalletVerified(walletAddress, true);
          } else if (typeof signMessage === 'function' && !hasAttemptedVerification.current) {
            hasAttemptedVerification.current = true;
            setTimeout(() => handleVerify(), 500);
          }
          return;
        }

        if (typeof signMessage === 'function' && !hasAttemptedVerification.current) {
          hasAttemptedVerification.current = true;
          setTimeout(() => handleVerify(), 500);
        }
      } catch (err) {
        console.error('Error checking wallet status:', err);
        setError('Error checking wallet status. Please try again.');
        toast({
          title: 'Connection Error',
          description: 'Error checking wallet status. Please try again.',
          variant: 'destructive',
        });
      }
    };

    checkWalletStatus();
  }, [publicKey, signMessage, toast, handleVerify]);

  useEffect(() => {
    if (!publicKey) {
      hasConnectedWallet.current = null;
      hasAttemptedVerification.current = false;
      setIsVerified(false);
      setError(null);
    }
  }, [publicKey]);

  if (!publicKey) {
    return null;
  }

  return (
    <div className='flex items-center gap-2 flex-wrap'>
      {isVerified ? (
        <div className='flex items-center gap-1.5'>
          <Badge
            variant='outline'
            className='inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 transition-colors'>
            <CheckCircleIcon className='h-3.5 w-3.5' />
            <span className='font-medium'>Verified</span>
          </Badge>
          <span className='text-xs text-muted-foreground'>Your wallet ownership is confirmed</span>
        </div>
      ) : (
        <div className='flex items-center gap-2 flex-wrap'>
          <div className='flex items-center gap-1.5'>
            <Badge
              variant='outline'
              className='inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 transition-colors'>
              <XCircleIcon className='h-3.5 w-3.5' />
              <span className='font-medium'>Unverified</span>
            </Badge>
            <span className='text-xs text-muted-foreground'>
              Verify to confirm wallet ownership
            </span>
          </div>

          {isVerifying ? (
            <div className='inline-flex items-center h-8 text-xs gap-1.5 text-muted-foreground ml-auto'>
              <Loader2Icon className='h-3.5 w-3.5 animate-spin' />
              <span>Verifying...</span>
            </div>
          ) : (
            <Button
              variant='outline'
              size='sm'
              className='h-8 font-medium bg-background dark:bg-muted cursor-pointer'
              onClick={handleVerify}>
              <ShieldIcon className='h-3.5 w-3.5 mr-1.5' />
              Verify Now
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className='w-full mt-1.5'>
          <p className='text-red-500 text-xs bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-md px-2.5 py-1.5'>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
