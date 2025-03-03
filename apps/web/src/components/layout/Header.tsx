'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { UserMenu } from '../auth/UserMenu';

export function Header() {
  return (
    <header className='sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-md'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          <div>
            <Link href='/'>
              <div className='flex items-center space-x-2'>
                <div className='h-8 w-8 rounded-md bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center'>
                  <Search className='h-4 w-4 text-white' />
                </div>
                <span className='text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-500'>
                  DYOR Hub
                </span>
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
