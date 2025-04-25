'use client';

import { useAuthContext } from '@/providers/auth-provider';
import { useModal } from '@/providers/modal-provider';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function ReferralHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthContext();
  const { openAuthModal } = useModal();
  const processedRefCode = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || isAuthenticated) {
      return;
    }

    const refCode = searchParams.get('ref');

    if (refCode && refCode !== processedRefCode.current) {
      processedRefCode.current = refCode;

      localStorage.setItem('pendingReferralCode', refCode);

      openAuthModal();

      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('ref');
      const newPath = `${pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
      router.replace(newPath, { scroll: false });
      console.log('Stored referral code, called openAuthModal, and cleaned URL.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated, openAuthModal]);

  return null;
}
