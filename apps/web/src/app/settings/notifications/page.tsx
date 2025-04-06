'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { notifications } from '@/lib/api';
import { NotificationType } from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCircle2, Info, Loader2, Mail, MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const notificationTypes = [
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

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

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

        <Card className='border border-white/5 bg-black/30 backdrop-blur-sm shadow-xl overflow-hidden'>
          <CardHeader className='border-b border-white/5 pb-4 bg-gradient-to-r from-blue-950/40 to-purple-950/40'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <CardTitle className='text-lg font-medium text-white'>
                Manage Your Notifications
              </CardTitle>
              <div className='flex items-center text-xs text-muted-foreground gap-4 md:gap-6'>
                <div className='flex items-center'>
                  <BellRing className='h-3.5 w-3.5 mr-1.5 text-sky-400' />
                  <span>In-App</span>
                </div>
                <div className='flex items-center'>
                  <Mail className='h-3.5 w-3.5 mr-1.5 text-amber-400' />
                  <span>Email</span>
                </div>
                <div className='flex items-center'>
                  <MessageSquare className='h-3.5 w-3.5 mr-1.5 text-emerald-400' />
                  <span>Telegram</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-6'>
            <div className='text-xs mb-4 flex items-center text-muted-foreground'>
              <Info className='h-3.5 w-3.5 mr-1.5 flex-shrink-0' />
              <span>Email and Telegram notifications are coming soon.</span>
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
                    <div className='grid grid-cols-3 gap-4 sm:gap-8 w-full sm:w-auto ml-0 sm:ml-auto'>
                      <FormField
                        control={form.control}
                        name={`${type.id}.inApp`}
                        render={({ field }) => (
                          <FormItem className='flex items-center justify-center'>
                            <FormControl>
                              <Switch
                                checked={type.id === NotificationType.SYSTEM ? true : field.value}
                                onCheckedChange={field.onChange}
                                disabled={type.id === NotificationType.SYSTEM}
                                className='data-[state=checked]:bg-sky-600'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`${type.id}.email`}
                        render={({ field }) => (
                          <FormItem className='flex items-center justify-center'>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='data-[state=checked]:bg-amber-600'
                                disabled
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`${type.id}.telegram`}
                        render={({ field }) => (
                          <FormItem className='flex items-center justify-center'>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className='data-[state=checked]:bg-emerald-600'
                                disabled
                              />
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

        <div className='flex justify-end'>
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className='mr-4 flex items-center text-emerald-400 text-sm'>
                <CheckCircle2 className='h-4 w-4 mr-1.5' />
                <span>Preferences saved successfully</span>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            type='submit'
            disabled={!form.formState.isDirty || isSaving}
            className='min-w-[120px]'>
            {isSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
