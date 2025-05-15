'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { credits } from '@/lib/api';
import { DYORHUB_MARKETING_ADDRESS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { BonusTier, CreditPackage, CreditTransaction } from '@dyor-hub/types';
import { CreditTransactionType } from '@dyor-hub/types';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle,
  Coins,
  ExternalLink,
  History,
  Info,
  Loader2,
  Minus,
  Plus,
  Send,
  Star,
  WalletCards,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_HISTORY_LIMIT = 5;

type PurchaseStep = 'input' | 'sending' | 'confirming' | 'success' | 'error';

const getSolscanUrl = (txHash: string): string => {
  return `https://solscan.io/tx/${txHash}`;
};

export default function CreditsPage() {
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const { toast } = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [historyMeta, setHistoryMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isPackagesLoading, setIsPackagesLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [dyorHubBalance, setDyorHubBalance] = useState<number | null>(null);
  const [isDyorHubBalanceLoading, setIsDyorHubBalanceLoading] = useState(false);
  const [applicableBonus, setApplicableBonus] = useState<BonusTier | null>(null);
  const [isBonusInfoLoading, setIsBonusInfoLoading] = useState(false);
  const [allBonusTiers, setAllBonusTiers] = useState<BonusTier[]>([]);
  const [isAllBonusTiersLoading, setIsAllBonusTiersLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    setIsBalanceLoading(true);
    try {
      const data = await credits.getBalance();
      setBalance(data.credits);
    } catch {
      toast({
        title: 'Error Fetching Balance',
        description: 'Could not load credit balance.',
        variant: 'destructive',
      });
      setBalance(null);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [toast]);

  const loadPackages = useCallback(async () => {
    setIsPackagesLoading(true);
    try {
      const data = await credits.getAvailablePackages();
      setPackages(data);
    } catch {
      toast({
        title: 'Error Fetching Packages',
        description: 'Could not load credit packages.',
        variant: 'destructive',
      });
      setPackages([]);
    } finally {
      setIsPackagesLoading(false);
    }
  }, [toast]);

  const loadHistory = useCallback(
    async (page: number) => {
      setIsHistoryLoading(true);
      try {
        const data = await credits.getHistory({
          page,
          limit: DEFAULT_HISTORY_LIMIT,
        });
        setHistory(data.data);
        setHistoryMeta(data.meta);
      } catch {
        toast({
          title: 'Error Fetching History',
          description: 'Could not load transaction history.',
          variant: 'destructive',
        });
        setHistory([]);
        setHistoryMeta(null);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [toast],
  );

  const loadDyorHubBalance = useCallback(async () => {
    if (!publicKey) return;
    setIsDyorHubBalanceLoading(true);
    try {
      const data = await credits.getDyorHubBalance();
      setDyorHubBalance(data.balance);
    } catch {
      setDyorHubBalance(null);
    } finally {
      setIsDyorHubBalanceLoading(false);
    }
  }, [publicKey]);

  const loadBonusInfo = useCallback(async () => {
    if (!user || !connected) return;
    setIsBonusInfoLoading(true);
    try {
      const bonus = await credits.getBonusInfo();
      setApplicableBonus(bonus);
    } catch {
      setApplicableBonus(null);
    } finally {
      setIsBonusInfoLoading(false);
    }
  }, [user, connected]);

  const loadAllBonusTiers = useCallback(async () => {
    if (!user) return;
    setIsAllBonusTiersLoading(true);
    try {
      const tiers = await credits.getAllBonusTiers();
      setAllBonusTiers(tiers);
    } catch {
      toast({
        title: 'Error Fetching Bonus Tiers',
        description: 'Could not load all available bonus tiers.',
        variant: 'destructive',
      });
      setAllBonusTiers([]);
    } finally {
      setIsAllBonusTiersLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadBalance();
      loadPackages();
      loadHistory(1);
      loadAllBonusTiers();
    }
  }, [user, loadBalance, loadPackages, loadHistory, loadAllBonusTiers]);

  useEffect(() => {
    if (connected && publicKey && user) {
      loadDyorHubBalance();
      loadBonusInfo();
    } else {
      setDyorHubBalance(null);
      setApplicableBonus(null);
    }
  }, [connected, publicKey, user, loadDyorHubBalance, loadBonusInfo]);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!connected || !publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to purchase credits.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({
        title: 'Not Logged In',
        description: 'Please log in to purchase credits.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedPackage(pkg);
    setPurchaseStep('sending');
    setError(null);

    try {
      const destinationAddress = new PublicKey(DYORHUB_MARKETING_ADDRESS);
      const lamportsToSend = Math.round(pkg.solPrice * LAMPORTS_PER_SOL);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: destinationAddress,
          lamports: lamportsToSend,
        }),
      );

      const signature = await sendTransaction(transaction, connection);
      setPurchaseStep('confirming');

      let confirmed = false;
      let confirmationError: Error | null = null;
      const startTime = Date.now();
      const timeoutMs = 60000;

      while (!confirmed && Date.now() - startTime < timeoutMs) {
        if (lastValidBlockHeight < (await connection.getBlockHeight())) {
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
          // Ignore error and continue polling
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!confirmed && !confirmationError) {
        confirmationError = new Error('Transaction confirmation timed out after 60 seconds.');
      }

      if (confirmationError) {
        throw confirmationError;
      }

      try {
        const updatedUser = await credits.purchaseCredits({
          packageId: pkg.id,
          solanaTransactionId: signature,
        });

        setBalance(updatedUser.credits);
        setPurchaseStep('success');
        loadHistory(1);
        loadBalance();
      } catch {
        setError(
          'Your transaction was successful, but we had trouble updating your credits. ' +
            'Please refresh the page or contact support if your credits are not updated.',
        );
        setPurchaseStep('error');
      }
    } catch (error) {
      let errorMessage = 'Failed to send the transaction.';

      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'You cancelled the transaction.';
        } else if (error.message.includes('block height exceedance')) {
          errorMessage = 'The transaction expired. Please try again.';
        } else if (error.message.includes('Transaction failed on-chain')) {
          errorMessage = 'The transaction failed to process. Please try again.';
        } else if (error.message.includes('confirmation timeout')) {
          errorMessage =
            'The transaction is taking longer than expected. Please check your wallet for the status.';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      setPurchaseStep('error');
      console.error('Transaction error:', error);
    }
  };

  if (isAuthLoading) {
    return (
      <div className='container mx-auto p-4 md:p-8 space-y-8'>
        <Skeleton className='h-8 w-1/4' />
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-64 w-full' />
      </div>
    );
  }

  if (!user) {
    return (
      <div className='container mx-auto p-4 md:p-8'>
        <Alert variant='destructive'>
          <Info className='h-4 w-4' />
          <AlertTitle>Not Logged In</AlertTitle>
          <AlertDescription>Please log in to view and purchase credits.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className='space-y-6 animate-in fade-in duration-500'>
      <div className='space-y-2'>
        <h1 className='text-2xl font-bold tracking-tight'>Credits</h1>
        <p className='text-muted-foreground'>
          Purchase and manage your credits for platform features.
          {(isDyorHubBalanceLoading || isBonusInfoLoading || isAllBonusTiersLoading) &&
            publicKey && (
              <span className='text-xs ml-2 animate-pulse'>(Checking $DYORHUB status...)</span>
            )}
        </p>
      </div>

      {/* Bonus Tiers Section */}
      {(isAllBonusTiersLoading || allBonusTiers.length > 0) && (
        <div className='rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden'>
          <div className='p-2 border-b border-border/60 bg-muted/30 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-6 rounded-full bg-black flex items-center justify-center border border-amber-500/50'>
                <Star className='h-3 w-3 text-amber-500' />
              </div>
              <h2 className='text-sm font-semibold'>$DYORHUB Bonus Tiers</h2>
            </div>
            {dyorHubBalance !== null && !isDyorHubBalanceLoading && (
              <span className='text-xs text-muted-foreground'>
                Your balance:{' '}
                <span className='font-medium text-amber-500'>
                  {dyorHubBalance.toLocaleString()}
                </span>{' '}
                $DYORHUB
              </span>
            )}
          </div>
          <div className='px-3 py-2'>
            {isAllBonusTiersLoading ? (
              <div className='flex items-center gap-2 justify-around'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-8 w-24 rounded-md' />
                ))}
              </div>
            ) : (
              <div className='flex items-center justify-around gap-1 flex-wrap'>
                {allBonusTiers
                  .sort((a, b) => a.minTokenHold - b.minTokenHold)
                  .map((tier) => {
                    const isActive = applicableBonus?.label === tier.label;
                    const isEligible =
                      dyorHubBalance !== null && dyorHubBalance >= tier.minTokenHold;

                    return (
                      <div
                        key={tier.label}
                        className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all duration-200
                        ${
                          isActive
                            ? 'bg-green-500/10 border border-green-500/50'
                            : isEligible
                              ? 'bg-amber-500/10 border border-amber-500/20'
                              : 'bg-muted/30 border border-border/40 opacity-70'
                        }`}>
                        <div className='flex items-center gap-1'>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center font-semibold text-[10px]
                            ${isActive ? 'bg-green-500 text-white' : 'bg-black border border-amber-500/50 text-amber-500'}`}>
                            {tier.bonusPercentage * 100}
                          </div>
                          <span className={`${isActive ? 'text-green-500' : ''} font-medium`}>
                            {tier.label.replace(' DYORHODLER Bonus', '')}
                          </span>
                          {isActive && <BadgeCheck className='h-3 w-3 text-green-500' />}
                        </div>
                        <span className='text-[9px] text-muted-foreground'>
                          {tier.minTokenHold.toLocaleString()} $DYORHUB
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className='rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden'>
        <div className='p-6 border-b border-border/60 bg-muted/30'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-full bg-black flex items-center justify-center border border-amber-500/50'>
              <Coins className='h-6 w-6 text-amber-500' />
            </div>
            <div>
              <h2 className='text-xl font-semibold mb-1'>
                {isBalanceLoading ? (
                  <Skeleton className='h-8 w-32' />
                ) : (
                  <span>
                    {balance !== null ? balance.toLocaleString() : '--'}{' '}
                    <span className='text-amber-500'>Credits</span>
                  </span>
                )}
              </h2>
              <p className='text-muted-foreground text-sm'>Available balance</p>
            </div>
          </div>
        </div>

        <div className='p-6'>
          {!connected ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <div className='w-12 h-12 rounded-full bg-black flex items-center justify-center border border-amber-500/50 mb-4'>
                <WalletCards className='h-6 w-6 text-amber-500' />
              </div>
              <p className='text-lg font-medium mb-2'>Connect Your Wallet</p>
              <p className='text-muted-foreground text-sm mb-6'>
                Connect your wallet to purchase credits
              </p>
              <WalletMultiButton />
            </div>
          ) : isPackagesLoading ? (
            <div className='space-y-4'>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className='h-24' />
              ))}
            </div>
          ) : packages.length > 0 ? (
            <div className='space-y-4'>
              {packages.map((pkg) => {
                let bonusCredits = 0;
                let totalCredits = pkg.credits;
                if (applicableBonus) {
                  bonusCredits = Math.floor(pkg.credits * applicableBonus.bonusPercentage);
                  totalCredits = pkg.credits + bonusCredits;
                }

                return (
                  <div
                    key={pkg.id}
                    className='flex items-center justify-between p-4 bg-card/50 border border-border/60 rounded-lg hover:border-amber-500/50 transition-all duration-200 group relative'>
                    <div className='space-y-1.5'>
                      <div className='flex items-center gap-2'>
                        <p className='font-medium'>{pkg.name}</p>
                        {applicableBonus && (
                          <div className='bg-green-500/10 text-green-500 text-[10px] font-medium px-2 py-0.5 rounded-md border border-green-500/20'>
                            +{applicableBonus.bonusPercentage * 100}%
                          </div>
                        )}
                      </div>

                      {bonusCredits > 0 ? (
                        <div className='flex items-center gap-2'>
                          <span className='text-[28px] font-bold text-amber-500'>
                            {pkg.credits}
                          </span>
                          <span className='text-sm text-muted-foreground'>Base</span>
                          <span className='text-sm font-medium'>+</span>
                          <span className='text-[28px] font-bold text-green-500'>
                            {bonusCredits}
                          </span>
                          <span className='text-sm text-muted-foreground'>Bonus</span>
                          <span className='text-sm font-medium'>=</span>
                          <span className='text-[28px] font-bold text-white'>{totalCredits}</span>
                          <span className='text-sm text-muted-foreground'>Total</span>
                        </div>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <span className='text-[28px] font-bold text-amber-500'>
                            {pkg.credits}
                          </span>
                          <span className='text-sm text-muted-foreground'>Base</span>
                        </div>
                      )}
                    </div>
                    <div className='text-right'>
                      <p className='text-sm text-muted-foreground mb-2'>{pkg.solPrice} SOL</p>
                      <Button
                        onClick={() => handlePurchase(pkg)}
                        disabled={selectedPackage !== null}
                        size='sm'
                        className='bg-black hover:bg-zinc-900 text-amber-500 border border-amber-700 hover:border-amber-500'>
                        {selectedPackage?.id === pkg.id ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            {purchaseStep === 'sending' ? 'Sending...' : 'Confirming...'}
                          </>
                        ) : (
                          <>
                            <Send className='mr-2 h-4 w-4' /> Purchase
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='text-center text-muted-foreground py-8'>
              No credit packages currently available.
            </div>
          )}
        </div>
      </div>

      {/* Transaction History Section */}
      <div className='rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden'>
        <div className='p-4 border-b border-border/60 bg-muted/30'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-black flex items-center justify-center border border-border/60'>
              <History className='h-4 w-4 text-muted-foreground' />
            </div>
            <h2 className='text-lg font-semibold'>Transaction History</h2>
          </div>
        </div>

        <div className='p-6'>
          {isHistoryLoading && history.length === 0 ? (
            <div className='space-y-4'>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className='h-16' />
              ))}
            </div>
          ) : history.length > 0 ? (
            <div className='space-y-4'>
              {history.map((tx) => (
                <div
                  key={tx.id}
                  className='flex justify-between items-center p-4 bg-card/50 border border-border/60 rounded-lg hover:border-border transition-all duration-200'>
                  <div className='flex items-start gap-3'>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === CreditTransactionType.PURCHASE
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                      {tx.type === CreditTransactionType.PURCHASE ? (
                        <Plus className='h-4 w-4' />
                      ) : (
                        <Minus className='h-4 w-4' />
                      )}
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <p className='font-medium'>
                          {tx.type === CreditTransactionType.PURCHASE
                            ? `Purchase: ${tx.details?.replace('Purchased ', '') || '--'}`
                            : `Usage: ${tx.details || '--'}`}
                        </p>
                        {tx.solanaTransactionId && (
                          <a
                            href={getSolscanUrl(tx.solanaTransactionId)}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center justify-center w-5 h-5 text-amber-500 hover:text-amber-400 transition-colors'
                            title='View on Solscan'>
                            <ExternalLink className='h-3.5 w-3.5' />
                          </a>
                        )}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p
                      className={`text-lg font-bold ${
                        tx.type === CreditTransactionType.PURCHASE
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                      {tx.type === CreditTransactionType.PURCHASE ? '+' : ''}
                      {tx.amount.toLocaleString()}
                    </p>
                    <p className='text-xs text-muted-foreground'>Credits</p>
                  </div>
                </div>
              ))}
              {historyMeta && historyMeta.totalPages > 1 && (
                <div className='mt-6'>
                  <Pagination
                    currentPage={historyMeta.page}
                    totalPages={historyMeta.totalPages}
                    onPageChange={loadHistory}
                    isLoading={isHistoryLoading}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className='text-center text-muted-foreground py-8'>
              No credit transaction history found.
            </div>
          )}
        </div>
      </div>

      {/* Purchase Status Dialog */}
      <Dialog
        open={purchaseStep !== 'input'}
        onOpenChange={() => {
          if (purchaseStep === 'success' || purchaseStep === 'error') {
            setPurchaseStep('input');
            setSelectedPackage(null);
            setError(null);
          }
        }}>
        <DialogContent className='sm:max-w-[425px] bg-black border-border'>
          {purchaseStep === 'sending' || purchaseStep === 'confirming' ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='relative w-16 h-16 mb-5'>
                <div className='absolute inset-0 bg-amber-500/20 rounded-full animate-ping'></div>
                <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-amber-500/50'>
                  <Loader2 className='h-8 w-8 text-amber-500 animate-spin' />
                </div>
              </div>
              <p className='font-medium text-lg'>
                {purchaseStep === 'sending' ? 'Sending SOL' : 'Confirming Transaction'}
              </p>
              <p className='text-muted-foreground text-sm mt-2 max-w-xs'>
                {purchaseStep === 'sending'
                  ? 'Please approve the transaction in your wallet'
                  : 'Waiting for network confirmation...'}
              </p>
            </div>
          ) : purchaseStep === 'success' ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <div className='relative w-16 h-16 mb-4'>
                <div className='absolute inset-0 bg-green-500/20 rounded-full'></div>
                <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-green-500/50'>
                  <CheckCircle className='h-8 w-8 text-green-500' />
                </div>
              </div>
              <p className='font-medium text-lg'>Purchase Successful!</p>
              <div className='mt-4 bg-card/50 border border-border/60 rounded-lg p-4 w-[90%] max-w-[280px]'>
                <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-muted-foreground text-sm'>Package:</span>
                  <span className='font-medium'>{selectedPackage?.name}</span>
                </div>
                <div className='flex items-center justify-between mb-1.5'>
                  <span className='text-muted-foreground text-sm'>Base Credits:</span>
                  <span className='font-medium'>{selectedPackage?.credits.toLocaleString()}</span>
                </div>
                {(() => {
                  let bonusCredits = 0;
                  if (selectedPackage && applicableBonus) {
                    bonusCredits = Math.floor(
                      selectedPackage.credits * applicableBonus.bonusPercentage,
                    );
                  }
                  if (bonusCredits > 0) {
                    return (
                      <div className='flex items-center justify-between mb-1.5'>
                        <span className='text-muted-foreground text-sm'>Bonus Credits:</span>
                        <span className='font-medium text-green-500'>
                          +{bonusCredits.toLocaleString()}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className='border-t border-border/40 my-2'></div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-sm'>Cost:</span>
                  <span className='font-medium'>{selectedPackage?.solPrice} SOL</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  setPurchaseStep('input');
                  setSelectedPackage(null);
                }}
                variant='outline'
                size='sm'
                className='mt-6 border-green-500/50 px-6'>
                Close
              </Button>
            </div>
          ) : purchaseStep === 'error' ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <div className='relative w-16 h-16 mb-4'>
                <div className='absolute inset-0 bg-destructive/20 rounded-full'></div>
                <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center border border-destructive/50'>
                  <AlertCircle className='h-8 w-8 text-destructive' />
                </div>
              </div>
              <p className='font-medium text-lg'>Purchase Failed</p>
              <div className='mt-4 bg-card/50 border border-destructive/30 rounded-lg p-4 max-w-[90%]'>
                <div className='flex items-start gap-2'>
                  <AlertCircle className='h-5 w-5 text-destructive flex-shrink-0 mt-0.5' />
                  <p className='text-sm text-destructive'>{error}</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setPurchaseStep('input');
                  setSelectedPackage(null);
                  setError(null);
                }}
                variant='outline'
                size='sm'
                className='mt-6 px-6'>
                Close
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
