'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Eye, Loader2, ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import necessary components for the new setting
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/api';
// Import useAuthContext to get the username
import { useAuthContext } from '@/providers/auth-provider';
import { UserPreferences, defaultUserPreferences } from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

// Client-only wallet content component
const WalletContent = dynamic(
  () => import('@/components/wallet/WalletContent').then((mod) => mod.WalletContent),
  { ssr: false },
);

// Schema for the wallet visibility setting
const walletSettingsSchema = z.object({
  showWalletAddress: z.boolean().optional(),
});

type WalletSettingsFormValues = z.infer<typeof walletSettingsSchema>;

export default function AccountPage() {
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const { toast } = useToast();
  // Get user from auth context
  const { user } = useAuthContext();

  const form = useForm<WalletSettingsFormValues>({
    resolver: zodResolver(walletSettingsSchema),
    defaultValues: {
      showWalletAddress: defaultUserPreferences.showWalletAddress,
    },
  });

  const fetchUserPreferences = useCallback(async () => {
    try {
      setIsLoadingPreferences(true);
      const preferences = await users.getUserPreferences();
      form.reset({
        showWalletAddress:
          preferences?.showWalletAddress ?? defaultUserPreferences.showWalletAddress,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile visibility setting',
      });
      form.reset({ showWalletAddress: defaultUserPreferences.showWalletAddress });
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [form, toast]);

  useEffect(() => {
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  const saveVisibilityPreference = useCallback(
    async (isVisible: boolean) => {
      // Prevent saving if already in the desired state or currently saving
      if (isSavingPreferences || form.getValues('showWalletAddress') === isVisible) {
        return;
      }

      setIsSavingPreferences(true);
      try {
        const changedPreferences: Partial<Pick<UserPreferences, 'showWalletAddress'>> = {
          showWalletAddress: isVisible,
        };

        // Pass the current username to invalidate public profile cache if needed
        const updatedPrefs = await users.updateUserPreferences(changedPreferences, user?.username);
        toast({
          title: 'Success',
          description: 'Profile visibility updated',
        });
        form.reset(
          {
            showWalletAddress:
              updatedPrefs?.showWalletAddress ?? defaultUserPreferences.showWalletAddress,
          },
          { keepDefaultValues: true },
        );
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error Saving Setting',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
        await fetchUserPreferences();
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [user, toast, form, isSavingPreferences, fetchUserPreferences],
  );

  return (
    <div className='space-y-8'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-bold'>Connected Wallets</h2>
        <Badge variant='outline' className='px-3'>
          <ShieldCheck className='h-3 w-3 mr-1' />
          <span className='text-xs'>Security & Visibility</span>
        </Badge>
      </div>

      {/* Main Wallet Management Card */}
      <Card className='transition-all hover:shadow-md'>
        <CardContent>
          <WalletContent />
        </CardContent>

        {/* Integrated Profile Visibility Setting Footer */}
        <CardFooter className='border-t pt-6'>
          <FormProvider {...form}>
            <div className='w-full'>
              <FormField
                control={form.control}
                name='showWalletAddress'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base flex items-center gap-2'>
                        <Eye className='h-4 w-4 text-muted-foreground' />
                        Public Profile Visibility
                      </FormLabel>
                      <FormDescription>
                        Show primary verified wallet on your public profile.
                      </FormDescription>
                    </div>
                    <div className='flex items-center gap-4'>
                      {isSavingPreferences && (
                        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                      )}
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={saveVisibilityPreference}
                          disabled={isLoadingPreferences || isSavingPreferences}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </FormProvider>
        </CardFooter>
      </Card>
    </div>
  );
}
