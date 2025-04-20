'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ApiError, dev } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function DevAdminPage() {
  const { toast } = useToast();
  const [isFixingTsLoading, setIsFixingTsLoading] = useState(false);

  const handleFixTimestampsClick = async () => {
    setIsFixingTsLoading(true);
    try {
      const result = await dev.admin.fixCommentTimestamps();
      toast({
        title: 'Timestamp Fix Finished',
        description: `${result.message} Updated: ${result.updated}, Failed: ${result.failed}`,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'An unknown error occurred';
      toast({
        title: 'Timestamp Fix Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Fix Timestamps error:', error);
    } finally {
      setIsFixingTsLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold text-white'>Developer Actions</h1>

      {/* Card 3: Fix Comment Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>Fix Backfilled Comment Timestamps</CardTitle>
          <CardDescription>
            Updates the `createdAt` timestamp for explanation comments that were created much later
            than their associated Token Call (e.g., during backfill). Sets the comment `createdAt`
            to the call&apos;s `createdAt`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleFixTimestampsClick} disabled={isFixingTsLoading}>
            {isFixingTsLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Fix Comment Timestamps
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
