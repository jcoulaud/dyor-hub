'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, WalletCards } from 'lucide-react';
import dynamic from 'next/dynamic';

// Client-only wallet content component
const WalletContent = dynamic(
  () => import('@/components/wallet/WalletContent').then((mod) => mod.WalletContent),
  { ssr: false },
);

export default function AccountPage() {
  return (
    <div className='space-y-8'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-bold'>Connected Wallets</h2>
        <Badge variant='outline' className='px-3'>
          <ShieldCheck className='h-3 w-3 mr-1' />
          <span className='text-xs'>Security</span>
        </Badge>
      </div>

      <Card className='transition-all hover:shadow-md'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Wallet Connection</CardTitle>
              <CardDescription>Connect and verify your Solana wallet</CardDescription>
            </div>
            <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
              <WalletCards className='h-5 w-5 text-primary' />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <WalletContent />
        </CardContent>
      </Card>
    </div>
  );
}
