import { ToasterContext, type ToastProps } from '@/components/ui/toast';
import { useCallback, useContext } from 'react';

export function useToast() {
  const context = useContext(ToasterContext);
  if (!context) {
    throw new Error('useToast must be used within a Toaster component');
  }

  const toast = useCallback(
    (props: ToastProps) => {
      context.addToast(props);
    },
    [context],
  );

  return {
    toast,
    dismiss: context.removeToast,
  } as const;
}
