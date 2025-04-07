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
import {
  Badge,
  BadgeCategory,
  BadgeFormSchema,
  BadgeFormValues,
  BadgeRequirement,
} from '@dyor-hub/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface BadgeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: Badge | null;
  mode: 'view' | 'edit';
  onSave?: (badgeId: string, values: BadgeFormValues) => Promise<void>;
}

export function BadgeDetailsDialog({
  open,
  onOpenChange,
  badge,
  mode,
  onSave,
}: BadgeDetailsDialogProps) {
  const { toast } = useToast();

  const form = useForm<BadgeFormValues>({
    resolver: zodResolver(BadgeFormSchema),
    defaultValues: {
      name: badge?.name || '',
      description: badge?.description || '',
      category: badge?.category || BadgeCategory.STREAK,
      requirement: badge?.requirement || BadgeRequirement.CURRENT_STREAK,
      thresholdValue: badge?.thresholdValue || 0,
      isActive: badge?.isActive || true,
    },
  });

  // Reset form values when the badge changes
  useEffect(() => {
    if (badge) {
      form.reset({
        name: badge.name || '',
        description: badge.description || '',
        category: badge.category || BadgeCategory.STREAK,
        requirement: badge.requirement || BadgeRequirement.CURRENT_STREAK,
        thresholdValue: badge.thresholdValue || 0,
        isActive: badge.isActive || true,
      });
    }
  }, [badge, form]);

  const handleSubmit = async (values: BadgeFormValues) => {
    if (!badge || !onSave) return;

    try {
      await onSave(badge.id, values);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating badge:', error);
      toast({
        title: 'Error',
        description: 'Failed to update badge. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case BadgeCategory.STREAK:
        return 'Streak';
      case BadgeCategory.CONTENT:
        return 'Content';
      case BadgeCategory.ENGAGEMENT:
        return 'Engagement';
      case BadgeCategory.VOTING:
        return 'Voting';
      case BadgeCategory.RECEPTION:
        return 'Reception';
      case BadgeCategory.QUALITY:
        return 'Quality';
      default:
        return category;
    }
  };

  const getRequirementLabel = (requirement: string): string => {
    switch (requirement) {
      case BadgeRequirement.CURRENT_STREAK:
        return 'Current Streak';
      case BadgeRequirement.MAX_STREAK:
        return 'Max Streak';
      case BadgeRequirement.POSTS_COUNT:
        return 'Posts Count';
      case BadgeRequirement.COMMENTS_COUNT:
        return 'Comments Count';
      case BadgeRequirement.UPVOTES_RECEIVED_COUNT:
        return 'Upvotes Received';
      case BadgeRequirement.VOTES_CAST_COUNT:
        return 'Votes Cast';
      case BadgeRequirement.COMMENTS_RECEIVED_COUNT:
        return 'Comments Received';
      case BadgeRequirement.MAX_COMMENT_UPVOTES:
        return 'Max Comment Upvotes';
      case BadgeRequirement.MAX_POST_UPVOTES:
        return 'Max Post Upvotes';
      case BadgeRequirement.TOP_PERCENT_WEEKLY:
        return 'Top Percent Weekly';
      default:
        return requirement;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100'>
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold'>
            {mode === 'view' ? 'Badge Details' : 'Edit Badge'}
          </DialogTitle>
          <DialogDescription className='text-zinc-400'>
            {mode === 'view'
              ? 'View badge details and requirements'
              : 'Update badge information and requirements'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Badge Name</Label>
            {mode === 'view' ? (
              <p className='text-zinc-300 p-2 bg-zinc-900/50 rounded-md border border-zinc-800'>
                {badge?.name}
              </p>
            ) : (
              <Input
                id='name'
                className='bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-500 text-zinc-100'
                {...form.register('name')}
              />
            )}
            {form.formState.errors.name && mode === 'edit' && (
              <p className='text-xs text-red-500 mt-1'>{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            {mode === 'view' ? (
              <p className='text-zinc-300 p-2 bg-zinc-900/50 rounded-md border border-zinc-800 min-h-[80px]'>
                {badge?.description}
              </p>
            ) : (
              <Textarea
                id='description'
                className='bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-500 text-zinc-100 min-h-[80px]'
                {...form.register('description')}
              />
            )}
            {form.formState.errors.description && mode === 'edit' && (
              <p className='text-xs text-red-500 mt-1'>
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='category'>Category</Label>
            {mode === 'view' ? (
              <p className='text-zinc-300 p-2 bg-zinc-900/50 rounded-md border border-zinc-800'>
                {badge?.category && getCategoryLabel(badge.category)}
              </p>
            ) : (
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
            )}
            {form.formState.errors.category && mode === 'edit' && (
              <p className='text-xs text-red-500 mt-1'>{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='requirement'>Requirement</Label>
            {mode === 'view' ? (
              <p className='text-zinc-300 p-2 bg-zinc-900/50 rounded-md border border-zinc-800'>
                {badge?.requirement && getRequirementLabel(badge.requirement)}
              </p>
            ) : (
              <Controller
                control={form.control}
                name='requirement'
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className='bg-zinc-900/50 border-zinc-800 focus:ring-zinc-500 text-zinc-100'>
                      <SelectValue placeholder='Select requirement' />
                    </SelectTrigger>
                    <SelectContent className='bg-zinc-900 border-zinc-800 text-zinc-100'>
                      <SelectItem value={BadgeRequirement.CURRENT_STREAK}>
                        Current Streak
                      </SelectItem>
                      <SelectItem value={BadgeRequirement.MAX_STREAK}>Max Streak</SelectItem>
                      <SelectItem value={BadgeRequirement.POSTS_COUNT}>Posts Count</SelectItem>
                      <SelectItem value={BadgeRequirement.COMMENTS_COUNT}>
                        Comments Count
                      </SelectItem>
                      <SelectItem value={BadgeRequirement.UPVOTES_RECEIVED_COUNT}>
                        Upvotes Received
                      </SelectItem>
                      <SelectItem value={BadgeRequirement.VOTES_CAST_COUNT}>Votes Cast</SelectItem>
                      <SelectItem value={BadgeRequirement.COMMENTS_RECEIVED_COUNT}>
                        Comments Received
                      </SelectItem>
                      <SelectItem value={BadgeRequirement.MAX_COMMENT_UPVOTES}>
                        Max Comment Upvotes
                      </SelectItem>
                      <SelectItem value={BadgeRequirement.MAX_POST_UPVOTES}>
                        Max Post Upvotes
                      </SelectItem>
                      <SelectItem value={BadgeRequirement.TOP_PERCENT_WEEKLY}>
                        Top Percent Weekly
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {form.formState.errors.requirement && mode === 'edit' && (
              <p className='text-xs text-red-500 mt-1'>
                {form.formState.errors.requirement.message}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='thresholdValue'>Threshold Value</Label>
            {mode === 'view' ? (
              <p className='text-zinc-300 p-2 bg-zinc-900/50 rounded-md border border-zinc-800'>
                {badge?.thresholdValue}
              </p>
            ) : (
              <Input
                id='thresholdValue'
                type='number'
                className='bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-500 text-zinc-100'
                {...form.register('thresholdValue', { valueAsNumber: true })}
              />
            )}
            {form.formState.errors.thresholdValue && mode === 'edit' && (
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
                {badge?.isActive
                  ? 'Active and available for users to earn'
                  : 'Inactive and not available'}
              </p>
            </div>
            {mode === 'view' ? (
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  badge?.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                {badge?.isActive ? 'Active' : 'Inactive'}
              </div>
            ) : (
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
            )}
          </div>

          {mode === 'view' ? (
            <DialogFooter className='pt-4'>
              <Button
                type='button'
                onClick={() => onOpenChange(false)}
                className='bg-zinc-800 hover:bg-zinc-700 text-zinc-100'>
                Close
              </Button>
            </DialogFooter>
          ) : (
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
