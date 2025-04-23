'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { notifications } from '@/lib/api';
import { cn } from '@/lib/utils';
import { NotificationType } from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCircle2, Info, Link, Link2Off, Loader2, MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

const notificationTypes = [
  {
    id: NotificationType.TOKEN_CALL_VERIFIED,
    label: 'Token Call Results',
    description: 'Get notified when your token call predictions are finished',
  },
  {
    id: NotificationType.STREAK_AT_RISK,
    label: 'Streak at Risk',
    description: 'Get notified when your streak is about to expire',
  },
  {
    id: NotificationType.STREAK_ACHIEVED,
    label: 'Streak Achieved',
    description: 'Get notified when you reach a streak milestone',
  },
  {
    id: NotificationType.STREAK_BROKEN,
    label: 'Streak Broken',
    description: 'Get notified when your streak is broken',
  },
  {
    id: NotificationType.BADGE_EARNED,
    label: 'Badge Earned',
    description: 'Get notified when you earn a new badge',
  },
  {
    id: NotificationType.LEADERBOARD_CHANGE,
    label: 'Leaderboard Change',
    description: 'Get notified about changes in your leaderboard position',
  },
  {
    id: NotificationType.REPUTATION_MILESTONE,
    label: 'Reputation Milestone',
    description: 'Get notified when you reach a reputation milestone',
  },
  {
    id: NotificationType.COMMENT_REPLY,
    label: 'Comment Reply',
    description: 'Get notified when someone replies to your comment',
  },
  {
    id: NotificationType.UPVOTE_RECEIVED,
    label: 'Upvote Received',
    description: 'Get notified when someone upvotes your comment',
  },
  {
    id: 'followed_user_activity',
    label: 'Followed User Activity',
    description:
      'Notifications for predictions, comments, or votes from users you follow. Individual profile notifications settings override this.',
  },
  {
    id: NotificationType.SYSTEM,
    label: 'System Notifications',
    description: 'Important system-wide notifications',
  },
];

// Define form schema
const formSchema = z.record(
  z.string(),
  z.object({
    inApp: z.boolean(),
    email: z.boolean(),
    telegram: z.boolean(),
  }),
);

type NotificationPreferencesFormValues = z.infer<typeof formSchema>;

