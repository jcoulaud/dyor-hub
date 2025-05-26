'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Define contest period constants (UTC)
const CONTEST_START_DATE_UTC = new Date(Date.UTC(2025, 4, 19, 0, 1, 0)); // May 19, 2025, 00:01 UTC
const CONTEST_END_DATE_UTC = new Date(Date.UTC(2025, 4, 25, 23, 59, 0)); // May 25, 2025, 23:59 UTC

export function TopBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [bannerText, setBannerText] = useState('');
  const [bannerLinkText, setBannerLinkText] = useState('Learn more');

  // Force hide the banner for now
  const isBannerEnabled = false;

  useEffect(() => {
    const dismissed = localStorage.getItem('topBannerDismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
      return;
    }

    const now = new Date();

    if (now < CONTEST_START_DATE_UTC) {
      setBannerText(
        '🏆 Token Call Contest is coming soon! Get ready to win SOL. Contest starts May 19th.',
      );
    } else if (now >= CONTEST_START_DATE_UTC && now <= CONTEST_END_DATE_UTC) {
      setBannerText('🏆 Token Call Contest is now live! Win up to 1 SOL for accurate predictions.');
    } else {
      setBannerText(
        '🏆 Token Call Contest has ended. Congratulations to all participants! Winners will be reviewed and announced this week.',
      );
      setBannerLinkText('Check FAQ for details');
    }
  }, []);

  const hideBanner = () => {
    setIsVisible(false);
    localStorage.setItem('topBannerDismissed', 'true');
  };

  // Return null if banner is disabled or not visible
  if (!isBannerEnabled || !isVisible || !bannerText) return null;

  return (
    <div className='w-full bg-indigo-600 text-white py-2 px-4 text-center relative'>
      <div className='container mx-auto'>
        <p className='text-sm font-medium'>
          {bannerText}{' '}
          <Link href='/faq?tab=contest' className='underline font-bold hover:text-indigo-100'>
            {bannerLinkText}
          </Link>
        </p>
        <button
          onClick={hideBanner}
          className='absolute top-1/2 right-4 transform -translate-y-1/2 text-white hover:text-indigo-100 cursor-pointer'
          aria-label='Dismiss banner'>
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}
