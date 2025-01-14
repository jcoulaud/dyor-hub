'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Validate Solana address format
function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setError('Please enter a token address');
      return;
    }

    if (!isValidSolanaAddress(trimmedAddress)) {
      setError('Please enter a valid Solana address');
      return;
    }

    router.push(`/tokens/${trimmedAddress}`);
  };

  return (
    <main className='flex min-h-screen flex-col items-center justify-center space-y-8 px-4'>
      <div className='flex max-w-[980px] flex-col items-center gap-2 text-center'>
        <h1 className='text-5xl font-semibold leading-tight tracking-tight text-white'>DYOR Hub</h1>
        <p className='text-xl font-light text-zinc-300'>
          Research and analyze Solana tokens with comprehensive data and security insights
        </p>
      </div>

      <Card className='w-full max-w-[640px] border-zinc-800 bg-zinc-950/50 shadow-md'>
        <CardContent className='pt-6'>
          <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
            <div className='flex flex-col gap-2'>
              <div className='relative flex h-12 items-center gap-2'>
                <Input
                  type='text'
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError('');
                  }}
                  placeholder='Enter the contract address'
                  className='h-12 border-zinc-800 bg-black text-base placeholder:text-zinc-500'
                />
                <Button
                  type='submit'
                  className='h-12 bg-white px-8 text-base font-medium text-black hover:bg-zinc-200'>
                  Search
                </Button>
              </div>
              {error && (
                <p className='text-sm font-medium text-red-500' role='alert'>
                  {error}
                </p>
              )}
              <div className='mt-2 rounded-lg bg-zinc-900 px-4 py-3 border-0'>
                <div className='flex items-center gap-2.5 text-zinc-500'>
                  <MessageSquare className='h-4 w-4 flex-shrink-0' />
                  <p className='text-sm font-light leading-tight'>
                    Each token page includes a comment section for community insights
                  </p>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
