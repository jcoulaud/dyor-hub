'use client';

import { Button } from '@/components/ui/button';
import { Twitter } from 'lucide-react';

interface TwitterShareButtonProps {
  displayName: string;
}

export function TwitterShareButton({ displayName }: TwitterShareButtonProps) {
  const shareUrl = window.location.href;
  const text = `Check out ${displayName}'s degen profile on DYOR hub`;
  const hashtags = '#DYORhub';
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}%0A${encodeURIComponent(hashtags)}`;

  return (
    <Button
      variant='ghost'
      size='sm'
      className='h-8 gap-1 px-2 cursor-pointer group'
      onClick={(e) => {
        e.preventDefault();
        window.open(twitterShareUrl, '_blank', 'noopener,noreferrer,width=800,height=600');
      }}>
      <Twitter className='h-4 w-4 text-zinc-400 group-hover:text-white' />
      <span className='text-xs text-zinc-400 group-hover:text-white'>Share</span>
    </Button>
  );
}
