import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className='container mx-auto space-y-6 p-4 py-8'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col space-y-2'>
          <Skeleton className='h-9 w-48' />
          <Skeleton className='h-5 w-96' />
        </div>
        <Skeleton className='h-9 w-32' />
      </div>

      <Card className='p-6'>
        <Skeleton className='h-[400px] w-full' />
      </Card>
    </main>
  );
}
