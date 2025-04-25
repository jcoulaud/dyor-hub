'use client';

import { AuthModal } from '@/components/auth/AuthModal';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface ModalContextProps {
  isAuthModalOpen: boolean;
  referralCodeForModal: string | null;
  openAuthModal: (options?: { referralCode?: string | null }) => void;
  closeAuthModal: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [referralCodeForModal, setReferralCodeForModal] = useState<string | null>(null);

  const openAuthModal = useCallback((options?: { referralCode?: string | null }) => {
    // Check localStorage again when opening, in case user closed initial popup
    const codeFromStorage = localStorage.getItem('pendingReferralCode');
    setReferralCodeForModal(options?.referralCode ?? codeFromStorage);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setReferralCodeForModal(null);
  }, []);

  const value = {
    isAuthModalOpen,
    referralCodeForModal,
    openAuthModal,
    closeAuthModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextProps {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
