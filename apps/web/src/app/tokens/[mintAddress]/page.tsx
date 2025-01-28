import { CommentSection } from '@/components/comments/CommentSection';
import { RefreshTokenButton } from '@/components/RefreshTokenButton';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/api';
import { formatNumber, isValidSolanaAddress } from '@/lib/utils';
import { ExternalLink, Twitter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ mintAddress: string }>;
}

export default async function Page({ params }: PageProps) {
  const { mintAddress } = await params;

  if (!mintAddress || !isValidSolanaAddress(mintAddress)) {
    notFound();
  }

  const token = await tokens.getByMintAddress(mintAddress).catch(() => null);

  if (!token) {
    notFound();
  }

  return (
    <div className='container py-8 space-y-8'>
      <Card className='p-6'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-center gap-4'>
            {token.imageUrl && (
              <Image
                src={token.imageUrl}
                alt={token.name}
                width={64}
                height={64}
                className='rounded-full'
              />
            )}
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-2xl font-bold'>{token.name}</h1>
                <span className='text-sm text-muted-foreground'>{token.symbol}</span>
              </div>
              <p className='text-muted-foreground'>{token.description}</p>
              <div className='flex items-center gap-4 mt-4'>
                {token.websiteUrl && (
                  <Link
                    href={token.websiteUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
                    <ExternalLink className='w-4 h-4' />
                    Website
                  </Link>
                )}
                {token.twitterHandle && (
                  <Link
                    href={`https://twitter.com/${token.twitterHandle}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
                    <Twitter className='w-4 h-4' />@{token.twitterHandle}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className='flex items-start gap-4'>
            <RefreshTokenButton mintAddress={token.mintAddress} />
          </div>
        </div>
        <div className='mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
          <div className='text-right'>
            <div className='text-sm text-muted-foreground'>Views</div>
            <div className='text-2xl font-bold'>{formatNumber(token.viewsCount)}</div>
          </div>
        </div>
      </Card>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Comments</h2>
        <Separator />
        <CommentSection tokenMintAddress={token.mintAddress} />
      </div>
    </div>
  );
}

export function TokenPageSkeleton() {
  return (
    <div className='container py-8 space-y-8'>
      <Card className='p-6'>
        <div className='flex items-start gap-6'>
          <Skeleton className='w-32 h-32 rounded-lg' />
          <div className='flex-1'>
            <Skeleton className='w-48 h-8' />
            <Skeleton className='w-24 h-4 mt-1' />
            <Skeleton className='w-full h-16 mt-4' />
            <div className='flex items-center gap-4 mt-6'>
              <Skeleton className='w-24 h-6' />
              <Skeleton className='w-24 h-6' />
            </div>
          </div>
          <div className='text-right'>
            <Skeleton className='w-16 h-4 ml-auto' />
            <Skeleton className='w-24 h-8 mt-1' />
          </div>
        </div>
      </Card>
    </div>
  );
}
