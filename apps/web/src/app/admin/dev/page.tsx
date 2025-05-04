'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { dev } from '@/lib/api';
import { useState } from 'react';

export default function DevAdminPage() {
  const { toast } = useToast();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const handleBackfillSecurityInfo = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const result = await dev.admin.backfillTokenSecurityInfo();
      const message = `${result.message} Processed: ${result.result.processed}, Updated: ${result.result.updated}, Failed: ${result.result.failed}, No Data/Skipped: ${result.result.noData}`;
      setBackfillResult(message);
      toast({
        title: 'Security Backfill Started',
        description: message,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setBackfillResult(`Error: ${errorMessage}`);
      toast({
        title: 'Security Backfill Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className='container mx-auto p-4'>
      <h1 className='mb-4 text-2xl font-bold'>Dev Admin Tools</h1>

      <div className='rounded-lg border bg-card p-6 text-card-foreground shadow-sm'>
        <h2 className='mb-3 text-lg font-semibold'>Token Security Backfill</h2>
        <p className='mb-4 text-sm text-muted-foreground'>
          Fetch and store security information (creator address, creation tx, creation time) for all
          tokens using the Birdeye API.
        </p>
        <Button
          onClick={handleBackfillSecurityInfo}
          disabled={isBackfilling}
          aria-label='Start backfilling token security information'>
          {isBackfilling ? 'Backfilling...' : 'Backfill Security Info'}
        </Button>
        {backfillResult && (
          <pre className='mt-4 overflow-x-auto rounded bg-muted p-3 text-sm'>{backfillResult}</pre>
        )}
      </div>
    </div>
  );
}
