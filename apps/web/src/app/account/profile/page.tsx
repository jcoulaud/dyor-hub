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
import { ApiError, auth, uploads, users } from '@/lib/api';
import { getHighResAvatar } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { User } from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Camera, Loader2, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

function formatBioPreview(bio: string) {
  if (!bio) return null;

  const normalizedBio = bio.replace(/\r\n/g, '\n');
  const lines = normalizedBio.split('\n');

  return (
    <div className='whitespace-pre-line space-y-2'>
      {lines.map((line, i) => {
        if (!line.trim()) {
          return <div key={i} className='h-4'></div>;
        }

        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

const profileFormSchema = z.object({
  displayName: z.string().max(30, 'Display name cannot exceed 30 characters'),
  bio: z.string().max(400, 'Bio cannot exceed 400 characters'),
  avatarUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const { checkAuth } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      bio: '',
      avatarUrl: '',
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
            avatarUrl: fullUser.avatarUrl || '',
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `Please use one of: ${allowedTypes.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (file.size > maxSizeBytes) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Use signup presigned URL to upload to temp location first
      const presignedResponse = await uploads.getSignupPresignedImageUrl({
        filename: file.name,
        contentType: file.type,
        contentLength: file.size,
      });

      const uploadResponse = await fetch(presignedResponse.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      // Confirm upload with moderation
      const confirmResponse = await uploads.confirmUpload(presignedResponse.objectKey);

      form.setValue('avatarUrl', confirmResponse.finalUrl);

      toast({
        title: 'Avatar uploaded successfully!',
        description: 'Your new avatar will be saved when you update your profile.',
      });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast({
        title: 'Upload failed',
        description:
          error instanceof ApiError ? error.message : 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

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
      const payload = {
        displayName: values.displayName === user.displayName ? undefined : values.displayName,
        bio: values.bio === user.bio ? undefined : values.bio,
        avatarUrl: values.avatarUrl === user.avatarUrl ? undefined : values.avatarUrl,
      };

      const updatedUser = await users.updateProfile(payload);

      setUser(updatedUser);
      setAvatarPreview(null); // Clear preview since it's now saved

      // Refresh auth context to update header avatar
      await checkAuth(true);

      form.reset({
        displayName: updatedUser.displayName || '',
        bio: updatedUser.bio || '',
        avatarUrl: updatedUser.avatarUrl || '',
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

  const currentAvatarUrl = avatarPreview || getHighResAvatar(user.avatarUrl) || null;

  return (
    <div>
      <div className='mb-8 p-6 rounded-lg border border-white/10 bg-card/50 shadow-sm'>
        <div className='flex flex-col sm:flex-row items-center sm:items-start gap-5'>
          <div className='relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-lg'>
            {currentAvatarUrl ? (
              <Image
                src={currentAvatarUrl}
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
                <div className='text-sm text-foreground/80 whitespace-pre-line'>
                  {formatBioPreview(user.bio)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className='text-2xl font-bold mb-6'>Edit Profile</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          {/* Avatar Upload Section */}
          <div className='space-y-6'>
            <div className='text-center space-y-4'>
              <div className='relative inline-block'>
                <div
                  onClick={!isUploadingAvatar ? triggerFileUpload : undefined}
                  className={`relative w-32 h-32 rounded-3xl cursor-pointer group transition-all duration-300 ${
                    isUploadingAvatar ? 'cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'
                  }`}>
                  {isUploadingAvatar ? (
                    <div className='w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center border border-purple-500/30'>
                      <div className='text-center space-y-2'>
                        <Loader2 className='h-8 w-8 text-purple-400 mx-auto animate-spin' />
                        <p className='text-sm text-purple-400 font-medium'>Uploading...</p>
                      </div>
                    </div>
                  ) : currentAvatarUrl ? (
                    <div className='relative w-full h-full'>
                      <Image
                        src={currentAvatarUrl}
                        alt='Profile picture'
                        fill
                        className='rounded-3xl object-cover'
                        sizes='128px'
                      />
                      <div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-3xl transition-colors duration-300 flex items-center justify-center'>
                        <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center space-y-1'>
                          <Camera className='h-6 w-6 text-white mx-auto' />
                          <p className='text-xs text-white font-medium'>Change Photo</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center border-2 border-dashed border-purple-400/50 group-hover:border-purple-400 transition-colors duration-300'>
                      <div className='text-center space-y-2'>
                        <Camera className='h-8 w-8 text-purple-400 mx-auto group-hover:text-purple-300 transition-colors duration-300' />
                        <p className='text-sm text-purple-400 font-medium'>Add Photo</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className='text-sm text-muted-foreground max-w-xs mx-auto'>
                JPG, PNG or WebP. Max 5MB.
              </p>

              <input
                type='file'
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept='image/*'
                className='hidden'
              />
            </div>
          </div>

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

          <Button type='submit' disabled={isSaving || isLoading || isUploadingAvatar}>
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
