'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { dev } from '@/lib/api';
import { useState } from 'react';

export default function DevAdminPage() {
  const { toast } = useToast();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const handleBackfillCreators = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const result = await dev.admin.backfillTokenCreators();
      const message = `${result.message} Processed: ${result.result.processed}, Updated: ${result.result.updated}, Failed: ${result.result.failed}`;
      setBackfillResult(message);
      toast({
        title: 'Backfill Started',
        description: message,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setBackfillResult(`Error: ${errorMessage}`);
      toast({
        title: 'Backfill Error',
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
        <h2 className='mb-3 text-lg font-semibold'>Token Creator Backfill</h2>
        <p className='mb-4 text-sm text-muted-foreground'>
          Fetch and store the creator address for all tokens currently missing it in the database.
          Uses the Birdeye API.
        </p>
        <Button
          onClick={handleBackfillCreators}
          disabled={isBackfilling}
          aria-label='Start backfilling token creator addresses'>
          {isBackfilling ? 'Backfilling...' : 'Backfill Token Creators'}
        </Button>
        {backfillResult && (
          <pre className='mt-4 overflow-x-auto rounded bg-muted p-3 text-sm'>{backfillResult}</pre>
        )}
      </div>
    </div>
  );
}
