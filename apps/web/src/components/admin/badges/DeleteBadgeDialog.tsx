'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@dyor-hub/types';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface DeleteBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: Badge | null;
  onConfirm: (badgeId: string) => Promise<void>;
}

export function DeleteBadgeDialog({
  open,
  onOpenChange,
  badge,
  onConfirm,
}: DeleteBadgeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!badge) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(badge.id);
      onOpenChange(false);
    } catch {
      setError('Failed to delete badge. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100'>
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold text-red-500 flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5' />
            Delete Badge
          </DialogTitle>
          <DialogDescription className='text-zinc-400'>
            This action cannot be undone. This will permanently delete the badge
            {badge ? ` "${badge.name}"` : ''} and remove it from all users who have earned it.
          </DialogDescription>
        </DialogHeader>

        <div className='bg-red-500/10 border border-red-500/20 rounded-md p-4 text-sm text-red-400'>
          <p>Deleting this badge will:</p>
          <ul className='list-disc ml-5 mt-2 space-y-1'>
            <li>Remove it from all users who have earned it</li>
            <li>Affect users&apos; total reputation scores</li>
            <li>Remove all historical data related to this badge</li>
          </ul>
        </div>

        {error && <p className='text-sm text-red-500 mt-2'>{error}</p>}

        <DialogFooter className='pt-4'>
          <Button
            type='button'
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'>
            Cancel
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={isDeleting}
            className='bg-red-600 hover:bg-red-700 text-white'>
            {isDeleting ? 'Deleting...' : 'Delete Badge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
