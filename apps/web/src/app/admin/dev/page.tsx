'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ApiError, dev } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function DevAdminPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleBackfillClick = async () => {
    setIsLoading(true);
    try {
      const result = await dev.admin.backfillDefaultComments();
      toast({
        title: 'Backfill Started',
        description: result.message,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'An unknown error occurred';
      toast({
        title: 'Backfill Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Backfill error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold text-white'>Developer Actions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Token Call Comments Backfill</CardTitle>
          <CardDescription>
            Add default explanation comments (&apos;I just made a prediction on...&apos;) to Token
            Calls that were created before the comment feature was added and are currently missing
            one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBackfillClick} disabled={isLoading}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Run Backfill
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
