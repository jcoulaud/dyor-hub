'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/api';
import type { ChartDisplayMode, UserPreferences } from '@dyor-hub/types';
import { defaultUserPreferences } from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart2, Loader2, Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ControllerRenderProps, FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';

const settingsSchema = z.object({
  tokenChartDisplay: z.enum(['price', 'marketCap']).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      tokenChartDisplay: defaultUserPreferences.tokenChartDisplay,
    },
  });

  const fetchUserPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const preferences = await users.getUserPreferences();

      form.reset({
        tokenChartDisplay:
          preferences?.tokenChartDisplay ?? defaultUserPreferences.tokenChartDisplay,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load preferences',
      });
      form.reset({ tokenChartDisplay: defaultUserPreferences.tokenChartDisplay });
    } finally {
      setIsLoading(false);
    }
  }, [form, toast]);

  useEffect(() => {
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
    try {
      setIsSaving(true);

      const dirtyFields = form.formState.dirtyFields;
      const changedPreferences: Partial<SettingsFormValues> = {};

      if (dirtyFields.tokenChartDisplay && data.tokenChartDisplay !== undefined) {
        changedPreferences.tokenChartDisplay = data.tokenChartDisplay;
      }

      if (Object.keys(changedPreferences).length === 0) {
        if (form.formState.isDirty) {
          toast({ description: 'No changes detected to save.' });
        }
        setIsSaving(false);
        return;
      }

      const apiPayload: Partial<UserPreferences> = {
        tokenChartDisplay: changedPreferences.tokenChartDisplay as ChartDisplayMode | undefined,
      };

      const updatedPrefs = await users.updateUserPreferences(apiPayload);
      toast({
        title: 'Success',
        description: 'Preferences saved successfully',
      });
      form.reset(
        {
          tokenChartDisplay:
            updatedPrefs?.tokenChartDisplay ?? defaultUserPreferences.tokenChartDisplay,
        },
        { keepDirty: false, keepValues: false },
      );
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Preferences',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  type PreferencesFieldRenderProps = {
    field: ControllerRenderProps<SettingsFormValues, 'tokenChartDisplay'>;
  };

  if (isLoading) {
    return (
      <div className='space-y-8'>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <Skeleton className='h-6 w-[180px]' />
                <Skeleton className='h-4 w-[250px]' />
              </div>
              <Skeleton className='h-10 w-10 rounded-full' />
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Skeleton className='h-5 w-[120px]' />
              <div className='space-y-3'>
                <Skeleton className='h-4 w-full max-w-[300px]' />
                <Skeleton className='h-4 w-full max-w-[300px]' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit as SubmitHandler<FieldValues>)}
        className='space-y-8'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-2xl font-bold'>User Preferences</h2>
          <Badge variant='outline' className='px-3'>
            <Settings className='h-3 w-3 mr-1' />
            <span className='text-xs'>Personalization</span>
          </Badge>
        </div>

        <div className='space-y-4'>
          <Card className='transition-all hover:shadow-md'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Token Chart Display</CardTitle>
                  <CardDescription>Set your default token chart display preference</CardDescription>
                </div>
                <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
                  <BarChart2 className='h-5 w-5 text-primary' />
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='tokenChartDisplay'
                render={({ field }: PreferencesFieldRenderProps) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>Default Chart View</FormLabel>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className='grid grid-cols-2 gap-4'>
                      <FormItem>
                        <FormControl>
                          <label
                            className={`flex w-full cursor-pointer items-center space-x-2 rounded-md border p-4 transition-colors hover:bg-secondary/50 ${field.value === 'price' ? 'border-primary bg-primary/5' : ''}`}>
                            <RadioGroupItem value='price' id='price' className='cursor-pointer' />
                            <FormLabel htmlFor='price' className='font-medium cursor-pointer'>
                              Price
                            </FormLabel>
                          </label>
                        </FormControl>
                      </FormItem>
                      <FormItem>
                        <FormControl>
                          <label
                            className={`flex w-full cursor-pointer items-center space-x-2 rounded-md border p-4 transition-colors hover:bg-secondary/50 ${field.value === 'marketCap' ? 'border-primary bg-primary/5' : ''}`}>
                            <RadioGroupItem
                              value='marketCap'
                              id='marketCap'
                              className='cursor-pointer'
                            />
                            <FormLabel htmlFor='marketCap' className='font-medium cursor-pointer'>
                              Market Cap
                            </FormLabel>
                          </label>
                        </FormControl>
                      </FormItem>
                    </RadioGroup>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className='flex justify-end'>
          <Button
            type='submit'
            disabled={isLoading || isSaving || !form.formState.isDirty}
            className='min-w-[120px]'>
            {isSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
