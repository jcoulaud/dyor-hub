'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { truncateAddress } from '@/lib/utils';
import { DbWallet } from '@dyor-hub/types';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { BadgeCheck, BadgeX, Star, WalletIcon } from 'lucide-react';

interface SavedWalletListProps {
  dbWallets: DbWallet[];
}

export function SavedWalletList({ dbWallets }: SavedWalletListProps) {
  const { setVisible } = useWalletModal();

  const openWalletModal = () => {
    setVisible(true);
  };

  return (
    <div className='space-y-4'>
      <Card className='border border-dashed border-border bg-card'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg'>Your Saved Wallets</CardTitle>
          <CardDescription>
            You have wallets saved to your account. Connect one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {dbWallets.map((wallet) => (
            <div
              key={wallet.id}
              className='flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50'>
              <div className='flex items-center gap-3'>
                <WalletIcon className='h-5 w-5 text-primary' />
                <span className='font-mono text-sm'>{truncateAddress(wallet.address)}</span>
              </div>
              <div className='flex items-center gap-2'>
                {wallet.isPrimary && (
                  <span
                    title='Primary Wallet'
                    className='flex items-center text-xs text-yellow-400'>
                    <Star className='h-3 w-3 mr-1 fill-current' /> Primary
                  </span>
                )}
                {wallet.isVerified ? (
                  <span title='Verified' className='flex items-center text-xs text-green-500'>
                    <BadgeCheck className='h-3 w-3 mr-1' /> Verified
                  </span>
                ) : (
                  <span title='Not Verified' className='flex items-center text-xs text-orange-500'>
                    <BadgeX className='h-3 w-3 mr-1' /> Not Verified
                  </span>
                )}
              </div>
            </div>
          ))}
          <Button onClick={openWalletModal} className='w-full mt-4'>
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
