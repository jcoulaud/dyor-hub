import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Search, Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className='flex-1 flex flex-col'>
      {/* Page Background */}
      <div className='fixed inset-0 bg-gradient-to-br from-blue-950/30 to-purple-950/30 z-0' />
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 z-0" />

      {/* Animated gradient orbs */}
      <div className='fixed top-20 left-1/4 w-72 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse z-0' />
      <div
        className='fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse z-0'
        style={{ animationDelay: '1s' }}
      />

      <div className='container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Token Header Card */}
        <div className='relative group mb-6'>
          <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300'></div>
          <Card className='relative w-full border-0 bg-black/60 backdrop-blur-md shadow-xl rounded-xl overflow-hidden'>
            <CardContent className='p-4'>
              <div className='flex items-start gap-4'>
                <Skeleton className='w-16 h-16 rounded-full' />
                <div className='flex-1 min-w-0'>
                  <div className='flex flex-col gap-2'>
                    <div className='flex justify-between items-center flex-wrap'>
                      <Skeleton className='w-48 h-8' />
                      <div className='hidden sm:flex items-center gap-2 flex-shrink-0'>
                        <Skeleton className='relative flex items-center gap-1 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 h-8 px-6 rounded-lg w-32' />
                        <Skeleton className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg' />
                        <Skeleton className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg' />
                        <Skeleton className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg' />
                        <Skeleton className='flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg' />
                      </div>
                    </div>
                    <Skeleton className='w-full h-16' />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main three-column layout */}
        <div className='grid grid-cols-1 xxs:grid-cols-6 xs:grid-cols-6 sm:grid-cols-6 xl:grid-cols-12 gap-4 sm:gap-6 xl:gap-8'>
          {/* Left column - Token data */}
          <div className='col-span-1 xxs:col-span-2 xs:col-span-2 sm:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6 xl:space-y-8 order-1 xxs:order-none xs:order-none sm:order-none'>
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-2 relative'>
                  <div className='flex items-center mb-4'>
                    <div className='h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4 group-hover:bg-blue-500/20 transition-colors duration-300'>
                      <Sparkles className='h-5 w-5 text-blue-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>
                      Token Information
                    </CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-blue-500/20 to-transparent'></div>
                </CardHeader>
                <CardContent className='relative pt-0'>
                  <div className='space-y-6'>
                    <div className='space-y-3'>
                      <Skeleton className='h-5 w-24' />
                      <div className='space-y-2'>
                        <Skeleton className='h-6 w-full' />
                        <Skeleton className='h-6 w-full' />
                        <Skeleton className='h-6 w-full' />
                      </div>
                    </div>

                    {/* Price chart skeleton */}
                    <div className='w-full h-[120px] bg-zinc-900 rounded-xl'>
                      <div className='h-full w-full flex items-center justify-center'>
                        <div className='w-full h-[80px] bg-zinc-800/50 animate-pulse rounded-lg'></div>
                      </div>
                    </div>

                    {/* Supply info skeleton */}
                    <div className='space-y-3'>
                      <Skeleton className='h-5 w-36' />
                      <div className='space-y-2'>
                        <Skeleton className='h-6 w-full' />
                        <Skeleton className='h-6 w-full' />
                      </div>
                    </div>

                    {/* Top holders skeleton */}
                    <div className='space-y-3'>
                      <Skeleton className='h-5 w-28' />
                      <div className='space-y-2'>
                        <Skeleton className='h-4 w-full' />
                        <Skeleton className='h-4 w-full' />
                        <Skeleton className='h-4 w-full' />
                        <Skeleton className='h-4 w-full' />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Middle column - Comments */}
          <div className='col-span-1 xxs:col-span-4 xs:col-span-4 sm:col-span-4 xl:col-span-6 space-y-4 sm:space-y-6 xl:space-y-8 order-3 xxs:order-none xs:order-none sm:order-none'>
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-600/5 to-purple-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-2 relative'>
                  <div className='flex items-center'>
                    <div className='h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mr-4 group-hover:bg-purple-500/20 transition-colors duration-300'>
                      <MessageSquare className='h-5 w-5 text-purple-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>
                      Community Discussion
                    </CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-purple-500/20 to-transparent mt-3'></div>
                </CardHeader>
                <CardContent className='relative pt-0'>
                  <div className='space-y-4'>
                    <Skeleton className='w-full h-10 rounded-lg' />
                    <Skeleton className='w-full h-10 rounded-lg' />
                    <Skeleton className='w-full h-48 rounded-lg' />
                    <Skeleton className='w-full h-24 rounded-lg' />
                    <Skeleton className='w-full h-24 rounded-lg' />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column - Desktop search */}
          <div className='hidden xl:block col-span-1 xxs:col-span-2 xs:col-span-2 sm:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6 xl:space-y-8 order-2 xxs:order-none xs:order-none sm:order-none'>
            <div className='relative group'>
              <div className='absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300'></div>
              <Card className='relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-green-600/5 to-green-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                <CardHeader className='pb-2 relative'>
                  <div className='flex items-center'>
                    <div className='h-10 rounded-xl bg-green-500/10 flex items-center justify-center mr-4 group-hover:bg-green-500/20 transition-colors duration-300'>
                      <Search className='h-5 w-5 text-green-400' />
                    </div>
                    <CardTitle className='text-xl font-semibold text-white'>Search Token</CardTitle>
                  </div>
                  <div className='w-full h-0.5 bg-gradient-to-r from-green-500/20 to-transparent mt-3'></div>
                </CardHeader>
                <CardContent className='relative pt-0'>
                  <div className='space-y-4'>
                    <Skeleton className='w-full h-10 rounded-lg' />
                    <Skeleton className='w-full h-10 rounded-lg' />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
