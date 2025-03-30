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
    <div className='container mx-auto px-4 py-12 max-w-5xl'>
      <div className='grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8'>
        {/* Sidebar */}
        <aside className='space-y-6'>
          <div className='flex flex-col items-center md:items-start space-y-2'>
            <h1 className='text-2xl font-bold'>Account</h1>
            <p className='text-sm text-muted-foreground'>Manage your account</p>
          </div>

          <Separator className='my-4' />

          <nav className='space-y-1'>
            <a
              href='#wallet'
              className='flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary font-medium'>
              <WalletCards className='h-5 w-5' />
              <span>Wallet Connection</span>
            </a>
          </nav>
        </aside>

        {/* Main content */}
        <main>
          <section id='wallet' className='space-y-6 bg-card rounded-xl border shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-semibold'>Wallet Connection</h2>
                <p className='text-sm text-muted-foreground'>
                  Connect and verify your Solana wallet
                </p>
              </div>
              <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
                <WalletCards className='h-5 w-5 text-primary' />
              </div>
            </div>

            <Separator />

            <WalletContent />
          </section>
        </main>
      </div>
    </div>
  );
}
