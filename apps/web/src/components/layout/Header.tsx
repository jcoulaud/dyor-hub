'use client';

import Link from 'next/link';
import { UserMenu } from '../auth/UserMenu';

export function Header() {
  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='mx-auto max-w-7xl'>
        <div className='flex h-14 items-center px-4 sm:px-8'>
          <div className='mr-4'>
            <Link href='/'>
              <span className='flex items-center space-x-2'>
                <span className='font-bold sm:inline-block'>DYOR Hub</span>
              </span>
            </Link>
          </div>
          <div className='flex flex-1 items-center justify-end'>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
