import { tokens } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CommentType } from '@/types/comment';
import { Twitter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';

interface TwitterShareButtonProps {
  comment: CommentType;
  tokenMintAddress: string;
}

export function TwitterShareButton({ comment, tokenMintAddress }: TwitterShareButtonProps) {
  const baseUrl = process.env.NEXT_PUBLIC_URL;
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const shareUrl = `${baseUrl}/tokens/${tokenMintAddress}?comment=${comment.id}`;

  useEffect(() => {
    const fetchTokenSymbol = async () => {
      try {
        const tokenData = await tokens.getByMintAddress(tokenMintAddress);
        if (tokenData.symbol) {
          setTokenSymbol(tokenData.symbol);
        }
      } catch (error) {
        console.error('Error fetching token data:', error);
      }
    };

    fetchTokenSymbol();
  }, [tokenMintAddress]);

  const buildTwitterShareUrl = () => {
    const text = tokenSymbol
      ? `Dropping my thoughts on $${tokenSymbol.trim()} 🔥 What do you think?`
      : `Dropping my thoughts on this token 💭 Check it out:`;

    let hashtags = '';

    if (tokenSymbol) {
      hashtags = `#DYORhub #${tokenSymbol.trim().replace(/\s+/g, '')}`;
    } else {
      hashtags = '#DYORhub';
    }

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}%0A${encodeURIComponent(hashtags)}`;
  };

  const twitterShareUrl = buildTwitterShareUrl();

  return (
    <Button
      variant='ghost'
      size='sm'
      className={cn('h-8 gap-1 px-2 cursor-pointer', comment.isRemoved && 'opacity-40')}
      onClick={(e) => {
        e.preventDefault();
        window.open(twitterShareUrl, '_blank', 'noopener,noreferrer,width=600,height=300');
      }}
      disabled={comment.isRemoved}>
      <Twitter className='h-4 w-4' />
      <span className='text-xs'>Share</span>
    </Button>
  );
}
