'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { wallets } from '@/lib/api';
import { truncateAddress } from '@/lib/utils';
import { createSignatureMessage, setWalletVerified } from '@/lib/wallet';
import { DbWallet } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { CheckCircleIcon, Loader2Icon, ShieldIcon, XCircleIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface WalletVerificationProps {
  dbWallet: DbWallet;
  onVerificationSuccess: (showToast?: boolean) => void;
}

export function WalletVerification({ dbWallet, onVerificationSuccess }: WalletVerificationProps) {
  const { publicKey, signMessage } = useWallet();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(dbWallet.isVerified);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsVerified(dbWallet.isVerified);
  }, [dbWallet.isVerified]);

  const handleVerify = useCallback(async () => {
    if (!publicKey || typeof signMessage !== 'function' || !dbWallet) {
      setError('Cannot verify: Wallet context missing or not associated.');
      toast({
        title: 'Verification Error',
        description: 'Wallet must be connected and linked.',
        variant: 'destructive',
      });
      return;
    }

    if (isVerifying) return;

    const walletAddress = publicKey.toBase58();

    try {
      setIsVerifying(true);
      setError(null);

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
                description: `Verified ${truncateAddress(walletAddress)} and set as primary.`,
              });
              onVerificationSuccess(true);
              return;
            }
          }
        } catch (err) {
          console.error('Error checking/setting primary wallet:', err); // Keep essential error logs
        }

        toast({
          title: 'Wallet Verified',
          description: `Successfully verified wallet ${truncateAddress(walletAddress)}`,
        });
        onVerificationSuccess(true);
      } else {
        throw new Error('Server verification check failed.');
      }
    } catch (err: unknown) {
      const alreadyVerifiedMsg = 'Wallet already verified by another user';
      const notFoundMsg = 'Wallet not found. Please connect the wallet first'; // From generateNonce
      let backendErrorMessage = '';

      if (typeof err === 'object' && err !== null) {
        if ('response' in err && typeof err.response === 'object' && err.response !== null) {
          const response = err.response as { message?: string | string[] };
          if (typeof response.message === 'string') backendErrorMessage = response.message;
          else if (Array.isArray(response.message))
            backendErrorMessage = response.message.join(', ');
        }
        if (!backendErrorMessage && 'message' in err && typeof err.message === 'string') {
          backendErrorMessage = err.message;
        }
      }

      let toastTitle = 'Verification Failed';
      let toastDescription = 'Failed to verify wallet ownership. Please try again.';

      if (backendErrorMessage.includes(alreadyVerifiedMsg)) {
        toastTitle = 'Verification Conflict';
        toastDescription =
          'This wallet is already verified by another user. It cannot be verified for this account.';
      } else if (backendErrorMessage.includes(notFoundMsg)) {
        toastTitle = 'Verification Precondition Failed';
        toastDescription =
          'Wallet is not associated with this account. Ensure connection is complete.';
      }
      setError(toastDescription);
      toast({
        title: toastTitle,
        description: toastDescription,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [publicKey, signMessage, toast, isVerifying, dbWallet, onVerificationSuccess]);

  useEffect(() => {
    if (!publicKey) {
      setError(null);
      setIsVerifying(false);
    }
  }, [publicKey]);

  const canVerify = !!publicKey && !!signMessage && !!dbWallet && !isVerified;

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
        <div className='flex items-center gap-2 flex-wrap w-full'>
          <div className='flex items-center gap-1.5'>
            <Badge
              variant='outline'
              className='inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-orange-600 dark:text-orange-400 border-amber-200 dark:border-amber-800 transition-colors'>
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
              className='h-8 font-medium bg-green-500/10 text-white border-green-500/30 hover:bg-green-500/20 hover:text-white transition-all duration-200 ml-auto'
              onClick={handleVerify}
              disabled={!canVerify || isVerifying}>
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
