'use client';

import Link from 'next/link';
import { UserMenu } from '../auth/UserMenu';

export function Header() {
  return (
    <header className='sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          <div>
            <Link href='/'>
              <div className='flex items-center'>
                <span className='text-2xl font-bold text-white'>DYOR hub</span>
              </div>
            </Link>
          </div>
          <div className='flex items-center space-x-4'>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
