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
import { tipping, tokens, users } from '@/lib/api';
import { CONTRACT_ADDRESS, DYORHUB_DECIMALS, DYORHUB_SYMBOL } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { GetTippingEligibilityResponseDto } from '@dyor-hub/types';
import { RecordTipRequestDto, TipContentType } from '@dyor-hub/types';
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
  const [initialCheckDone, setInitialCheckDone] = useState(false);

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
    setInitialCheckDone(false);
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
      return;
    }

    if (!eligibilityResult.isEligible) {
      setError(
        'This user cannot receive tips. Their wallet might not be public or verified. Consider letting them know!',
      );
      setStep('error');
      setInitialCheckDone(true);
      return;
    }

    setInitialCheckDone(true);
    const fetchData = async () => {
      if (!user || !publicKey || !connection) {
        setUserBalance(null);
        setDyorhubPrice(null);
        return;
      }

      setIsBalanceLoading(true);
      users
        .getMyDyorhubBalance()
        .then((data) => {
          setUserBalance(data.balance);
        })
        .catch(() => {
          setUserBalance(null);
        })
        .finally(() => setIsBalanceLoading(false));

      setIsPriceLoading(true);
      tokens
        .getCurrentTokenPrice(CONTRACT_ADDRESS)
        .then((data) => {
          setDyorhubPrice(data?.price ?? null);
        })
        .catch(() => {
          setDyorhubPrice(null);
        })
        .finally(() => setIsPriceLoading(false));
    };

    fetchData();
  }, [isOpen, user, publicKey, connection, eligibilityResult]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSendTip = async () => {
    const recipientAddressFromProps = eligibilityResult?.recipientAddress;
    if (!publicKey || !recipientPublicKey || !wallet || !recipientAddressFromProps) {
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
    if (!initialCheckDone && step !== 'error') {
      return (
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <div className='relative w-16 h-16 mb-5'>
            <div className='absolute inset-0 bg-amber-500/20 rounded-full animate-ping'></div>
            <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-amber-500/50'>
              <Loader2 className='h-8 w-8 text-amber-500 animate-spin' />
            </div>
          </div>
          <p className='font-medium text-lg text-zinc-100'>Checking Eligibility</p>
          <p className='text-zinc-400 text-sm mt-1'>Verifying user wallet information...</p>
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
          <div className='flex flex-col items-center justify-center py-10 text-center'>
            <div className='relative w-16 h-16 mb-5'>
              <div className='absolute inset-0 bg-green-500/20 rounded-full'></div>
              <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-green-500/50'>
                <CheckCircle className='h-8 w-8 text-green-500' />
              </div>
            </div>
            <p className='font-medium text-lg text-zinc-100'>Tip Sent Successfully!</p>
            <div className='mt-4 bg-black border border-zinc-800 rounded-lg p-4 w-[240px]'>
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
              className='mt-6 bg-black hover:bg-zinc-900 text-white border border-green-500/50 px-6'>
              Close
            </Button>
          </div>
        );
      case 'error':
        // Check if this is a "cannot receive tips" error
        const isCannotReceiveTipsError =
          error?.includes('cannot receive tips') ||
          error?.includes('wallet might not be public or verified');

        if (isCannotReceiveTipsError) {
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
                    This user cannot receive tips. Their wallet might not be public or verified.
                    Consider letting them know!
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

        // For other errors, show the regular error state
        return (
          <div className='flex flex-col items-center justify-center py-10 text-center'>
            <div className='relative w-16 h-16 mb-5'>
              <div className='absolute inset-0 bg-red-500/20 rounded-full'></div>
              <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-red-500/50'>
                <XCircle className='h-8 w-8 text-red-500' />
              </div>
            </div>
            <p className='font-medium text-lg text-zinc-100'>Tip Failed</p>
            <div className='mt-4 bg-black border border-red-500/30 rounded-lg p-4 max-w-sm'>
              <div className='flex items-start gap-2'>
                <AlertCircle className='h-5 w-5 text-red-400 flex-shrink-0 mt-0.5' />
                <p className='text-sm text-red-300 text-left break-all'>
                  {error || 'An unknown error occurred.'}
                </p>
              </div>
            </div>
            <div className='flex gap-3 mt-6'>
              <Button
                onClick={() => {
                  setStep('input');
                  setError(null);
                }}
                variant='outline'
                size='sm'
                className='border-zinc-700 bg-black hover:bg-zinc-900 hover:text-white'>
                Try Again
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant='secondary'
                size='sm'
                className='bg-black hover:bg-zinc-900 text-white border border-zinc-700'>
                Close
              </Button>
            </div>
          </div>
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
        return (
          <>
            <DialogHeader className='pb-4 border-b border-zinc-800'>
              <div className='flex items-center'>
                <div className='w-8 h-8 rounded-full bg-black flex items-center justify-center mr-2 border border-amber-500/50'>
                  <Coins className='h-4 w-4 text-amber-500' />
                </div>
                <div>
                  <DialogTitle className='text-zinc-100'>
                    Tip{' '}
                    {recipientUsername ||
                      eligibilityResult?.recipientAddress?.substring(0, 6) + '...'}
                  </DialogTitle>
                  <DialogDescription className='text-zinc-400 mt-0.5'>
                    Send tokens to show appreciation
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className='py-6 px-1'>
              <div className='mb-6'>
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
                    className='bg-black border-zinc-800 focus-visible:ring-amber-500 text-lg pl-4 pr-24 py-4 h-auto'
                    disabled={isSending}
                  />
                  <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 pointer-events-none'>
                    <span className='font-medium text-amber-500'>{DYORHUB_SYMBOL}</span>
                  </div>
                </div>

                <div className='mt-2 flex items-center justify-between text-sm'>
                  <div className='text-zinc-500'>
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

              {/* Quick amount buttons */}
              <div className='mb-4'>
                <Label className='text-zinc-500 text-xs block mb-2'>Quick Amounts</Label>
                <div className='grid grid-cols-4 gap-2'>
                  {[10000, 20000, 50000, 100000].map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type='button'
                      variant='outline'
                      size='sm'
                      className={`border border-zinc-800 hover:bg-zinc-900 hover:border-amber-700 ${
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
            <DialogFooter className='border-t border-zinc-800 pt-4 gap-3'>
              <DialogClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='flex-1 border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300'>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type='submit'
                onClick={handleSendTip}
                disabled={isSending || !amount || !publicKey}
                className='flex-1 bg-black hover:bg-zinc-900 text-amber-500 border border-amber-700'>
                <Send className='mr-2 h-4 w-4' /> Send Tip
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden'>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
