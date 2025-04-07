'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';
import { DbWallet } from '@dyor-hub/types';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { BadgeCheck, BadgeX, ExternalLink, Star, WalletIcon } from 'lucide-react';

interface SavedWalletListProps {
  dbWallets: DbWallet[];
}

export function SavedWalletList({ dbWallets }: SavedWalletListProps) {
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const openWalletModal = () => {
    setWalletModalVisible(true);
  };

  return (
    <div className='space-y-3'>
      {dbWallets &&
        dbWallets.map((wallet) => {
          return (
            <div
              key={wallet.id}
              className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md bg-background/50 border border-border/50'>
              {/* Wallet Info */}
              <div className='flex items-center gap-3 mb-2 sm:mb-0'>
                <WalletIcon className='h-5 w-5 text-primary flex-shrink-0' />
                <span className='font-mono text-sm break-all'>
                  {truncateAddress(wallet.address)}
                </span>
                <a
                  href={`https://solscan.io/account/${wallet.address}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  title='View on Solscan'
                  className='text-primary hover:text-primary/80 ml-1 flex-shrink-0'>
                  <ExternalLink className='h-4 w-4' />
                </a>
              </div>

              {/* Status Badges */}
              <div className='flex items-center gap-2 flex-wrap mt-2 sm:mt-0'>
                {wallet.isPrimary && (
                  <Badge
                    variant='secondary'
                    className='bg-yellow-400/10 text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/20 py-0.5 px-2 text-xs'>
                    <Star className='h-3 w-3 mr-1 fill-current' />
                    Primary
                  </Badge>
                )}
                {wallet.isVerified ? (
                  <Badge
                    variant='secondary'
                    className='bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 py-0.5 px-2 text-xs'>
                    <BadgeCheck className='h-3 w-3 mr-1' />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant='secondary'
                    className='bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20 py-0.5 px-2 text-xs'>
                    <BadgeX className='h-3 w-3 mr-1' />
                    Not Verified
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

      {/* Connect Wallet Button */}
      <Button variant='outline' className='w-full mt-4' onClick={openWalletModal}>
        Connect Wallet
      </Button>
    </div>
  );
}
