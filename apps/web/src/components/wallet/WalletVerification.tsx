'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { wallets } from '@/lib/api';
import { truncateAddress } from '@/lib/utils';
import {
  checkBrowserStorageAccess,
  checkForKnownWalletIssues,
  createSignatureMessage,
  getWalletType,
  setWalletVerified,
} from '@/lib/wallet';
import { DbWallet } from '@dyor-hub/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { CheckCircleIcon, Loader2Icon, ShieldIcon, XCircleIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { WalletTroubleshooting } from './WalletTroubleshooting';

interface WalletVerificationProps {
  dbWallet: DbWallet;
  onVerificationSuccess: (showToast?: boolean) => void;
}

export function WalletVerification({ dbWallet, onVerificationSuccess }: WalletVerificationProps) {
  const { publicKey, signMessage } = useWallet();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(dbWallet.isVerified);
  const [error, setError] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [walletType, setWalletType] = useState('Phantom');
  const { toast } = useToast();

  useEffect(() => {
    setIsVerified(dbWallet.isVerified);
    setWalletType(getWalletType());
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
    const tryCount = 0;

    // Check for known wallet/browser issues
    const walletIssues = checkForKnownWalletIssues();
    if (walletIssues.hasKnownIssues) {
      console.log('Known wallet issues detected:', walletIssues);
      setError(
        walletIssues.description ||
          'Your browser/wallet combination may have compatibility issues.',
      );
      setShowTroubleshooting(true);
      toast({
        title: 'Wallet Compatibility Issue',
        description: walletIssues.description || 'See troubleshooting steps below.',
        variant: 'destructive',
      });
      return;
    }

    // Check for browser storage access issues before attempting verification
    try {
      const storageAccess = await checkBrowserStorageAccess();
      if (!storageAccess.hasAccess) {
        console.log('Browser storage access issue detected:', storageAccess.error);
        setError('Your browser has restricted storage access, which may affect wallet signing.');
        setShowTroubleshooting(true);
        toast({
          title: 'Browser Permission Issue',
          description: 'Storage access is restricted. See troubleshooting steps below.',
          variant: 'destructive',
        });
        return;
      }
    } catch (err) {
      console.warn('Error checking storage access:', err);
    }

    const attemptVerification = async () => {
      try {
        setIsVerifying(true);
        setError(null);
        setShowTroubleshooting(false);

        console.log('Starting wallet verification for:', {
          address: walletAddress,
          dbWalletId: dbWallet.id,
          signMessageAvailable: typeof signMessage === 'function',
          tryCount,
        });

        const { nonce } = await wallets.generateNonce(walletAddress);
        console.log('Received nonce:', { nonce });

        const message = createSignatureMessage(nonce);
        console.log('Signing message:', { message, nonce, walletAddress });

        const encodedMessage = new TextEncoder().encode(message);
        console.log('Encoded message length:', encodedMessage.length);

        let signature;
        try {
          signature = await signMessage(encodedMessage);
        } catch (signError) {
          console.error('Error during signing:', signError);

          if (
            signError instanceof Error &&
            (signError.message.includes('storage is not allowed') ||
              signError.message.includes('WalletSignMessageError') ||
              signError.message.includes('Unexpected error'))
          ) {
            setError(`Wallet permission error. Please check the troubleshooting steps below.`);
            setShowTroubleshooting(true);
            toast({
              title: 'Wallet Permission Error',
              description:
                'Your wallet has security restrictions. See troubleshooting steps below.',
              variant: 'destructive',
            });
            setIsVerifying(false);
            return false;
          }

          throw signError;
        }

        console.log('Generated signature:', {
          signatureType: typeof signature,
          signatureLength: signature.byteLength,
          signatureInstance: Object.prototype.toString.call(signature),
        });

        const signatureBase64 = Buffer.from(signature).toString('base64');
        console.log('Base64 signature:', {
          base64Length: signatureBase64.length,
          base64Snippet: signatureBase64.substring(0, 20) + '...',
        });

        const verificationResult = await wallets.verify(walletAddress, signatureBase64);
        console.log('Verification API response:', verificationResult);

        if (verificationResult.isVerified) {
          setWalletVerified(walletAddress, true);
          setIsVerified(true);
          setShowTroubleshooting(false);

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
                return true;
              }
            }
          } catch (err) {
            console.error('Error checking/setting primary wallet:', err);
          }

          toast({
            title: 'Wallet Verified',
            description: `Successfully verified wallet ${truncateAddress(walletAddress)}`,
          });
          onVerificationSuccess(true);
          return true;
        } else {
          throw new Error('Server verification check failed.');
        }
      } catch (err: unknown) {
        console.error('Wallet verification error:', {
          error: err,
          errorType: typeof err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorObject: JSON.stringify(err, Object.getOwnPropertyNames(err)),
        });

        const alreadyVerifiedMsg = 'Wallet already verified by another user';
        const notFoundMsg = 'Wallet not found. Please connect the wallet first';
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
        } else if (
          backendErrorMessage.includes('WalletSignMessageError') ||
          backendErrorMessage.includes('storage is not allowed') ||
          backendErrorMessage.includes('Unexpected error')
        ) {
          toastTitle = 'Wallet Permission Error';
          toastDescription =
            'Your wallet has security restrictions. See troubleshooting steps below.';
          setShowTroubleshooting(true);
        }

        setError(toastDescription);
        toast({
          title: toastTitle,
          description: toastDescription,
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsVerifying(false);
      }
    };

    await attemptVerification();
  }, [publicKey, signMessage, toast, isVerifying, dbWallet, onVerificationSuccess]);

  useEffect(() => {
    if (!publicKey) {
      setError(null);
      setIsVerifying(false);
      setShowTroubleshooting(false);
    }
  }, [publicKey]);

  const canVerify = !!publicKey && !!signMessage && !!dbWallet && !isVerified;

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2 flex-wrap'>
        {isVerified ? (
          <div className='flex items-center gap-1.5'>
            <Badge
              variant='outline'
              className='inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 transition-colors'>
              <CheckCircleIcon className='h-3.5 w-3.5' />
              <span className='font-medium'>Verified</span>
            </Badge>
            <span className='text-xs text-muted-foreground'>
              Your wallet ownership is confirmed
            </span>
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
                className='h-8 font-medium bg-background dark:bg-muted cursor-pointer border-white/20 hover:bg-muted/50 hover:border-white/50 transition-all duration-200 ml-auto'
                onClick={() => {
                  setShowTroubleshooting(false);
                  handleVerify();
                }}
                disabled={!canVerify || isVerifying}>
                <ShieldIcon className='h-3.5 w-3.5 mr-1.5' />
                Verify Now
              </Button>
            )}
          </div>
        )}
        {error && !showTroubleshooting && (
          <div className='w-full mt-1.5'>
            <p className='text-red-500 text-xs bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-md px-2.5 py-1.5'>
              {error}
            </p>
          </div>
        )}
      </div>

      {showTroubleshooting && !isVerified && (
        <WalletTroubleshooting
          walletType={walletType}
          onRetry={() => {
            setShowTroubleshooting(false);
            handleVerify();
          }}
        />
      )}
    </div>
  );
}
