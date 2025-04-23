'use client';

import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { FollowNotificationSettings } from './FollowNotificationSettings';

interface FollowButtonProps {
  profileUserId: string;
  profileUserDisplayName?: string;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export function FollowButton({
  profileUserId,
  profileUserDisplayName,
  onFollowChange,
  className,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();

  useEffect(() => {
    let isMounted = true;

    const checkFollowStatus = async () => {
      if (!isAuthenticated || !user?.id || profileUserId === user.id) {
        setIsFollowing(false);
        return;
      }

      try {
        const result = await users.getFollowRelationship(user.id, profileUserId);
        if (isMounted) {
          setIsFollowing(!!result?.isFollowing);
        }
      } catch (error) {
        console.error('Failed to check follow status:', error);
      }
    };

    checkFollowStatus();

    return () => {
      isMounted = false;
    };
  }, [profileUserId, user, isAuthenticated]);

  const handleFollowAction = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to follow users.',
        variant: 'destructive',
      });
      return;
    }

    if (user?.id === profileUserId) {
      console.warn('Attempted to follow self');
      return;
    }

    const newState = !isFollowing;
    setIsFollowing(newState);

    startTransition(async () => {
      try {
        if (newState) {
          await users.follow(profileUserId);
        } else {
          await users.unfollow(profileUserId);
        }

        const description = newState
          ? `You are now following ${profileUserDisplayName || 'this user'}.`
          : `You have unfollowed ${profileUserDisplayName || 'this user'}.`;

        toast({
          title: newState ? 'Following' : 'Unfollowed',
          description: description,
        });

        onFollowChange?.(newState);
        router.refresh();
      } catch (error) {
        console.error('Follow action failed:', error);
        setIsFollowing(!newState);
        toast({
          title: 'Error',
          description: 'Failed to update follow status. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  if (!isAuthenticated || user?.id === profileUserId) {
    return null;
  }

  return (
    <div className='flex items-center gap-2'>
      {isFollowing && <FollowNotificationSettings followedId={profileUserId} />}

      <button
        type='button'
        onClick={handleFollowAction}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isPending}
        style={{ height: '30px' }}
        className={cn(
          'relative inline-flex items-center justify-center font-medium transition-colors duration-150 ease-in-out',
          'px-3 py-0 rounded-full text-[13px] leading-none',
          'box-border cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isFollowing
            ? isHovered
              ? 'bg-red-600/15 border border-red-600/40 text-white hover:bg-red-600/25'
              : 'bg-zinc-800/70 border border-zinc-700/80 text-zinc-300 hover:border-zinc-600'
            : 'bg-zinc-200 border border-zinc-200 text-zinc-900 hover:bg-zinc-300',
          className,
        )}>
        {isPending ? (
          <>
            <Loader2 className='w-3.5 h-3.5 mr-1.5 animate-spin' />
          </>
        ) : isFollowing ? (
          <>
            {isHovered ? (
              <X className='w-3.5 h-3.5 mr-1.5' />
            ) : (
              <Check className='w-3.5 h-3.5 mr-1.5' />
            )}
            <span>{isHovered ? 'Unfollow' : 'Following'}</span>
          </>
        ) : (
          <>
            <Plus className='w-3.5 h-3.5 mr-1.5' />
            <span>Follow</span>
          </>
        )}
      </button>
    </div>
  );
}
