'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tipping, tokens, users, wallets } from '@/lib/api';
import { CONTRACT_ADDRESS, DYORHUB_DECIMALS, DYORHUB_SYMBOL } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { GetTippingEligibilityResponseDto } from '@dyor-hub/types';
import { RecordTipRequestDto, TipContentType, WalletResponse } from '@dyor-hub/types';
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { AlertCircle, CheckCircle, Coins, Loader2, Send, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface TipModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eligibilityResult: GetTippingEligibilityResponseDto | null;
  recipientUserId: string;
  recipientUsername?: string;
  contentType: string;
  contentId?: string;
  senderPublicKey: string | null;
}

type TipModalStep = 'input' | 'sending' | 'confirming' | 'success' | 'error';

export const TipModal = ({
  isOpen,
  onOpenChange,
  eligibilityResult,
  recipientUserId,
  recipientUsername,
  contentType,
  contentId,
  senderPublicKey,
}: TipModalProps) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet } = useWallet();
  const { user } = useAuthContext();
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<TipModalStep>('input');
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [dyorhubPrice, setDyorhubPrice] = useState<number | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [senderWalletStatus, setSenderWalletStatus] = useState<
    'ok' | 'no_wallet' | 'no_primary' | 'not_verified' | 'loading'
  >('loading');

  const recipientPublicKey = useMemo(() => {
    try {
      return eligibilityResult?.isEligible && eligibilityResult.recipientAddress
        ? new PublicKey(eligibilityResult.recipientAddress)
        : null;
    } catch {
      return null;
    }
  }, [eligibilityResult]);

  const dyorhubMintPublicKey = useMemo(() => new PublicKey(CONTRACT_ADDRESS), []);

  useEffect(() => {
    setSenderWalletStatus('loading');
    setError(null);
    setStep('input');

    if (!isOpen) {
      setTimeout(() => {
        setStep('input');
        setAmount('');
        setError(null);
        setIsSending(false);
        setUserBalance(null);
        setDyorhubPrice(null);
      }, 300);
      return;
    }

    if (eligibilityResult === null) {
      console.warn('[TipModal] Opened without eligibilityResult prop.');
      setError('Checking eligibility...');
      setStep('error');
      return;
    }

    if (!eligibilityResult.isEligible) {
      setError(
        'This user cannot receive tips. Their wallet might not be public or verified. Consider letting them know!',
      );
      setStep('error');
      return;
    }

    setIsLoadingWallets(true);
    wallets
      .list()
      .then((fetchedWallets: WalletResponse[]) => {
        let currentStatus: 'ok' | 'no_wallet' | 'no_primary' | 'not_verified' = 'no_wallet';
        if (senderPublicKey && fetchedWallets.length > 0) {
          const connectedWallet = fetchedWallets.find(
            (w: WalletResponse) => w.address === senderPublicKey,
          );
          if (connectedWallet) {
            if (connectedWallet.isPrimary && connectedWallet.isVerified) {
              currentStatus = 'ok';
            } else if (connectedWallet.isPrimary) {
              currentStatus = 'not_verified';
            } else {
              currentStatus = fetchedWallets.some((w: WalletResponse) => w.isPrimary)
                ? 'no_primary'
                : 'no_wallet';
            }
          }
        }
        setSenderWalletStatus(currentStatus);
        if (currentStatus !== 'ok') {
          let reasonText = 'Connect wallet to tip.';
          if (currentStatus === 'no_wallet')
            reasonText = 'Connect a wallet linked to your account and set it as primary.';
          else if (currentStatus === 'no_primary')
            reasonText = 'Connect & set your primary wallet.';
          else if (currentStatus === 'not_verified')
            reasonText = 'Verify your primary wallet first.';
          setError(reasonText);
        } else {
          fetchBalanceAndPrice();
        }
      })
      .catch(() => {
        setSenderWalletStatus('no_wallet');
        setError('Could not check your wallet status.');
        setStep('error');
      })
      .finally(() => setIsLoadingWallets(false));

    const fetchBalanceAndPrice = async () => {
      if (!user || !publicKey || !connection) {
        setUserBalance(null);
        setDyorhubPrice(null);
        return;
      }
      setIsBalanceLoading(true);
      users
        .getMyDyorhubBalance()
        .then((data) => setUserBalance(data.balance))
        .catch(() => setUserBalance(null))
        .finally(() => setIsBalanceLoading(false));
      setIsPriceLoading(true);
      tokens
        .getCurrentTokenPrice(CONTRACT_ADDRESS)
        .then((data) => setDyorhubPrice(data?.price ?? null))
        .catch(() => setDyorhubPrice(null))
        .finally(() => setIsPriceLoading(false));
    };
  }, [isOpen, user, publicKey, connection, eligibilityResult, recipientUserId]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSendTip = async () => {
    if (!publicKey || !recipientPublicKey || !wallet || !eligibilityResult?.recipientAddress) {
      setError('Wallet not connected or recipient address is missing.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    const amountLamports = Math.round(numericAmount * Math.pow(10, DYORHUB_DECIMALS));

    if (amountLamports <= 0) {
      setError('Amount is too small to send.');
      return;
    }

    const userBalanceLamports =
      userBalance !== null ? Math.floor(userBalance * Math.pow(10, DYORHUB_DECIMALS)) : null;
    if (userBalanceLamports === null) {
      setError('Could not verify your balance. Please try again.');
      return;
    }
    if (amountLamports > userBalanceLamports) {
      setError(`Insufficient ${DYORHUB_SYMBOL} balance.`);
      return;
    }

    setIsSending(true);
    setError(null);
    setStep('sending');

    try {
      const transaction = new Transaction();
      const instructions = [];

      const senderAta = getAssociatedTokenAddressSync(dyorhubMintPublicKey, publicKey);
      const recipientAta = getAssociatedTokenAddressSync(dyorhubMintPublicKey, recipientPublicKey);

      let recipientAtaExists = false;
      try {
        const recipientAtaInfo = await getAccount(connection, recipientAta, 'confirmed');
        recipientAtaExists = !!recipientAtaInfo;
      } catch {
        // Ignore error
      }

      if (!recipientAtaExists) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            recipientAta,
            recipientPublicKey,
            dyorhubMintPublicKey,
          ),
        );
        console.log('Added instruction to create recipient ATA');
      }

      instructions.push(
        createTransferCheckedInstruction(
          senderAta,
          dyorhubMintPublicKey,
          recipientAta,
          publicKey,
          amountLamports,
          DYORHUB_DECIMALS,
        ),
      );

      transaction.add(...instructions);

      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      setStep('confirming');

      const latestBlockhash = await connection.getLatestBlockhash();
      let confirmed = false;
      let confirmationError: Error | null = null;
      const startTime = Date.now();
      const timeoutMs = 60000;

      while (!confirmed && Date.now() - startTime < timeoutMs) {
        if (latestBlockhash.lastValidBlockHeight < (await connection.getBlockHeight())) {
          confirmationError = new Error(
            'Transaction confirmation polling timed out due to block height exceedance.',
          );
          break;
        }
        try {
          const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
          });
          if (
            status?.value?.confirmationStatus === 'confirmed' ||
            status?.value?.confirmationStatus === 'finalized'
          ) {
            if (status.value.err) {
              confirmationError = new Error(
                `Transaction failed on-chain: ${JSON.stringify(status.value.err)}`,
              );
            } else {
              confirmed = true;
            }
            break;
          }
        } catch {
          // Ignore error
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!confirmed && !confirmationError) {
        confirmationError = new Error('Transaction confirmation timed out after 60 seconds.');
      }

      if (confirmationError) {
        throw confirmationError;
      }

      const recordData: RecordTipRequestDto = {
        recipientUserId,
        amount: amountLamports,
        transactionSignature: signature,
        contentType: contentType as TipContentType,
        contentId,
      };

      const recordResult = await tipping.recordTip(recordData);

      if (recordResult.success) {
        setStep('success');
      } else {
        setError('Backend failed to record the tip.');
        setStep('error');
        throw new Error('Failed to record tip on backend.');
      }
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred during sending.');
      setStep('error');
    } finally {
      setIsSending(false);
    }
  };

  const numericAmountValue = parseFloat(amount) || 0;
  const usdValue = dyorhubPrice !== null ? numericAmountValue * dyorhubPrice : null;

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('input');
        setAmount('');
        setError(null);
        setIsSending(false);
      }, 300);
    }
  }, [isOpen]);

  const renderContent = () => {
    const isLoadingChecks = isLoadingWallets;
    if (isLoadingChecks && step !== 'error') {
      return (
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <div className='relative w-16 h-16 mb-5'>
            <div className='absolute inset-0 bg-amber-500/20 rounded-full animate-ping'></div>
            <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-amber-500/50'>
              <Loader2 className='h-8 w-8 text-amber-500 animate-spin' />
            </div>
          </div>
          <p className='font-medium text-lg text-zinc-100'>Checking Status</p>
          <p className='text-zinc-400 text-sm mt-1'>Verifying wallet status...</p>
        </div>
      );
    }

    switch (step) {
      case 'sending':
      case 'confirming':
        return (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <div className='relative w-16 h-16 mb-5'>
              <div className='absolute inset-0 bg-amber-500/20 rounded-full animate-ping'></div>
              <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-amber-500/50'>
                <Loader2 className='h-8 w-8 text-amber-500 animate-spin' />
              </div>
            </div>
            <p className='font-medium text-lg text-zinc-100'>
              {step === 'sending' ? 'Sending $DYORHUB' : 'Confirming Transaction'}
            </p>
            <p className='text-zinc-400 text-sm mt-2 max-w-xs'>
              {step === 'sending'
                ? 'Please approve the transaction in your wallet'
                : 'Waiting for network confirmation...'}
            </p>
            <div className='w-full max-w-xs mt-6 bg-zinc-800/50 rounded-lg overflow-hidden'>
              <div className='h-1 bg-amber-500 animate-pulse'></div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className='flex flex-col items-center justify-center py-8 sm:py-10 text-center'>
            <div className='relative w-16 h-16 mb-4 sm:mb-5'>
              <div className='absolute inset-0 bg-green-500/20 rounded-full'></div>
              <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-green-500/50'>
                <CheckCircle className='h-8 w-8 text-green-500' />
              </div>
            </div>
            <p className='font-medium text-lg text-zinc-100'>Tip Sent Successfully!</p>
            <div className='mt-4 bg-black border border-zinc-800 rounded-lg p-3 sm:p-4 w-[90%] sm:w-[240px] max-w-[280px]'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-zinc-400 text-sm'>Amount:</span>
                <span className='text-white font-medium text-sm'>
                  {(parseFloat(amount) || 0).toLocaleString()} {DYORHUB_SYMBOL}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-zinc-400 text-sm'>Recipient: </span>
                <span className='text-white font-medium text-sm'>
                  {recipientUsername ||
                    eligibilityResult?.recipientAddress?.substring(0, 6) + '...'}
                </span>
              </div>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              variant='secondary'
              size='sm'
              className='mt-5 sm:mt-6 bg-black hover:bg-zinc-900 text-white border border-green-500/50 px-6'>
              Close
            </Button>
          </div>
        );
      case 'error':
        const isCannotReceiveTipsError =
          error?.includes('cannot receive tips') ||
          error?.includes('wallet might not be public or verified');

        if (isCannotReceiveTipsError) {
          return (
            <div className='flex flex-col items-center justify-center py-8 sm:py-10 text-center'>
              <div className='relative w-16 h-16 mb-4 sm:mb-5'>
                <div className='absolute inset-0 bg-amber-500/20 rounded-full'></div>
                <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-amber-500/50'>
                  <AlertCircle className='h-8 w-8 text-amber-500' />
                </div>
              </div>
              <p className='font-medium text-lg text-zinc-100'>Cannot Tip User</p>
              <div className='mt-4 bg-black border border-amber-500/30 rounded-lg p-3 sm:p-4 max-w-[90%] sm:max-w-sm'>
                <div className='flex items-start gap-2'>
                  <AlertCircle className='h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5' />
                  <p className='text-sm text-amber-400 text-left'>
                    This user cannot receive tips. Their wallet might not be public or verified.
                    Consider letting them know!
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onOpenChange(false)}
                variant='secondary'
                size='sm'
                className='mt-5 sm:mt-6 bg-black hover:bg-zinc-900 text-white border border-zinc-700 px-6'>
                Close
              </Button>
            </div>
          );
        }

        if (!eligibilityResult?.isEligible && error?.includes('eligible')) {
          return (
            <div className='flex flex-col items-center justify-center py-10 text-center'>
              <XCircle className='h-12 w-12 text-red-500 mb-4' />
              <p className='font-medium text-lg text-zinc-100'>Cannot Tip User</p>
              <p className='text-sm text-red-400 mt-1 break-all'>{error}</p>
              <Button
                onClick={() => onOpenChange(false)}
                variant='secondary'
                size='sm'
                className='mt-6'>
                Close
              </Button>
            </div>
          );
        }

        if (senderWalletStatus !== 'ok' && error?.includes('wallet')) {
          return (
            <div className='flex flex-col items-center gap-4 py-6'>
              <div className='flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-500'>
                <AlertCircle className='w-6 h-6' />
              </div>
              <div className='text-center'>
                <h3 className='font-semibold mb-2'>Wallet Setup Required</h3>
                <p className='text-sm text-gray-300 mb-4'>
                  {error || 'You need to set up your wallet to send tips.'}
                </p>
              </div>
              <div className='flex space-x-3 mt-2'>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant='outline'
                  size='sm'
                  className='border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300'>
                  Close
                </Button>
                <Button
                  onClick={() => (window.location.href = '/account/wallet')}
                  variant='secondary'
                  size='sm'
                  className='bg-amber-500 hover:bg-amber-600 text-black font-medium'>
                  Wallet Settings
                </Button>
              </div>
            </div>
          );
        }

        return (
          <>
            <DialogHeader className='pb-2 sm:pb-4 border-b border-zinc-800 px-3 sm:px-0 pt-3 sm:pt-0'>
              <div className='flex items-center'>
                <div className='w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3 sm:mr-2 border border-amber-500/50 flex-shrink-0'>
                  <Coins className='h-4 w-4 text-amber-500' />
                </div>
                <div className='text-left'>
                  <DialogTitle className='text-zinc-100 text-left'>
                    Tip{' '}
                    {recipientUsername ||
                      eligibilityResult?.recipientAddress?.substring(0, 6) + '...'}
                  </DialogTitle>
                  <DialogDescription className='text-zinc-400 mt-0.5 text-left'>
                    Send tokens to show appreciation
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className='py-3 sm:py-6 px-3 sm:px-1'>
              <div className='mb-5 sm:mb-6'>
                <Label htmlFor='amount' className='text-zinc-300 mb-2 block'>
                  Amount to Send
                </Label>
                <div className='relative'>
                  <Input
                    id='amount'
                    type='text'
                    inputMode='decimal'
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder='0.00'
                    className='bg-black border-zinc-800 focus-visible:ring-amber-500 text-lg pl-4 pr-[90px] py-3 h-auto'
                    disabled={isSending}
                  />
                  <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 pointer-events-none'>
                    <span className='font-medium text-amber-500'>{DYORHUB_SYMBOL}</span>
                  </div>
                </div>

                <div className='mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm'>
                  <div className='text-zinc-500 mb-1.5 sm:mb-0'>
                    {isPriceLoading ? (
                      <span className='flex items-center gap-1'>
                        <Loader2 className='h-3 w-3 animate-spin' /> Loading price...
                      </span>
                    ) : usdValue !== null ? (
                      <span className='text-zinc-400'>≈ {formatPrice(usdValue)} USD</span>
                    ) : numericAmountValue > 0 ? (
                      <span className='text-amber-500'>Could not load price</span>
                    ) : (
                      ''
                    )}
                  </div>

                  <div className='text-zinc-400'>
                    {isBalanceLoading ? (
                      <span className='flex items-center gap-1'>
                        <Loader2 className='h-3 w-3 animate-spin' /> Loading balance...
                      </span>
                    ) : typeof userBalance === 'number' ? (
                      <span>
                        Balance: {userBalance.toLocaleString()} {DYORHUB_SYMBOL}
                      </span>
                    ) : (
                      <span className='text-amber-500'>Could not load balance</span>
                    )}
                  </div>
                </div>
              </div>

              <div className='mb-4'>
                <Label className='text-zinc-500 text-xs block mb-2'>Quick Amounts</Label>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                  {[10000, 20000, 50000, 100000].map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type='button'
                      variant='outline'
                      size='sm'
                      className={`border border-zinc-800 hover:bg-zinc-900 hover:border-amber-700 py-1.5 sm:py-0 px-2 sm:px-0 h-auto sm:h-9 ${
                        parseFloat(amount) === quickAmount
                          ? 'bg-black border-amber-700 text-amber-500'
                          : 'bg-black text-zinc-300'
                      }`}
                      onClick={() => setAmount(quickAmount.toString())}>
                      {quickAmount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {error && (
                <div className='bg-black border border-red-500/30 rounded-md p-3 mb-4'>
                  <div className='flex items-start gap-2'>
                    <AlertCircle className='h-5 w-5 text-red-400 flex-shrink-0 mt-0.5' />
                    <p className='text-sm text-red-300'>{error}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className='border-t border-zinc-800 pt-3 sm:pt-4 px-3 sm:px-0 gap-2 sm:gap-3 flex-col sm:flex-row pb-3 sm:pb-0'>
              <DialogClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full sm:w-auto sm:flex-1 border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 py-2 sm:py-0 h-auto sm:h-10'>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type='submit'
                onClick={handleSendTip}
                disabled={isSending || !amount || !publicKey}
                className='w-full sm:w-auto sm:flex-1 bg-black hover:bg-zinc-900 text-amber-500 border border-amber-700 py-2 sm:py-0 h-auto sm:h-10'>
                <Send className='mr-2 h-4 w-4' /> Send Tip
              </Button>
            </DialogFooter>
          </>
        );
      case 'input':
      default:
        if (!eligibilityResult?.isEligible) {
          return (
            <div className='flex flex-col items-center justify-center py-10 text-center'>
              <div className='relative w-16 h-16 mb-5'>
                <div className='absolute inset-0 bg-amber-500/20 rounded-full'></div>
                <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-amber-500/50'>
                  <AlertCircle className='h-8 w-8 text-amber-500' />
                </div>
              </div>
              <p className='font-medium text-lg text-zinc-100'>Cannot Tip User</p>
              <div className='mt-4 bg-black border border-amber-500/30 rounded-lg p-4 max-w-sm'>
                <div className='flex items-start gap-2'>
                  <AlertCircle className='h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5' />
                  <p className='text-sm text-amber-400 text-left'>
                    {error ||
                      'This user cannot receive tips. Their wallet might not be public or verified. Consider letting them know!'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onOpenChange(false)}
                variant='secondary'
                size='sm'
                className='mt-6 bg-black hover:bg-zinc-900 text-white border border-zinc-700 px-6'>
                Close
              </Button>
            </div>
          );
        }

        // Check wallet status in input state and show warning
        if (senderWalletStatus !== 'ok') {
          return (
            <div className='flex flex-col items-center gap-4 py-6'>
              <div className='flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-500'>
                <AlertCircle className='w-6 h-6' />
              </div>
              <div className='text-center'>
                <h3 className='font-semibold mb-2'>Wallet Setup Required</h3>
                <p className='text-sm text-gray-300 mb-4'>
                  {error || 'You need to set up your wallet to send tips.'}
                </p>
              </div>
              <div className='flex space-x-3 mt-2'>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant='outline'
                  size='sm'
                  className='border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300'>
                  Close
                </Button>
                <Button
                  onClick={() => (window.location.href = '/account/wallet')}
                  variant='secondary'
                  size='sm'
                  className='bg-amber-500 hover:bg-amber-600 text-black font-medium'>
                  Wallet Settings
                </Button>
              </div>
            </div>
          );
        }
        return (
          <>
            <DialogHeader className='pb-2 sm:pb-4 border-b border-zinc-800 px-3 sm:px-0 pt-3 sm:pt-0'>
              <div className='flex items-center'>
                <div className='w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3 sm:mr-2 border border-amber-500/50 flex-shrink-0'>
                  <Coins className='h-4 w-4 text-amber-500' />
                </div>
                <div className='text-left'>
                  <DialogTitle className='text-zinc-100 text-left'>
                    Tip{' '}
                    {recipientUsername ||
                      eligibilityResult?.recipientAddress?.substring(0, 6) + '...'}
                  </DialogTitle>
                  <DialogDescription className='text-zinc-400 mt-0.5 text-left'>
                    Send tokens to show appreciation
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className='py-3 sm:py-6 px-3 sm:px-1'>
              <div className='mb-5 sm:mb-6'>
                <Label htmlFor='amount' className='text-zinc-300 mb-2 block'>
                  Amount to Send
                </Label>
                <div className='relative'>
                  <Input
                    id='amount'
                    type='text'
                    inputMode='decimal'
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder='0.00'
                    className='bg-black border-zinc-800 focus-visible:ring-amber-500 text-lg pl-4 pr-[90px] py-3 h-auto'
                    disabled={isSending}
                  />
                  <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 pointer-events-none'>
                    <span className='font-medium text-amber-500'>{DYORHUB_SYMBOL}</span>
                  </div>
                </div>

                <div className='mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm'>
                  <div className='text-zinc-500 mb-1.5 sm:mb-0'>
                    {isPriceLoading ? (
                      <span className='flex items-center gap-1'>
                        <Loader2 className='h-3 w-3 animate-spin' /> Loading price...
                      </span>
                    ) : usdValue !== null ? (
                      <span className='text-zinc-400'>≈ {formatPrice(usdValue)} USD</span>
                    ) : numericAmountValue > 0 ? (
                      <span className='text-amber-500'>Could not load price</span>
                    ) : (
                      ''
                    )}
                  </div>

                  <div className='text-zinc-400'>
                    {isBalanceLoading ? (
                      <span className='flex items-center gap-1'>
                        <Loader2 className='h-3 w-3 animate-spin' /> Loading balance...
                      </span>
                    ) : typeof userBalance === 'number' ? (
                      <span>
                        Balance: {userBalance.toLocaleString()} {DYORHUB_SYMBOL}
                      </span>
                    ) : (
                      <span className='text-amber-500'>Could not load balance</span>
                    )}
                  </div>
                </div>
              </div>

              <div className='mb-4'>
                <Label className='text-zinc-500 text-xs block mb-2'>Quick Amounts</Label>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                  {[10000, 20000, 50000, 100000].map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type='button'
                      variant='outline'
                      size='sm'
                      className={`border border-zinc-800 hover:bg-zinc-900 hover:border-amber-700 py-1.5 sm:py-0 px-2 sm:px-0 h-auto sm:h-9 ${
                        parseFloat(amount) === quickAmount
                          ? 'bg-black border-amber-700 text-amber-500'
                          : 'bg-black text-zinc-300'
                      }`}
                      onClick={() => setAmount(quickAmount.toString())}>
                      {quickAmount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {error && (
                <div className='bg-black border border-red-500/30 rounded-md p-3 mb-4'>
                  <div className='flex items-start gap-2'>
                    <AlertCircle className='h-5 w-5 text-red-400 flex-shrink-0 mt-0.5' />
                    <p className='text-sm text-red-300'>{error}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className='border-t border-zinc-800 pt-3 sm:pt-4 px-3 sm:px-0 gap-2 sm:gap-3 flex-col sm:flex-row pb-3 sm:pb-0'>
              <DialogClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full sm:w-auto sm:flex-1 border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 py-2 sm:py-0 h-auto sm:h-10'>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type='submit'
                onClick={handleSendTip}
                disabled={isSending || !amount || !publicKey}
                className='w-full sm:w-auto sm:flex-1 bg-black hover:bg-zinc-900 text-amber-500 border border-amber-700 py-2 sm:py-0 h-auto sm:h-10'>
                <Send className='mr-2 h-4 w-4' /> Send Tip
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden max-w-[95vw]'>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
