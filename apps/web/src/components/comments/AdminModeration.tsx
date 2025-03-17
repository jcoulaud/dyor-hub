import { useToast } from '@/hooks/use-toast';
import { comments } from '@/lib/api';
import { Comment } from '@dyor-hub/types';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { MouseEvent, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';

interface AdminModerationProps {
  comment: Comment;
  onCommentUpdated: () => Promise<void>;
}

export function AdminModeration({ comment, onCommentUpdated }: AdminModerationProps) {
  const { toast } = useToast();
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRemoveComment = async () => {
    try {
      setIsLoading(true);
      await comments.remove(comment.id);
      await onCommentUpdated();
      toast({
        title: 'Comment removed',
        description: 'The comment has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove comment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRemoveDialogOpen(false);
    }
  };

  if (comment.isRemoved) {
    return (
      <div className='inline-flex items-center text-xs text-muted-foreground ml-2'>
        <ShieldAlert className='h-3 w-3 mr-1' />
        Removed
      </div>
    );
  }

  return (
    <>
      <Button
        variant='ghost'
        size='sm'
        className='h-6 px-2 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-100/10 cursor-pointer'
        onClick={() => setIsRemoveDialogOpen(true)}>
        <AlertCircle className='h-3 w-3 mr-1' />
        Remove
      </Button>

      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove the comment from public view. The action will be logged and
              attributed to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} className='cursor-pointer'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                handleRemoveComment();
              }}
              disabled={isLoading}
              className='bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 cursor-pointer'>
              {isLoading ? 'Removing...' : 'Yes, remove comment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
