'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { LayoutGrid } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ControllerRenderProps, FieldPath, useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  tokenChartDisplay: z.enum(['price', 'marketCap']),
});

type SettingsFormValues = z.infer<typeof formSchema>;

const defaultValues: SettingsFormValues = {
  tokenChartDisplay: 'price',
};

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const fetchUserPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const settings = await users.getUserSettings();

      const tokenChartDisplay = settings.tokenChartDisplay as 'price' | 'marketCap';

      const values = {
        ...defaultValues,
        tokenChartDisplay: tokenChartDisplay || defaultValues.tokenChartDisplay,
      };

      form.reset(values);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load settings',
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, toast]);

  useEffect(() => {
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const settingsData = {
        tokenChartDisplay: data.tokenChartDisplay,
      };

      await users.updateUserSettings(settingsData);
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Settings',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  type FormFieldRenderProps<
    T extends FieldPath<SettingsFormValues> = FieldPath<SettingsFormValues>,
  > = {
    field: ControllerRenderProps<SettingsFormValues, T>;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Token Chart Display</CardTitle>
                <CardDescription>Set your default token chart display preference</CardDescription>
              </div>
              <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
                <LayoutGrid className='h-5 w-5 text-primary' />
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <FormField
              control={form.control}
              name='tokenChartDisplay'
              render={({ field }: FormFieldRenderProps<'tokenChartDisplay'>) => (
                <FormItem className='space-y-3'>
                  <FormLabel>Default Chart View</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className='flex flex-col space-y-1'>
                      <FormItem className='flex items-center space-x-3 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='price' />
                        </FormControl>
                        <FormLabel className='font-normal'>Price</FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center space-x-3 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='marketCap' />
                        </FormControl>
                        <FormLabel className='font-normal'>Market Cap</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Choose your preferred data view for token charts
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className='flex justify-end'>
          <Button type='submit' disabled={isLoading || !form.formState.isDirty}>
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
