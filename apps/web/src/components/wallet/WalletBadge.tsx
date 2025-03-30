'use client';

import { Badge } from '@/components/ui/badge';
import { truncateAddress } from '@/lib/utils';
import { ShieldCheckIcon, WalletIcon } from 'lucide-react';
import { useState } from 'react';

interface WalletBadgeProps {
  address: string;
  isVerified?: boolean;
}

export function WalletBadge({ address, isVerified = false }: WalletBadgeProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy wallet address', err);
    }
  };

  return (
    <div className='flex items-center gap-2 group'>
      <Badge
        variant='outline'
        className={`inline-flex items-center gap-1.5 h-7 px-3 bg-zinc-800/70 backdrop-blur-sm border ${isVerified ? 'border-green-700/50' : 'border-zinc-700/50'} ${isVerified ? 'hover:border-green-700/70' : 'hover:border-zinc-600/80'} hover:bg-zinc-700/70 cursor-pointer transition-all duration-200`}
        onClick={copyToClipboard}>
        {isVerified ? (
          <ShieldCheckIcon className='h-3.5 w-3.5 text-green-400' />
        ) : (
          <WalletIcon className='h-3.5 w-3.5 text-zinc-400' />
        )}
        <span className='font-mono text-xs text-zinc-200'>
          {copied ? 'Copied!' : truncateAddress(address)}
        </span>
      </Badge>
    </div>
  );
}
