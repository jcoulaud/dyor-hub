'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ArrowRight, WalletIcon } from 'lucide-react';
import { useEffect } from 'react';

export function ConnectWalletCard() {
  const { wallets, select } = useWallet();
  const { setVisible } = useWalletModal();

  // Reset any selected wallet first
  useEffect(() => {
    if (wallets.length === 1) {
      select(wallets[0].adapter.name);
    }
  }, [wallets, select]);

  const openWalletModal = () => {
    setVisible(true);
  };

  return (
    <Card className='w-full border-dashed overflow-hidden'>
      <CardContent className='p-0'>
        <div className='flex flex-col md:flex-row items-center'>
          {/* Left side */}
          <div className='w-full md:w-1/3 bg-gradient-to-br from-primary/10 to-primary/20 p-8 flex items-center justify-center'>
            <div className='aspect-square w-20 h-20 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow-lg'>
              <WalletIcon className='h-10 w-10 text-primary' />
            </div>
          </div>

          {/* Right side */}
          <div className='w-full md:w-2/3 p-8 flex flex-col gap-6'>
            <div className='space-y-1.5'>
              <h3 className='text-xl font-semibold'>Connect Your Wallet</h3>
              <p className='text-sm text-muted-foreground'>
                Connect your Solana wallet to access personalized features (soon) and verify
                ownership of your wallet.
              </p>
            </div>

            <div className='flex flex-col space-y-4'>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <div className='size-2 rounded-full bg-primary/70'></div>
                  <span>Simple setup</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='size-2 rounded-full bg-primary/70'></div>
                  <span>Verify ownership</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='size-2 rounded-full bg-primary/70'></div>
                  <span>Secure</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='size-2 rounded-full bg-primary/70'></div>
                  <span>No transaction costs</span>
                </div>
              </div>
            </div>

            <Button
              size='lg'
              className='w-full sm:w-auto group cursor-pointer'
              onClick={openWalletModal}>
              Connect Wallet
              <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
