'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ApiError, dev } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function DevAdminPage() {
  const { toast } = useToast();
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  const handleCreateBackfillClick = async () => {
    setIsCreatingLoading(true);
    try {
      const result = await dev.admin.backfillDefaultComments();
      toast({
        title: 'Creation Backfill Started',
        description: result.message,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'An unknown error occurred';
      toast({
        title: 'Creation Backfill Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Create Backfill error:', error);
    } finally {
      setIsCreatingLoading(false);
    }
  };

  const handleLinkExistingClick = async () => {
    setIsLinkingLoading(true);
    try {
      const result = await dev.admin.linkExistingExplanationComments();
      toast({
        title: 'Linking Process Finished',
        description: `${result.message} Updated: ${result.updated}, Failed/Skipped: ${result.failed + result.skippedAlreadyLinked + result.skippedNotFound}`,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'An unknown error occurred';
      toast({
        title: 'Linking Process Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Link Existing error:', error);
    } finally {
      setIsLinkingLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold text-white'>Developer Actions</h1>

      {/* Card 1: Create Missing Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Backfill Default Comments (Create)</CardTitle>
          <CardDescription>
            Finds Token Calls missing the `explanation_comment_id` and **creates** a new default
            explanation comment for them. Run this AFTER linking existing comments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateBackfillClick} disabled={isCreatingLoading}>
            {isCreatingLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Create Missing Default Comments
          </Button>
        </CardContent>
      </Card>

      {/* Card 2: Link Existing Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Link Existing Explanation Comments (Update FK)</CardTitle>
          <CardDescription>
            Finds existing explanation comments and updates the corresponding `token_calls` record
            to set the `explanation_comment_id` foreign key. Run this first after adding the FK
            column.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLinkExistingClick} disabled={isLinkingLoading}>
            {isLinkingLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Link Existing Comment FKs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
