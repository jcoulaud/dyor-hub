'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { truncateAddress } from '@/lib/utils';
import { DbWallet } from '@dyor-hub/types';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { BadgeCheck, BadgeX, ExternalLink, Star, WalletIcon } from 'lucide-react';

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
            Connect to your saved wallets to manage them and unlock exclusive platform features.
            Make sure to select the corresponding wallet in your browser extension.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {dbWallets.map((wallet) => (
            <div
              key={wallet.id}
              className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md bg-background/50 border border-border/50'>
              <div className='flex items-center gap-3'>
                <WalletIcon className='h-5 w-5 text-primary' />
                <span className='font-mono text-sm'>{truncateAddress(wallet.address)}</span>
                <a
                  href={`https://solscan.io/account/${wallet.address}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  title='View on Solscan'
                  className='text-primary hover:text-primary/80'>
                  <ExternalLink className='h-4 w-4' />
                </a>
              </div>
              <div className='flex items-center gap-2 mt-2 sm:mt-0'>
                {wallet.isPrimary && (
                  <Badge
                    variant='secondary'
                    className='bg-yellow-400/10 text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/20'>
                    <Star className='h-3 w-3 mr-1 fill-current' />
                    Primary
                  </Badge>
                )}
                {wallet.isVerified ? (
                  <Badge
                    variant='secondary'
                    className='bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'>
                    <BadgeCheck className='h-3 w-3 mr-1' />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant='secondary'
                    className='bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'>
                    <BadgeX className='h-3 w-3 mr-1' />
                    Not Verified
                  </Badge>
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
