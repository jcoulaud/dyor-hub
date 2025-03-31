import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CommentType } from '@/types/comment';
import { Check, LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

interface CopyLinkButtonProps {
  comment: CommentType;
  tokenMintAddress: string;
}

export function CopyLinkButton({ comment, tokenMintAddress }: CopyLinkButtonProps) {
  const baseUrl = process.env.NEXT_PUBLIC_URL;
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const shareUrl = `${baseUrl}/tokens/${tokenMintAddress}/comments/${comment.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast({
        title: 'Link copied',
        description: 'Comment link copied to clipboard',
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      className={cn('h-8 gap-1 px-2 cursor-pointer', comment.isRemoved && 'opacity-40')}
      onClick={handleCopy}
      disabled={comment.isRemoved}>
      {isCopied ? <Check className='h-4 w-4' /> : <LinkIcon className='h-4 w-4' />}
      <span className='hidden sm:inline text-xs'>{isCopied ? 'Copied!' : 'Copy link'}</span>
    </Button>
  );
}
