import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  placeholder?: string;
}

export function CommentInput({
  onSubmit,
  onCancel,
  className,
  autoFocus = false,
  submitLabel = 'Comment',
  placeholder = 'What are your thoughts?',
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mountedRef = useRef(true);

  // Ensure component is mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const expand = useCallback(() => {
    if (mountedRef.current) {
      setIsExpanded(true);
      // Ensure textarea gets focus when expanded
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, []);

  const collapse = useCallback(() => {
    if (mountedRef.current) {
      setIsExpanded(false);
    }
  }, []);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        formRef.current &&
        !formRef.current.contains(event.target as Node) &&
        !content.trim() &&
        !isSubmitting &&
        mountedRef.current
      ) {
        collapse();
      }
    },
    [content, isSubmitting, collapse],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Keep expanded state in sync with content
  useEffect(() => {
    if (content.trim() && mountedRef.current) {
      expand();
    }
  }, [content, expand]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);

      // Only proceed if component is still mounted
      if (mountedRef.current) {
        setContent('');
        // Keep expanded if focused
        if (document.activeElement !== textareaRef.current) {
          collapse();
        } else {
          // If still focused, ensure we're in expanded state
          expand();
        }
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = useCallback(() => {
    if (mountedRef.current) {
      setContent('');
      collapse();
      onCancel?.();
    }
  }, [collapse, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleSubmit();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSubmit, handleCancel],
  );

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className={cn('relative rounded-md border bg-background overflow-hidden', className)}>
      <div className='relative'>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={expand}
          placeholder={placeholder}
          className={cn(
            'resize-none transition-all duration-200 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 sm:p-3 pb-12',
            isExpanded
              ? 'min-h-[100px] sm:min-h-[120px]'
              : 'h-[34px] sm:h-[38px] min-h-0 py-1.5 sm:py-2',
          )}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
        />
        {isExpanded && (
          <div className='absolute bottom-0 right-0 p-1.5 sm:p-2 flex justify-end items-center gap-1.5 sm:gap-2'>
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
              disabled={!content.trim() || isSubmitting}
              className={cn(
                'rounded-full bg-primary hover:bg-primary/90 text-xs font-bold h-7 sm:h-8 px-3 sm:px-4',
                !content.trim() && 'opacity-50 cursor-not-allowed',
              )}>
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
