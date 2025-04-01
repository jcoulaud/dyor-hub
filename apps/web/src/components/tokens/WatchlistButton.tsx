import { useToast } from '@/hooks/use-toast';
import { watchlist } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import { Bookmark } from 'lucide-react';
import { useState } from 'react';

interface WatchlistButtonProps {
  mintAddress: string;
  initialWatchlistStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onStatusChange?: (isWatchlisted: boolean) => void;
}

export function WatchlistButton({
  mintAddress,
  initialWatchlistStatus = false,
  size = 'md',
  onStatusChange,
}: WatchlistButtonProps) {
  const { isAuthenticated } = useAuthContext();
  const { toast } = useToast();
  const [isWatchlisted, setIsWatchlisted] = useState(initialWatchlistStatus);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      if (isWatchlisted) {
        await watchlist.removeTokenFromWatchlist(mintAddress);
        setIsWatchlisted(false);
        toast({
          title: 'Token Removed',
          description: 'Token removed from your watchlist',
        });
        onStatusChange?.(false);
      } else {
        await watchlist.addTokenToWatchlist(mintAddress);
        setIsWatchlisted(true);
        toast({
          title: 'Token Added',
          description: 'Token added to your watchlist',
        });
        onStatusChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling watchlist status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update watchlist',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
}
