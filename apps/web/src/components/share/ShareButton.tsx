'use client';

import { useToast } from '@/hooks/use-toast';
import { LinkIcon } from 'lucide-react';

export function ShareButton() {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link copied',
      description: 'Profile link copied to clipboard',
    });
  };

  return (
    <button
      onClick={handleCopy}
      className='p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors duration-200 cursor-pointer group'
      title='Copy profile link'>
      <LinkIcon className='h-4 w-4 text-zinc-400 group-hover:text-white' />
    </button>
  );
}
