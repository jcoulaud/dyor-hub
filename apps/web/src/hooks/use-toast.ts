import { ToasterContext, type ToastProps } from '@/components/ui/toast';
import { useCallback, useContext } from 'react';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export function useToast() {
  const context = useContext(ToasterContext);

  const toast = useCallback(
    (props: ToastProps) => {
      if (context) {
        context.addToast(props);
      } else if (isBrowser) {
        console.warn('useToast was called outside of a Toaster component');
      }
    },
    [context],
  );

  const dismiss = useCallback(
    (toastId?: string) => {
      if (context && toastId) {
        context.removeToast(toastId);
      }
    },
    [context],
  );

  return { toast, dismiss };
}
