'use client';

import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthModal } from './AuthModal';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasShownToast.current) {
      setIsAuthModalOpen(true);
      toast({
        title: 'Authentication Required',
        description: 'You need to be logged in to access this page',
        variant: 'destructive',
      });
      hasShownToast.current = true;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleAuthModalClose = () => {
    setIsAuthModalOpen(false);
    if (!isAuthenticated) {
      router.push('/');
    }
  };

  // Show nothing while loading to prevent flash of content
  if (isLoading) {
    return null;
  }

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        onAuthSuccess={async () => {
          // Just close the modal, page will refresh
        }}
      />
    );
  }

  // Show children if authenticated
  return <>{children}</>;
}
