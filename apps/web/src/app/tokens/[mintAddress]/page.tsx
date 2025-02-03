import { CommentSection } from '@/components/comments/CommentSection';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/api';
import { isValidSolanaAddress } from '@/lib/utils';
import { Globe, Twitter } from 'lucide-react';
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
    <div className='flex-1 flex flex-col'>
      <div className='flex-1 flex flex-col gap-8 p-4 sm:p-8 container mx-auto max-w-7xl'>
        <Card className='w-full'>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row items-start gap-4'>
              {token.imageUrl && (
                <div className='relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0'>
                  <Image src={token.imageUrl} alt={token.name} fill className='object-cover' />
                </div>
              )}
              <div className='flex-1'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <h1 className='text-xl sm:text-2xl font-bold'>{token.name}</h1>
                  <span className='text-sm text-muted-foreground'>${token.symbol}</span>
                </div>
                <p className='text-muted-foreground mt-1'>{token.description}</p>
                <div className='flex items-center gap-4 mt-4 flex-wrap'>
                  {token.websiteUrl && (
                    <Link
                      href={token.websiteUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center text-sm text-muted-foreground hover:text-foreground'
                      title='Website'>
                      <Globe className='w-4 h-4' />
                    </Link>
                  )}
                  {token.twitterHandle && (
                    <Link
                      href={`https://twitter.com/${token.twitterHandle}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center text-sm text-muted-foreground hover:text-foreground'
                      title={`@${token.twitterHandle}`}>
                      <Twitter className='w-4 h-4' />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className='flex flex-col gap-4'>
          <h2 className='text-xl font-semibold'>Comments</h2>
          <Separator />
          <CommentSection tokenMintAddress={token.mintAddress} />
        </div>
      </div>
    </div>
  );
}

export function TokenPageSkeleton() {
  return (
    <div className='flex-1 flex flex-col'>
      <div className='flex-1 flex flex-col gap-8 p-4 sm:p-8'>
        <Card className='w-full'>
          <div className='flex items-start gap-6 p-6'>
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
          </div>
        </Card>
      </div>
    </div>
  );
}
