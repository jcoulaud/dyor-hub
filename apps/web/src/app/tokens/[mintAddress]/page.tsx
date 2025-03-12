import { CommentSection } from '@/components/comments/CommentSection';
import { SolscanButton } from '@/components/SolscanButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/api';
import { isValidSolanaAddress, truncateAddress } from '@/lib/utils';
import { Globe, MessageSquare, Twitter } from 'lucide-react';
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
      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Token Header Card */}
        <Card className='w-full mb-8 border-zinc-800 bg-zinc-950/70'>
          <CardContent className='p-6'>
            <div className='flex flex-col sm:flex-row items-start gap-6'>
              {token.imageUrl && (
                <div className='relative w-20 h-20 rounded-full overflow-hidden shrink-0 border border-zinc-800'>
                  <Image
                    src={token.imageUrl}
                    alt={token.name}
                    fill
                    sizes='(max-width: 768px) 80px, 80px'
                    priority
                    className='object-cover'
                  />
                </div>
              )}
              <div className='flex-1 min-w-0 space-y-4'>
                <div>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <h1 className='text-2xl sm:text-3xl font-bold'>{token.name}</h1>
                    <span className='text-sm font-medium px-2 py-1 bg-zinc-900 rounded-md'>
                      ${token.symbol}
                    </span>
                  </div>
                  <div className='mt-2 max-w-full overflow-hidden'>
                    <p
                      className='text-zinc-400 text-sm sm:text-base break-all hyphens-auto overflow-wrap-anywhere'
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        msWordBreak: 'break-all',
                        wordWrap: 'break-word',
                      }}>
                      {token.description}
                    </p>
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-4'>
                  <SolscanButton
                    address={token.mintAddress}
                    type='token'
                    className='relative flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-md text-sm hover:bg-zinc-800 transition-colors cursor-pointer'>
                    <span className='font-mono'>{truncateAddress(token.mintAddress)}</span>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='text-zinc-400'>
                      <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
                      <polyline points='15 3 21 3 21 9' />
                      <line x1='10' y1='14' x2='21' y2='3' />
                    </svg>
                  </SolscanButton>

                  <div className='flex items-center gap-3'>
                    {token.websiteUrl && (
                      <Link
                        href={token.websiteUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center justify-center w-8 h-8 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors'
                        title='Website'>
                        <Globe className='w-4 h-4' />
                      </Link>
                    )}

                    {token.twitterHandle && (
                      <Link
                        href={`https://twitter.com/${token.twitterHandle}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center justify-center w-8 h-8 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors'
                        title='Twitter'>
                        <Twitter className='w-4 h-4' />
                      </Link>
                    )}

                    {token.telegramUrl && (
                      <Link
                        href={token.telegramUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center justify-center w-8 h-8 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors'
                        title='Telegram'>
                        <MessageSquare className='w-4 h-4' />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Two Column Layout */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column - Token Data */}
          <div className='lg:col-span-1 space-y-8'>
            <Card className='border-zinc-800 bg-zinc-950/70'>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {/* Add any additional token information here if needed */}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Community Discussion */}
          <div className='lg:col-span-2 space-y-8'>
            <Card className='border-zinc-800 bg-zinc-950/70'>
              <CardHeader>
                <CardTitle>Community Discussion</CardTitle>
                <CardDescription>Share your thoughts and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <CommentSection tokenMintAddress={token.mintAddress} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
