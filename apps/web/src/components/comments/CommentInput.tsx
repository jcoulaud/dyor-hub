'use client';

import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { COMMENT_MAX_LENGTH } from '@dyor-hub/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { RichTextEditor } from '../ui/rich-text-editor';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  placeholder?: string;
  variant?: 'main' | 'reply';
  onAuthRequired?: () => void;
  content?: string;
}

export function CommentInput({
  onSubmit,
  onCancel,
  className,
  autoFocus = false,
  submitLabel = 'Comment',
  placeholder,
  variant = 'main',
  onAuthRequired,
  content: initialContent = '',
}: CommentInputProps) {
  const { isAuthenticated } = useAuthContext();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(variant === 'reply');
  const formRef = useRef<HTMLFormElement>(null);
  const mountedRef = useRef(true);
  const { toast } = useToast();

  const defaultPlaceholder = variant === 'main' ? 'Add a comment' : 'Write a reply...';
  const actualPlaceholder = placeholder ?? defaultPlaceholder;

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);

      if (mountedRef.current) {
        setContent('');
        if (variant === 'main') {
          setIsExpanded(false);
        }
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      const description =
        error instanceof ApiError
          ? error.message
          : 'An unexpected error occurred. Please try again.';
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: description,
      });
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [content, isAuthenticated, isSubmitting, onAuthRequired, onSubmit, variant, toast]);

  const handleCancel = useCallback(() => {
    if (mountedRef.current) {
      setContent('');
      if (variant === 'main') {
        setIsExpanded(false);
      }
      onCancel?.();
    }
  }, [onCancel, variant]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExpanded && variant !== 'reply') return;

      if (!formRef.current?.contains(document.activeElement)) return;

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (content.trim() && !isSubmitting) {
          void handleSubmit();
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, isSubmitting, isExpanded, variant, handleCancel, handleSubmit]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (variant === 'reply') {
      setIsExpanded(true);
    }
  }, [variant]);

  const handleInputClick = () => {
    if (!isAuthenticated) {
      onAuthRequired?.();
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className={cn('relative', className)}>
      <div
        className={cn(
          'relative flex flex-col border bg-zinc-900/40 backdrop-blur-sm border-zinc-700/50 overflow-hidden transition-all duration-200 ease-in-out hover:bg-zinc-900/60 hover:border-zinc-600/60',
          variant === 'main' && !isExpanded ? 'rounded-2xl' : 'rounded-xl',
        )}
        onClick={handleInputClick}>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder={actualPlaceholder}
          maxLength={COMMENT_MAX_LENGTH}
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
          variant={variant}
          autoFocus={autoFocus || variant === 'reply'}
          readOnly={!isAuthenticated}
          className={cn(
            variant === 'main'
              ? isExpanded
                ? 'min-h-[60px] max-h-[600px] p-3'
                : 'h-[34px] sm:h-[38px] min-h-0 px-4 py-2'
              : 'min-h-[60px] max-h-[600px] p-3',
            !isAuthenticated && 'cursor-pointer',
          )}
        />
        {(variant === 'reply' || isExpanded) && (
          <div className='p-1.5 sm:p-2 flex justify-between items-center w-full bg-zinc-900/30 border-t border-zinc-700/30'>
            <div className='text-xs text-muted-foreground'>
              {content.length}/{COMMENT_MAX_LENGTH} characters
            </div>
            <div className='flex items-center gap-1.5 sm:gap-2'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleCancel}
                disabled={isSubmitting}
                className='text-xs font-medium hover:bg-transparent hover:text-muted-foreground h-7 sm:h-8 px-2 sm:px-3'>
                Cancel
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={!isAuthenticated || !content.trim() || isSubmitting}
                className={cn(
                  'rounded-full bg-primary hover:bg-primary/90 text-xs font-bold h-7 sm:h-8 px-3 sm:px-4',
                  (!isAuthenticated || !content.trim()) && 'opacity-50 cursor-not-allowed',
                )}>
                {submitLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
