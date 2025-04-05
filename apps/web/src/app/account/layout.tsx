'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { Separator } from '@/components/ui/separator';
import { User, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className='container mx-auto px-4 py-12 max-w-5xl'>
        <div className='grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8'>
          <aside className='space-y-6'>
            <div className='flex flex-col space-y-2'>
              <div className='flex items-center space-x-2'>
                <User className='h-5 w-5 text-primary' />
                <h1 className='text-2xl font-bold'>Account</h1>
              </div>
              <p className='text-sm text-muted-foreground'>Manage your account and wallets</p>
            </div>

            <Separator className='my-4' />

            <nav className='flex flex-col space-y-1'>
              <Link
                href='/account'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <WalletCards className='h-4 w-4' />
                <span>Wallet Connection</span>
              </Link>
            </nav>
          </aside>

          <main className='bg-card/50 rounded-lg p-6 border border-white/10 shadow-sm'>
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
