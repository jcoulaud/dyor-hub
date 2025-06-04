'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { Separator } from '@/components/ui/separator';
import { BadgeCheck, Coins, Flame, Gift, Shield, User, Users, WalletCards } from 'lucide-react';
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
                href='/account/profile'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/profile'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <User className='h-4 w-4' />
                <span>Profile</span>
              </Link>

              <Link
                href='/account/wallet'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/wallet' || pathname === '/account'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <WalletCards className='h-4 w-4' />
                <span>Wallet Connection</span>
              </Link>

              <Link
                href='/account/auth'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/auth'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <Shield className='h-4 w-4' />
                <span>Authentication</span>
              </Link>

              <Link
                href='/account/badges'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/badges'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <BadgeCheck className='h-4 w-4' />
                <span>Badges</span>
              </Link>

              <Link
                href='/account/streak'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/streak'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <Flame className='h-4 w-4' />
                <span>Streak</span>
              </Link>

              <Link
                href='/account/tips'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/tips'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <Gift className='h-4 w-4' />
                <span>Tips</span>
              </Link>

              <Link
                href='/account/referrals'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/referrals'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <Users className='h-4 w-4' />
                <span>Referrals</span>
              </Link>

              <Link
                href='/account/credits'
                className={`flex items-center gap-2 p-3 rounded-md ${
                  pathname === '/account/credits'
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 transition-colors'
                    : 'hover:bg-accent text-foreground hover:text-foreground/80 transition-colors'
                }`}>
                <Coins className='h-4 w-4' />
                <span>Credits</span>
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
