import { ToasterContext, type ToastProps } from '@/components/ui/toast';
import { useCallback, useContext } from 'react';

export function useToast() {
  const context = useContext(ToasterContext);

  const toast = useCallback(
    (props: ToastProps) => {
      if (context) {
        context.addToast(props);
      }
      // Context missing - toast will silently fail in production
      // This happens when useToast is called outside of a Toaster component
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
