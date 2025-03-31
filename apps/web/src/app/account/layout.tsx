'use client';

import { Separator } from '@/components/ui/separator';
import { WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className='container mx-auto px-4 py-12 max-w-5xl'>
      <div className='grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8'>
        <aside className='space-y-6'>
          <div className='flex flex-col items-center md:items-start space-y-2'>
            <h1 className='text-2xl font-bold'>Account</h1>
            <p className='text-sm text-muted-foreground'>Manage your account</p>
          </div>

          <Separator className='my-4' />

          <nav className='space-y-1'>
            <Link
              href='/account'
              className={`flex items-center gap-2 p-2 rounded-md ${
                pathname === '/account'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent text-foreground'
              }`}>
              <WalletCards className='h-5 w-5' />
              <span>Wallet Connection</span>
            </Link>
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
