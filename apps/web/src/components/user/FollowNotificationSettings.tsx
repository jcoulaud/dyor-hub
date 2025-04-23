'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/api';
import { Bell, BellOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface FollowNotificationSettingsProps {
  followedId: string;
}

interface PreferencesState {
  prediction: boolean;
  comment: boolean;
  vote: boolean;
}

export function FollowNotificationSettings({ followedId }: FollowNotificationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<PreferencesState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    if (!followedId) return;

    setIsLoading(true);

    try {
      const relationship = await users.getFollowRelationshipDetails(followedId);
      if (relationship) {
        const newPreferences = {
          prediction: relationship.notify_on_prediction,
          comment: relationship.notify_on_comment,
          vote: relationship.notify_on_vote,
        };
        setPreferences(newPreferences);
      } else {
        setPreferences(null);
        if (isOpen) {
          toast({
            title: 'Info',
            description: 'Notification settings unavailable.',
            variant: 'default',
          });
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch follow preferences:', error);
      setPreferences(null);
      if (isOpen) {
        toast({
          title: 'Error',
          description: 'Could not load notification settings.',
          variant: 'destructive',
        });
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [followedId, toast, isOpen]);

  useEffect(() => {
    fetchPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreferenceChange = (key: keyof PreferencesState, value: boolean) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, [key]: value };

    setPreferences(newPreferences);

    users.updateFollowPreferences(followedId, newPreferences).catch(() => {
      setPreferences(preferences);
      toast({
        title: 'Error',
        description: 'Could not update settings.',
        variant: 'destructive',
      });
    });
  };

  const hasEnabledNotifications = Boolean(
    preferences && (preferences.prediction || preferences.comment || preferences.vote),
  );

  const showBellIcon = isLoading || hasEnabledNotifications;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='rounded-full text-zinc-400 hover:text-blue-400 hover:bg-zinc-800/50 transition-colors relative'
          aria-label='Notification Settings'>
          <div className='relative'>
            {showBellIcon ? <Bell className='h-4 w-4' /> : <BellOff className='h-4 w-4' />}
            {hasEnabledNotifications && (
              <span className='absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full' />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-72 bg-zinc-900 border-zinc-700/50 p-5 shadow-xl text-zinc-200 relative'
        align='end'
        sideOffset={5}>
        <div className='space-y-5'>
          <div className='flex items-center space-x-2'>
            <Bell className='h-5 w-5 text-blue-400' />
            <h4 className='font-medium text-lg text-white'>Notification Settings</h4>
          </div>

          {isLoading ? (
            <div className='space-y-4 py-2'>
              <Skeleton className='h-6 w-full' />
              <Skeleton className='h-6 w-full' />
              <Skeleton className='h-6 w-full' />
            </div>
          ) : preferences ? (
            <div className='space-y-4 py-1'>
              <div className='flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-zinc-800/50 transition-colors'>
                <Label
                  htmlFor='prediction-switch'
                  className='text-sm font-medium leading-none cursor-pointer'>
                  New Prediction
                </Label>
                <div className='relative'>
                  <Switch
                    id='prediction-switch'
                    checked={preferences.prediction}
                    onCheckedChange={(checked) => handlePreferenceChange('prediction', checked)}
                    className='data-[state=checked]:bg-blue-600'
                  />
                </div>
              </div>

              <div className='flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-zinc-800/50 transition-colors'>
                <Label
                  htmlFor='comment-switch'
                  className='text-sm font-medium leading-none cursor-pointer'>
                  New Comment
                </Label>
                <div className='relative'>
                  <Switch
                    id='comment-switch'
                    checked={preferences.comment}
                    onCheckedChange={(checked) => handlePreferenceChange('comment', checked)}
                    className='data-[state=checked]:bg-blue-600'
                  />
                </div>
              </div>

              <div className='flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-zinc-800/50 transition-colors'>
                <Label
                  htmlFor='vote-switch'
                  className='text-sm font-medium leading-none cursor-pointer'>
                  New Vote
                </Label>
                <div className='relative'>
                  <Switch
                    id='vote-switch'
                    checked={preferences.vote}
                    onCheckedChange={(checked) => handlePreferenceChange('vote', checked)}
                    className='data-[state=checked]:bg-blue-600'
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className='p-3 bg-zinc-800/50 rounded-md'>
              <p className='text-sm text-zinc-400'>Could not load settings.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
