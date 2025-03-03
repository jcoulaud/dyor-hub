import { CommentSection } from '@/components/comments/CommentSection';
import { CopyButton } from '@/components/CopyButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/api';
import { isValidSolanaAddress } from '@/lib/utils';
import { Globe, MessageSquare, Twitter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ mintAddress: string }>;
}

// Function to truncate address for display
function truncateAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 16) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
      <div className='flex-1 p-4 sm:p-8 container mx-auto max-w-7xl'>
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
              <div className='flex-1 space-y-4'>
                <div>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <h1 className='text-2xl sm:text-3xl font-bold'>{token.name}</h1>
                    <span className='text-sm font-medium px-2 py-1 bg-zinc-900 rounded-md'>
                      ${token.symbol}
                    </span>
                  </div>
                  <p className='text-zinc-400 mt-2'>{token.description}</p>
                </div>

                <div className='flex flex-wrap items-center gap-4'>
                  <CopyButton
                    textToCopy={token.mintAddress}
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
                      <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
                      <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                    </svg>
                  </CopyButton>

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
