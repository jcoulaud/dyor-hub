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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@dyor-hub/types';
import { Award, UserCheck } from 'lucide-react';
import { useState } from 'react';

interface AwardBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: Badge | null;
  onAward: (badgeId: string, userIds: string[]) => Promise<void>;
}

export function AwardBadgeDialog({ open, onOpenChange, badge, onAward }: AwardBadgeDialogProps) {
  const [userIds, setUserIds] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!badge) return;

    // Validate user IDs
    const trimmedUserIds = userIds.trim();
    if (!trimmedUserIds) {
      setError('Please enter at least one user ID');
      return;
    }

    const userIdList = trimmedUserIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (userIdList.length === 0) {
      setError('Please enter valid user IDs');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAward(badge.id, userIdList);
      setUserIds('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error awarding badge:', err);
      setError('Failed to award badge. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100'>
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold flex items-center gap-2'>
            <Award className='h-5 w-5 text-zinc-400' />
            Award Badge to Users
          </DialogTitle>
          <DialogDescription className='text-zinc-400'>
            {badge
              ? `Award "${badge.name}" badge to one or more users.`
              : 'Award this badge to users.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='userIds'>User IDs</Label>
            <Input
              id='userIds'
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              className='bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-500 text-zinc-100'
              placeholder='user1, user2, user3'
              disabled={isSubmitting}
            />
            <p className='text-xs text-zinc-500'>
              Enter comma-separated user IDs to award this badge to
            </p>
            {error && <p className='text-xs text-red-500 mt-1'>{error}</p>}
          </div>

          <div className='rounded-md bg-zinc-900/50 border border-zinc-800 p-4 flex items-start gap-3'>
            <UserCheck className='h-5 w-5 text-zinc-400 mt-0.5' />
            <div className='space-y-1'>
              <h4 className='text-sm font-medium text-zinc-300'>Before awarding badges</h4>
              <p className='text-xs text-zinc-500'>
                Make sure you have verified that these users have met the requirements for the
                badge. This action cannot be easily undone and will affect user reputation.
              </p>
            </div>
          </div>

          <DialogFooter className='pt-4'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting}
              className='bg-blue-600 hover:bg-blue-700 text-white'>
              {isSubmitting ? 'Awarding...' : 'Award Badge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
