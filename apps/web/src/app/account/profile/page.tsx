'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ApiError, auth, users } from '@/lib/api';
import { getHighResAvatar } from '@/lib/utils';
import { User } from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const profileFormSchema = z.object({
  displayName: z.string().max(50, 'Display name cannot exceed 50 characters'),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      bio: '',
    },
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const authResponse = await auth.getProfile();
        if (authResponse.authenticated && authResponse.user) {
          const fullUser = await users.getByUsername(authResponse.user.username);
          setUser(fullUser);
          form.reset({
            displayName: fullUser.displayName || '',
            bio: fullUser.bio || '',
          });
        } else {
          toast({
            title: 'Authentication Error',
            description: 'You must be logged in to edit your profile.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        toast({
          title: 'Error Loading Profile',
          description: err instanceof ApiError ? err.message : 'Failed to load profile.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [form]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);

    if (!user) {
      toast({
        title: 'Error',
        description: 'User data not loaded.',
        variant: 'destructive',
      });
      setIsSaving(false);
      return;
    }

    try {
      const updatedUser = await users.updateProfile({
        displayName: values.displayName === user.displayName ? undefined : values.displayName,
        bio: values.bio === user.bio ? undefined : values.bio,
      });

      setUser(updatedUser);
      form.reset({
        displayName: updatedUser.displayName || '',
        bio: updatedUser.bio || '',
      });
      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast({
        title: 'Error Saving Profile',
        description: err instanceof ApiError ? err.message : 'Failed to save profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-40'>
        <LoadingSpinner className='h-8 w-8' />
      </div>
    );
  }

  if (!user) {
    return (
      <div className='p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2'>
        <AlertCircle className='h-5 w-5' />
        <p>Please log in to edit your profile.</p>
      </div>
    );
  }

  const avatarUrl = getHighResAvatar(user.avatarUrl) || null;

  return (
    <div>
      <div className='mb-8 p-6 rounded-lg border border-white/10 bg-card/50 shadow-sm'>
        <div className='flex flex-col sm:flex-row items-center sm:items-start gap-5'>
          <div className='relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-lg'>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user.displayName || user.username}
                fill
                className='object-cover'
                sizes='96px'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary'>
                <UserIcon className='h-10 w-10 text-primary-foreground' />
              </div>
            )}
          </div>

          <div className='flex-1 text-center sm:text-left'>
            <h1 className='text-2xl font-bold'>{user.displayName}</h1>
            <p className='text-muted-foreground text-sm mb-3'>@{user.username}</p>

            {user.bio && (
              <div className='max-w-lg mt-2'>
                <p className='text-sm text-foreground/80'>{user.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className='text-2xl font-bold mb-6'>Edit Profile</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='displayName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={50} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='bio'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea {...field} maxLength={500} />
                </FormControl>
                <FormDescription>
                  Tell us a bit about yourself. (Max 500 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <LoadingSpinner className='mr-2 h-4 w-4' />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
