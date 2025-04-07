'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { Separator } from '@/components/ui/separator';
import { BellRing, Settings, UserCog } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className='container mx-auto px-4 py-12 max-w-5xl'>
        <div className='grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8'>
          <aside className='space-y-6'>
            <div className='flex flex-col space-y-2'>
              <div className='flex items-center space-x-2'>
                <UserCog className='h-5 w-5 text-primary' />
                <h1 className='text-2xl font-bold'>Settings</h1>
              </div>
              <p className='text-sm text-muted-foreground'>Manage your preferences and settings</p>
            </div>

            <Separator className='my-4' />

            <nav className='flex flex-col space-y-1'>
              <Link
                href='/settings'
                className={`flex items-center gap-2 p-3 rounded-md ${pathname === '/settings' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary/50'} transition-colors`}>
                <Settings className='h-4 w-4' />
                <span>Preferences</span>
              </Link>
              <Link
                href='/settings/notifications'
                className={`flex items-center gap-2 p-3 rounded-md ${pathname === '/settings/notifications' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary/50'} transition-colors`}>
                <BellRing className='h-4 w-4' />
                <span>Notifications</span>
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
