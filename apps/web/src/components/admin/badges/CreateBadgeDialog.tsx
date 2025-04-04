'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { badges } from '@/lib/api';
import { BadgeCategory, BadgeFormSchema, BadgeFormValues, BadgeRequirement } from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

interface CreateBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateBadgeDialog({ open, onOpenChange, onSuccess }: CreateBadgeDialogProps) {
  const { toast } = useToast();

  const form = useForm<BadgeFormValues>({
    resolver: zodResolver(BadgeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: BadgeCategory.STREAK,
      requirement: BadgeRequirement.CURRENT_STREAK,
      thresholdValue: 0,
      isActive: true,
    },
  });

  const handleSubmit = async (values: BadgeFormValues) => {
    try {
      const result = await badges.admin.createBadge(values);

      if (result) {
        toast({
          title: 'Success',
          description: `Badge "${values.name}" has been created.`,
        });

        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        throw new Error('Failed to create badge');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create badge. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100'>
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold'>Create New Badge</DialogTitle>
          <DialogDescription className='text-zinc-400'>
            Add a new badge that can be awarded to users based on specific criteria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Badge Name</Label>
            <Input
              id='name'
              className='bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-500 text-zinc-100'
              {...form.register('name')}
              placeholder='e.g. 7 Day Streak'
            />
            {form.formState.errors.name && (
              <p className='text-xs text-red-500 mt-1'>{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              className='bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-500 text-zinc-100 min-h-[80px]'
              {...form.register('description')}
              placeholder='e.g. Awarded for maintaining activity for 7 consecutive days'
            />
            {form.formState.errors.description && (
              <p className='text-xs text-red-500 mt-1'>
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='category'>Category</Label>
            <Controller
              control={form.control}
              name='category'
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className='bg-zinc-900/50 border-zinc-800 focus:ring-zinc-500 text-zinc-100'>
                    <SelectValue placeholder='Select category' />
                  </SelectTrigger>
                  <SelectContent className='bg-zinc-900 border-zinc-800 text-zinc-100'>
                    <SelectItem value={BadgeCategory.STREAK}>Streak</SelectItem>
                    <SelectItem value={BadgeCategory.CONTENT}>Content</SelectItem>
                    <SelectItem value={BadgeCategory.ENGAGEMENT}>Engagement</SelectItem>
                    <SelectItem value={BadgeCategory.VOTING}>Voting</SelectItem>
                    <SelectItem value={BadgeCategory.RECEPTION}>Reception</SelectItem>
                    <SelectItem value={BadgeCategory.QUALITY}>Quality</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.category && (
              <p className='text-xs text-red-500 mt-1'>{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='requirement'>Requirement</Label>
            <Controller
              control={form.control}
              name='requirement'
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className='bg-zinc-900/50 border-zinc-800 focus:ring-zinc-500 text-zinc-100'>
                    <SelectValue placeholder='Select requirement' />
                  </SelectTrigger>
                  <SelectContent className='bg-zinc-900 border-zinc-800 text-zinc-100'>
                    <SelectItem value={BadgeRequirement.CURRENT_STREAK}>Current Streak</SelectItem>
                    <SelectItem value={BadgeRequirement.MAX_STREAK}>Max Streak</SelectItem>
                    <SelectItem value={BadgeRequirement.POSTS_COUNT}>Posts Count</SelectItem>
                    <SelectItem value={BadgeRequirement.COMMENTS_COUNT}>Comments Count</SelectItem>
                    <SelectItem value={BadgeRequirement.UPVOTES_RECEIVED_COUNT}>
                      Upvotes Received
                    </SelectItem>
                    <SelectItem value={BadgeRequirement.UPVOTES_GIVEN_COUNT}>
                      Upvotes Given
                    </SelectItem>
                    <SelectItem value={BadgeRequirement.COMMENTS_RECEIVED_COUNT}>
                      Comments Received
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.requirement && (
              <p className='text-xs text-red-500 mt-1'>
                {form.formState.errors.requirement.message}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='thresholdValue'>Threshold Value</Label>
            <Input
              id='thresholdValue'
              type='number'
              className='bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-500 text-zinc-100'
              {...form.register('thresholdValue', { valueAsNumber: true })}
              placeholder='e.g. 7'
            />
            {form.formState.errors.thresholdValue && (
              <p className='text-xs text-red-500 mt-1'>
                {form.formState.errors.thresholdValue.message}
              </p>
            )}
          </div>

          <div className='flex items-center justify-between'>
            <div className='space-y-0'>
              <Label htmlFor='isActive' className='text-sm'>
                Badge Status
              </Label>
              <p className='text-xs text-zinc-400'>
                Make this badge active and available for users to earn
              </p>
            </div>
            <Controller
              control={form.control}
              name='isActive'
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className='data-[state=checked]:bg-green-600'
                />
              )}
            />
          </div>

          <DialogFooter className='pt-4'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={form.formState.isSubmitting}
              className='bg-blue-600 hover:bg-blue-700 text-white'>
              {form.formState.isSubmitting ? 'Creating...' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
