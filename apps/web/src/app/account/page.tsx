'use client';

import { Separator } from '@/components/ui/separator';
import { WalletCards } from 'lucide-react';
import dynamic from 'next/dynamic';

// Create a client-only wallet content component
const WalletContent = dynamic(
  () => import('@/components/wallet/WalletContent').then((mod) => mod.WalletContent),
  { ssr: false },
);

export default function AccountPage() {
  return (
    <section className='space-y-6 bg-card rounded-xl border shadow-sm p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-semibold'>Wallet Connection</h2>
          <p className='text-sm text-muted-foreground'>Connect and verify your Solana wallet</p>
        </div>
        <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
          <WalletCards className='h-5 w-5 text-primary' />
        </div>
      </div>

      <Separator />

      <WalletContent />
    </section>
  );
}
