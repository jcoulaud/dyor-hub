import { useToast } from '@/hooks/use-toast';
import { watchlist } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';
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

interface WatchlistButtonProps {
  mintAddress: string;
  initialWatchlistStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onStatusChange?: (isWatchlisted: boolean) => void;
  tokenSymbol?: string;
}

export function WatchlistButton({
  mintAddress,
  initialWatchlistStatus = false,
  size = 'md',
  onStatusChange,
  tokenSymbol,
}: WatchlistButtonProps) {
  const { isAuthenticated } = useAuthContext();
  const { toast } = useToast();
  const [isWatchlisted, setIsWatchlisted] = useState(initialWatchlistStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  useEffect(() => {
    setIsWatchlisted(initialWatchlistStatus);
  }, [initialWatchlistStatus]);

  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  const iconSize = sizes[size];

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'You need to sign in to add tokens to your watchlist',
        variant: 'destructive',
      });
      return;
    }

    if (isWatchlisted) {
      setIsConfirmDialogOpen(true);
      return;
    }

    setIsLoading(true);

    try {
      await watchlist.addTokenToWatchlist(mintAddress);
      setIsWatchlisted(true);
      toast({
        title: 'Token Added',
        description: 'Token added to your watchlist',
      });
      onStatusChange?.(true);
    } catch (error) {
      console.error('Error adding token to watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update watchlist',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromWatchlist = async () => {
    setIsLoading(true);

    try {
      await watchlist.removeTokenFromWatchlist(mintAddress);
      setIsWatchlisted(false);
      toast({
        title: 'Token Removed',
        description: 'Token removed from your watchlist',
      });
      onStatusChange?.(false);
    } catch (error) {
      console.error('Error removing token from watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update watchlist',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsConfirmDialogOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggleWatchlist}
        disabled={isLoading}
        className={`flex items-center justify-center rounded-lg p-1.5 
          transition-all duration-200 hover:bg-zinc-800/60
          ${isWatchlisted ? 'text-blue-400 hover:text-blue-300' : 'text-zinc-400 hover:text-zinc-200'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}>
        <Bookmark className={`${iconSize} ${isWatchlisted ? 'fill-current' : ''}`} />
      </button>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-500'>Remove from watchlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {tokenSymbol ? `$${tokenSymbol}` : 'this token'} from
              your watchlist? You can add it back later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} className='cursor-pointer'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromWatchlist}
              disabled={isLoading}
              className='bg-red-500/90 hover:bg-red-600 focus:ring-red-400 cursor-pointer text-white'>
              {isLoading ? 'Removing...' : `Yes, remove${tokenSymbol ? ` $${tokenSymbol}` : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
