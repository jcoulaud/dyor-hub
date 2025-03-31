'use client';

import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='container mx-auto px-4 py-12 max-w-5xl'>
      <div className='grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8'>
        <aside className='space-y-6'>
          <div className='flex flex-col items-center md:items-start space-y-2'>
            <h1 className='text-2xl font-bold'>Settings</h1>
            <p className='text-sm text-muted-foreground'>Manage your preferences</p>
          </div>

          <Separator className='my-4' />

          <nav className='space-y-1'>
            <Link
              href='/settings'
              className={`flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary font-medium`}>
              <Settings className='h-5 w-5' />
              <span>Preferences</span>
            </Link>
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
