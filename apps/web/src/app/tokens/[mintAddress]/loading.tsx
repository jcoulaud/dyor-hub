import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className='flex-1 flex flex-col'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Token Header Card Loading */}
        <Card className='w-full mb-8 border-zinc-800 bg-zinc-950/70'>
          <CardContent className='p-6'>
            <div className='flex flex-col sm:flex-row items-start gap-6'>
              <Skeleton className='w-20 h-20 rounded-full' />
              <div className='flex-1 min-w-0 space-y-4'>
                <div>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <Skeleton className='w-48 h-8' />
                    <Skeleton className='w-16 h-6 rounded-md' />
                  </div>
                  <div className='mt-2 max-w-full overflow-hidden'>
                    <Skeleton className='w-full h-16' />
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-4'>
                  <Skeleton className='w-36 h-8 rounded-md' />
                  <div className='flex items-center gap-3'>
                    <Skeleton className='w-8 h-8 rounded-full' />
                    <Skeleton className='w-8 h-8 rounded-full' />
                    <Skeleton className='w-8 h-8 rounded-full' />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Two Column Layout Loading */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column - Token Data Loading */}
          <div className='lg:col-span-1 space-y-8'>
            <Card className='border-zinc-800 bg-zinc-950/70'>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <Skeleton className='w-full h-16' />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Community Discussion Loading */}
          <div className='lg:col-span-2 space-y-8'>
            <Card className='border-zinc-800 bg-zinc-950/70'>
              <CardHeader>
                <CardTitle>Community Discussion</CardTitle>
                <CardDescription>Share your thoughts and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <Skeleton className='w-full h-24' />
                  <Skeleton className='w-full h-24' />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
