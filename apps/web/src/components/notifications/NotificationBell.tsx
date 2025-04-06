'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { comments, notifications } from '@/lib/api';
import { NotificationType } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { Bell, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Notification = {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  createdAt: string;
  updatedAt: string;
};

export function NotificationBell() {
  const [isLoading, setIsLoading] = useState(true);
  const [notificationData, setNotificationData] = useState<{
    notifications: Notification[];
    unreadCount: number;
  }>({ notifications: [], unreadCount: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const [tokenInfoMap, setTokenInfoMap] = useState<Record<string, string>>({});
  const [processingNotifications, setProcessingNotifications] = useState<Set<string>>(new Set());
  const isProcessing = (id: string) => processingNotifications.has(id);

  const startProcessing = (id: string) => {
    setProcessingNotifications((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  const stopProcessing = (id: string) => {
    setProcessingNotifications((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notifications.getNotifications();
      setNotificationData((prev) => ({
        ...prev,
        unreadCount: data.unreadCount,
      }));

      return data.unreadCount;
    } catch {
      return 0;
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notifications.getNotifications();

      setNotificationData({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notifications',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Function to fetch token info for a comment/vote
  const fetchTokenInfoForEntity = useCallback(async (entityId: string, entityType: string) => {
    if (!entityId || !entityType) {
      return null;
    }

    try {
      const data = await comments.getTokenInfo(entityId, entityType as 'comment' | 'vote');
      if (data.mintAddress) {
        setTokenInfoMap((prev) => ({
          ...prev,
          [entityId]: data.mintAddress,
        }));
        return data.mintAddress;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    fetchUnreadCount();

    // If dropdown is closed, only fetch count
    // If open, fetch full notifications
    const interval = setInterval(() => {
      if (!isOpen) {
        fetchUnreadCount();
      } else {
        fetchNotifications();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchNotifications, isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notifications.markAsRead(id);

      setNotificationData((prev) => {
        const updatedNotifications = prev.notifications.filter(
          (notification) => notification.id !== id,
        );

        return {
          notifications: updatedNotifications,
          unreadCount: prev.unreadCount > 0 ? prev.unreadCount - 1 : 0,
        };
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notification as read',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notifications.markAllAsRead();

      setNotificationData({
        notifications: [],
        unreadCount: 0,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark all notifications as read',
      });
    }
  };

  const getNotificationLink = (notification: Notification): string => {
    switch (notification.type) {
      case NotificationType.COMMENT_REPLY:
      case NotificationType.UPVOTE_RECEIVED:
        if (!notification.relatedEntityId) return '/';
        const entityId = notification.relatedEntityId;
        const mintAddress = tokenInfoMap[entityId];
        if (mintAddress) {
          return `/tokens/${mintAddress}/comments/${entityId}`;
        }
        return '/';

      case NotificationType.BADGE_EARNED:
        return '/account/badges';

      case NotificationType.STREAK_ACHIEVED:
      case NotificationType.STREAK_AT_RISK:
      case NotificationType.STREAK_BROKEN:
        return '/account/streak';

      case NotificationType.LEADERBOARD_CHANGE:
        return '/leaderboard';

      case NotificationType.REPUTATION_MILESTONE:
        return '/account';

      case NotificationType.SYSTEM:
        return '#';

      default:
        return '/';
    }
  };

  const getTimeAgo = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-9 w-9 text-zinc-400 hover:text-white'>
          <Bell className='h-5 w-5' />
          {notificationData.unreadCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 flex items-center justify-center min-h-[18px] min-w-[18px] text-[10px] px-[5px] py-0 rounded-full bg-red-600 hover:bg-red-600 border-0 font-semibold shadow-md shadow-red-900/20 animate-pulse'>
              {notificationData.unreadCount > 99 ? '99+' : notificationData.unreadCount}
            </Badge>
          )}
          <span className='sr-only'>Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-[96vw] max-w-[350px] sm:w-80 p-0 overflow-hidden border border-white/10 bg-black shadow-xl rounded-xl mt-2'>
        <div className='bg-gradient-to-r from-blue-950/50 to-purple-950/50 p-2 sm:p-3 border-b border-white/10 flex items-center justify-between'>
          <h3 className='font-medium text-white text-sm sm:text-base'>
            Notifications
            {notificationData.unreadCount > 0 && (
              <span className='ml-2 text-xs text-zinc-400'>({notificationData.unreadCount})</span>
            )}
          </h3>
          {notificationData.unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 sm:h-8 px-1.5 sm:px-2 text-xs text-zinc-400 hover:text-white'
              onClick={handleMarkAllAsRead}>
              <Check className='h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1' />
              <span className='whitespace-nowrap'>Mark all as read</span>
            </Button>
          )}
        </div>

        <div className='max-h-[50vh] sm:max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 pr-1'>
          {isLoading ? (
            <div className='p-4 space-y-3'>
              {[1, 2, 3].map((i) => (
                <div key={i} className='flex items-start gap-3 pb-3 border-b border-zinc-800/50'>
                  <Skeleton className='h-8 w-8 rounded-full flex-shrink-0' />
                  <div className='space-y-1 flex-1'>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-3 w-20' />
                  </div>
                </div>
              ))}
            </div>
          ) : notificationData.notifications.length === 0 ? (
            <div className='p-6 text-center'>
              <Bell className='h-10 w-10 mx-auto mb-3 text-zinc-600' />
              <p className='text-zinc-500 text-sm'>No notifications</p>
            </div>
          ) : (
            <AnimatePresence>
              {notificationData.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className='group relative border-b border-zinc-800/30 last:border-b-0 hover:bg-zinc-900/50 transition-colors cursor-pointer'
                  onClick={async () => {
                    if (isProcessing(notification.id)) return; // Prevent multiple clicks

                    try {
                      startProcessing(notification.id);

                      const [mintAddress] = await Promise.all([
                        (notification.type === NotificationType.COMMENT_REPLY ||
                          notification.type === NotificationType.UPVOTE_RECEIVED) &&
                        notification.relatedEntityId
                          ? fetchTokenInfoForEntity(
                              notification.relatedEntityId,
                              notification.type === NotificationType.COMMENT_REPLY
                                ? 'comment'
                                : 'vote',
                            )
                          : Promise.resolve(null),
                        notifications.markAsRead(notification.id),
                      ]);

                      setNotificationData((prev) => ({
                        notifications: prev.notifications.filter((n) => n.id !== notification.id),
                        unreadCount: prev.unreadCount > 0 ? prev.unreadCount - 1 : 0,
                      }));

                      if (
                        mintAddress &&
                        (notification.type === NotificationType.COMMENT_REPLY ||
                          notification.type === NotificationType.UPVOTE_RECEIVED) &&
                        notification.relatedEntityId
                      ) {
                        window.location.href = `/tokens/${mintAddress}/comments/${notification.relatedEntityId}`;
                      } else if (
                        notification.type !== NotificationType.COMMENT_REPLY &&
                        notification.type !== NotificationType.UPVOTE_RECEIVED
                      ) {
                        window.location.href = getNotificationLink(notification);
                      } else {
                        toast({
                          title: 'Content not found',
                          description:
                            'The comment or vote has been deleted or is no longer available.',
                          variant: 'default',
                        });
                        stopProcessing(notification.id);
                      }
                    } catch {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Failed to process notification',
                      });
                      stopProcessing(notification.id);
                    }
                  }}>
                  <div className='flex gap-2 p-2 sm:pl-3 sm:pr-1'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-[11px] sm:text-xs text-zinc-200 leading-relaxed'>
                        {notification.message}
                      </p>
                      <p className='text-[9px] sm:text-[10px] text-zinc-500 mt-1'>
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {isProcessing(notification.id) ? (
                      <div className='h-6 w-6 flex-shrink-0 flex items-center justify-center'>
                        <div className='h-3.5 w-3.5 border-2 border-t-transparent border-blue-400 rounded-full animate-spin'></div>
                      </div>
                    ) : null}
                  </div>

                  {!isProcessing(notification.id) && (
                    <button
                      className='absolute top-1 right-1 sm:top-2 sm:right-1 rounded-full w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors cursor-pointer'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      title='Dismiss notification'>
                      <X className='h-3 w-3 sm:h-3.5 sm:w-3.5' />
                    </button>
                  )}
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className='p-1 sm:p-2 border-t border-zinc-800/50 flex justify-center items-center'>
          <Link
            href='/settings/notifications'
            className='block text-center text-[10px] sm:text-xs text-zinc-400 hover:text-white p-1.5 sm:p-2 hover:bg-zinc-900/50 rounded-md transition-colors flex-1'
            onClick={() => setIsOpen(false)}>
            Manage notification settings
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
