'use client';

import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

const CustomDialogContent = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogContent>) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-[95%] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:w-full sm:max-w-2xl sm:rounded-lg',
        'p-0 gap-0 border-0 overflow-hidden',
        className,
      )}
      {...props}>
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
);

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <CustomDialogContent>
        <button
          onClick={onClose}
          className='absolute right-6 top-3 z-10 rounded-full bg-black/40 p-1.5 
                    backdrop-blur-sm text-white hover:bg-black/60 transition-colors 
                    cursor-pointer ring-offset-background focus:outline-none 
                    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          aria-label='Close feedback form'>
          <X className='h-5 w-5' />
        </button>

        <div className='relative w-full h-[85vh] min-h-[600px]'>
          {isLoading && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
              <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500'></div>
            </div>
          )}
          <iframe
            src='https://insigh.to/b/dyor-hub'
            className='w-full h-full border-0'
            onLoad={handleIframeLoad}
            title='Feedback Form'
          />
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}