export default function NotificationSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Telegram state
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{
    isConnected: boolean;
    status: string;
    connectedUsername: string | null;
    connectedFirstName: string | null;
    connectedAt: string | null;
  } | null>(null);
  const [telegramToken, setTelegramToken] = useState<string | null>(null);

  const { toast } = useToast();

  const form = useForm<NotificationPreferencesFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: notificationTypes.reduce(
      (acc, type) => ({
        ...acc,
        [type.id]: { inApp: true, email: false, telegram: false },
      }),
      {} as NotificationPreferencesFormValues,
    ),
  });

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const preferences = await notifications.getPreferences();

      form.reset(preferences);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notification preferences',
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, toast]);

  const fetchTelegramStatus = useCallback(async () => {
    try {
      const status = await notifications.getTelegramStatus();
      setTelegramStatus(status);
    } catch (error) {
      console.error('Failed to get Telegram status', error);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
    fetchTelegramStatus();
  }, [fetchPreferences, fetchTelegramStatus]);

  const onSubmit = async (data: NotificationPreferencesFormValues) => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Compare with initial values to only update what changed
      const dirtyFields = form.formState.dirtyFields;

      // Update each notification type that has changed
      const updatePromises = Object.keys(dirtyFields).map(async (type) => {
        const settings = data[type];
        await notifications.updatePreference(type, settings);
      });

      await Promise.all(updatePromises);

      setSaveSuccess(true);

      form.reset(data);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Preferences',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectTelegram = async () => {
    try {
      setTelegramConnecting(true);
      const response = await notifications.generateTelegramToken();
      setTelegramToken(response.token);

      toast({
        title: 'Telegram Connection Ready',
        description: 'Use the button below or the manual steps to connect.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to generate Telegram connection token',
      });
      console.error('Failed to generate Telegram token:', error);
    } finally {
      setTelegramConnecting(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      setTelegramConnecting(true);
      await notifications.disconnectTelegram();

      setTelegramToken(null);
      await fetchTelegramStatus();

      toast({
        title: 'Telegram Disconnected',
        description: 'Your Telegram account has been disconnected',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Disconnection Error',
        description: 'Failed to disconnect Telegram account',
      });
      console.error('Failed to disconnect Telegram account:', error);
    } finally {
      setTelegramConnecting(false);
    }
  };

  const connectionUrl =
    telegramToken && botUsername
      ? `https://t.me/${botUsername}?start=connect_${telegramToken}`
      : '';

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between mb-4'>
          <Skeleton className='h-8 w-[200px]' />
          <Skeleton className='h-6 w-[100px]' />
        </div>

        <Skeleton className='h-10 w-full mb-6' />

        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-[250px]' />
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className='flex items-center justify-between py-3 border-b border-zinc-700/20'>
                  <div className='space-y-1'>
                    <Skeleton className='h-5 w-[180px]' />
                    <Skeleton className='h-4 w-[250px]' />
                  </div>
                  <div className='flex items-center space-x-5'>
                    <Skeleton className='h-6 w-6 rounded-full' />
                    <Skeleton className='h-6 w-6 rounded-full' />
                    <Skeleton className='h-6 w-6 rounded-full' />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-2xl font-bold text-white'>Notification Preferences</h2>
          <Badge variant='outline' className='px-3'>
            <BellRing className='h-3 w-3 mr-1' />
            <span className='text-xs'>Notifications</span>
          </Badge>
        </div>

        {/* Telegram Connection Card */}
        <Card className='border border-white/5 bg-black/30 backdrop-blur-sm shadow-xl overflow-hidden'>
          <CardHeader className='border-b border-white/5 pb-4 bg-gradient-to-r from-purple-950/40 to-indigo-950/40'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <CardTitle className='text-lg font-medium text-white'>Telegram Connection</CardTitle>
              <div className='flex items-center text-xs text-muted-foreground'>
                <MessageSquare className='h-3.5 w-3.5 mr-1.5 text-emerald-400' />
                <span>Get notifications on Telegram</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-6'>
            <div className='space-y-4'>
              {!telegramStatus?.isConnected && !telegramToken && (
                <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
                  <div>
                    <div className='font-medium text-white'>Connect Your Telegram Account</div>
                    <div className='text-xs text-zinc-400 mt-0.5'>
                      Receive notifications directly in Telegram
                    </div>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex items-center gap-2 border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/20'
                    onClick={handleConnectTelegram}
                    disabled={telegramConnecting}>
                    {telegramConnecting ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <Link className='h-3.5 w-3.5' />
                    )}
                    Connect Telegram
                  </Button>
                </div>
              )}

              {telegramToken && (
                <div className='flex flex-col space-y-4 p-4 rounded-md bg-indigo-950/20 border border-indigo-700/30'>
                  <div className='space-y-1'>
                    <div className='text-sm font-medium text-white mb-2'>
                      Click the button below to connect your Telegram account:
                    </div>
                    <a
                      href={connectionUrl || '#'}
                      target='_blank'
                      rel='noreferrer'
                      aria-disabled={!connectionUrl}
                      onClick={(e) => {
                        if (!connectionUrl) {
                          e.preventDefault();
                          toast({
                            variant: 'destructive',
                            title: 'Configuration Error',
                            description:
                              'Telegram Bot username is not configured in the frontend environment.',
                          });
                          return;
                        }
                        console.log('Opening Telegram with URL:', connectionUrl);

                        const checkInterval = setInterval(async () => {
                          try {
                            const status = await notifications.getTelegramStatus();
                            if (status.isConnected) {
                              setTelegramStatus(status);
                              setTelegramToken(null);
                              clearInterval(checkInterval);
                              toast({
                                title: 'Telegram Connected!',
                                description:
                                  'Your account has been successfully connected to Telegram.',
                                variant: 'default',
                              });
                            }
                          } catch (error) {
                            console.error('Failed to check connection status', error);
                          }
                        }, 3000);

                        setTimeout(() => clearInterval(checkInterval), 120000);
                      }}
                      className={cn(
                        'px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors text-white border border-indigo-500 flex items-center justify-center gap-2 w-full sm:w-auto',
                        !connectionUrl && 'opacity-50 cursor-not-allowed',
                      )}>
                      <MessageSquare className='h-4 w-4' />
                      Open in Telegram
                    </a>
                    <div className='mt-4 pt-3 border-t border-indigo-800/30'>
                      <div className='text-xs text-zinc-400 mb-2'>
                        If automatic connection doesn&apos;t work, you can:
                      </div>
                      {botUsername ? (
                        <ol className='list-decimal text-xs text-zinc-300 ml-4 space-y-1'>
                          <li>
                            Open Telegram and find{' '}
                            <span className='font-mono bg-black/30 px-1'>@{botUsername}</span>
                          </li>
                          <li>
                            Send the command:{' '}
                            <span className='font-mono bg-black/30 px-1'>
                              /connect {telegramToken}
                            </span>
                          </li>
                        </ol>
                      ) : (
                        <div className='text-xs text-red-400'>Bot username not configured.</div>
                      )}

                      <div className='text-xs text-amber-400 mt-3 flex items-center'>
                        <Info className='h-3 w-3 mr-1' />
                        This token will expire in 24 hours
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {telegramStatus?.isConnected && (
                <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
                  <div>
                    <div className='font-medium text-white flex items-center gap-2'>
                      Connected to Telegram
                      <Badge className='bg-emerald-950 text-emerald-300 border-0 text-[10px] hover:bg-emerald-950 cursor-default'>
                        <CheckCircle2 className='h-2.5 w-2.5 mr-1' />
                        Active
                      </Badge>
                    </div>
                    {telegramStatus.connectedUsername && (
                      <div className='text-xs text-zinc-400 mt-0.5'>
                        @{telegramStatus.connectedUsername}
                      </div>
                    )}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex items-center gap-2 border-red-700/50 text-red-400 hover:bg-red-950/20'
                    onClick={handleDisconnectTelegram}
                    disabled={telegramConnecting}>
                    {telegramConnecting ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <Link2Off className='h-3.5 w-3.5' />
                    )}
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className='border border-white/5 bg-black/30 backdrop-blur-sm shadow-xl overflow-hidden'>
          <CardHeader className='border-b border-white/5 pb-4 bg-gradient-to-r from-blue-950/40 to-purple-950/40'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <CardTitle className='text-lg font-medium text-white'>
                Manage Your Notifications
              </CardTitle>
              <div className='flex items-center text-xs text-muted-foreground gap-4'>
                <div className='flex items-center justify-center w-16'>
                  <span>In-App</span>
                </div>
                <div className='flex items-center justify-center w-16'>
                  <MessageSquare className='h-3.5 w-3.5 mr-1.5 text-emerald-400' />
                  <span>Telegram</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-6'>
            <div className='text-xs mb-4 flex items-center text-muted-foreground'>
              <Info className='h-3.5 w-3.5 mr-1.5 flex-shrink-0' />
              <span>
                Email notifications are coming soon.{' '}
                {!telegramStatus?.isConnected &&
                  'Connect your Telegram to enable Telegram notifications.'}
              </span>
            </div>
            <div className='space-y-2'>
              <AnimatePresence>
                {notificationTypes.map((type, index) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className='flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 border-b border-zinc-800/30 last:border-0 first:pt-0 gap-3'>
                    <div className='flex-1 pr-0 sm:pr-4 w-full sm:w-auto'>
                      <div className='font-medium text-white'>{type.label}</div>
                      <div className='text-xs text-zinc-400 mt-0.5'>{type.description}</div>
                      {type.id === NotificationType.SYSTEM && (
                        <div className='text-[10px] mt-1 text-amber-400 flex items-center'>
                          <Info className='h-3 w-3 mr-1' />
                          System notifications cannot be disabled
                        </div>
                      )}
                    </div>
                    <div className='flex items-center gap-4'>
                      <FormField
                        control={form.control}
                        name={
                          type.id === 'followed_user_activity'
                            ? `${NotificationType.FOLLOWED_USER_PREDICTION}.inApp`
                            : `${type.id}.inApp`
                        }
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className='flex items-center justify-center w-16'>
                                <Switch
                                  checked={type.id === NotificationType.SYSTEM ? true : field.value}
                                  onCheckedChange={(checked) => {
                                    if (type.id === 'followed_user_activity') {
                                      form.setValue(
                                        `${NotificationType.FOLLOWED_USER_PREDICTION}.inApp`,
                                        checked,
                                      );
                                      form.setValue(
                                        `${NotificationType.FOLLOWED_USER_COMMENT}.inApp`,
                                        checked,
                                      );
                                      form.setValue(
                                        `${NotificationType.FOLLOWED_USER_VOTE}.inApp`,
                                        checked,
                                      );
                                    } else {
                                      field.onChange(checked);
                                    }
                                  }}
                                  disabled={type.id === NotificationType.SYSTEM}
                                  className={
                                    type.id === NotificationType.SYSTEM
                                      ? 'disabled:opacity-50'
                                      : 'data-[state=checked]:bg-sky-600'
                                  }
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={
                          type.id === 'followed_user_activity'
                            ? `${NotificationType.FOLLOWED_USER_PREDICTION}.telegram`
                            : `${type.id}.telegram`
                        }
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className='flex items-center justify-center w-16'>
                                <Switch
                                  checked={
                                    !telegramStatus?.isConnected
                                      ? false
                                      : type.id === NotificationType.SYSTEM
                                        ? true
                                        : field.value
                                  }
                                  onCheckedChange={(checked) => {
                                    if (type.id === 'followed_user_activity') {
                                      const relatedTypes = [
                                        NotificationType.FOLLOWED_USER_PREDICTION,
                                        NotificationType.FOLLOWED_USER_COMMENT,
                                        NotificationType.FOLLOWED_USER_VOTE,
                                      ];
                                      relatedTypes.forEach((relatedType) => {
                                        form.setValue(`${relatedType}.telegram`, checked, {
                                          shouldDirty: true,
                                        });
                                      });
                                    } else {
                                      field.onChange(checked);
                                    }
                                  }}
                                  disabled={
                                    !telegramStatus?.isConnected ||
                                    type.id === NotificationType.SYSTEM
                                  }
                                  className={
                                    !telegramStatus?.isConnected ||
                                    type.id === NotificationType.SYSTEM
                                      ? 'disabled:opacity-50'
                                      : 'data-[state=checked]:bg-emerald-600'
                                  }
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        <div className='flex justify-end items-center gap-3'>
          {saveSuccess && (
            <div className='text-emerald-500 text-sm font-medium flex items-center'>
              <CheckCircle2 className='h-4 w-4 mr-1.5' />
              Changes saved
            </div>
          )}
          <Button
            type='submit'
            disabled={isSaving || !form.formState.isDirty}
            className='flex items-center gap-2'>
            {isSaving && <Loader2 className='h-4 w-4 animate-spin' />}
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
