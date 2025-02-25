import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className='flex-1 flex flex-col'>
      <div className='flex-1 flex flex-col gap-8 p-4 sm:p-8 container mx-auto max-w-7xl'>
        <Card className='w-full'>
          <div className='flex items-start gap-6 p-6'>
            <Skeleton className='w-16 h-16 rounded-full' />
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

        <div className='flex flex-col gap-4'>
          <Skeleton className='w-32 h-6' />
          <Skeleton className='w-full h-px' />
          <div className='space-y-4'>
            <Skeleton className='w-full h-24' />
            <Skeleton className='w-full h-24' />
          </div>
        </div>
      </div>
    </div>
  );
}
