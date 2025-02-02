import { cn } from '@/lib/utils';
import { useState } from 'react';
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

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
      setIsExpanded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setIsExpanded(false);
    onCancel?.();
  };

  return (
    <div className={cn('relative rounded-md border bg-background overflow-hidden', className)}>
      <div className='relative'>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder={placeholder}
          className={cn(
            'resize-none transition-all duration-200 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-3 pb-12',
            isExpanded ? 'min-h-[120px]' : 'h-[38px] min-h-0 py-2',
          )}
          autoFocus={autoFocus}
        />
        {isExpanded && (
          <div className='absolute bottom-0 right-0 p-2 flex justify-end items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleCancel}
              disabled={isSubmitting}
              className='text-xs font-medium hover:bg-transparent hover:text-muted-foreground'>
              Cancel
            </Button>
            <Button
              size='sm'
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className={cn(
                'rounded-full bg-primary hover:bg-primary/90 text-xs font-bold px-4',
                !content.trim() && 'opacity-50 cursor-not-allowed',
              )}>
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
