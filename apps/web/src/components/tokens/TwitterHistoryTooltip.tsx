import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TwitterUsernameHistoryEntity } from '@dyor-hub/types';
import { format, formatDistanceStrict } from 'date-fns';
import { Twitter } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TwitterHistoryTooltipProps {
  twitterHandle: string;
  twitterHistory?: TwitterUsernameHistoryEntity | null;
  className?: string;
}

const formatDateSafe = (
  dateString: string | Date | undefined | null,
  formatType: 'distance' | 'format' = 'distance',
  formatPattern = 'PPp',
): string => {
  try {
    if (!dateString) return 'Unknown';

    if (typeof dateString === 'object' && dateString !== null && !(dateString instanceof Date)) {
      return 'Invalid date';
    }

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) return 'Invalid date';

    if (formatType === 'distance') {
      return formatDistanceStrict(date, new Date()) + ' ago';
    } else {
      return format(date, formatPattern);
    }
  } catch {
    return 'Invalid date';
  }
};

export const TwitterHistoryTooltip = ({
  twitterHandle,
  twitterHistory,
  className = '',
}: TwitterHistoryTooltipProps) => {
  const hasHistory = twitterHistory?.history && twitterHistory.history.length > 0;

  // State to manage mobile tooltip visibility
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle touch events for mobile
  const handleTouch = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMobile && hasHistory) {
      e.preventDefault();
      setShowMobileTooltip(!showMobileTooltip);
    }
  };

  // Handle link navigation for mobile
  const handleLinkClick = (e: React.MouseEvent) => {
    if (isMobile && hasHistory && !showMobileTooltip) {
      e.preventDefault();
    }
  };

  return (
    <div className='relative'>
      <TooltipProvider>
        <Tooltip delayDuration={300} open={isMobile ? showMobileTooltip : undefined}>
          <TooltipTrigger asChild>
            <Link
              href={`https://twitter.com/${twitterHandle}`}
              target='_blank'
              rel='noopener noreferrer'
              className={`flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 ${className}`}
              title='Twitter'
              onClick={handleLinkClick}
              onTouchStart={handleTouch}>
              <Twitter className={`w-4 h-4 ${hasHistory ? 'text-red-400' : 'text-blue-400'}`} />
            </Link>
          </TooltipTrigger>
          {hasHistory && (
            <TooltipContent
              side='bottom'
              align='center'
              className='p-0 bg-zinc-900/95 border border-zinc-700/50 rounded-lg shadow-lg'>
              <div className='w-[280px] max-h-80 overflow-auto'>
                <div className='p-3 border-b border-zinc-800'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold text-zinc-300'>Twitter History</span>
                    <div className='text-xs text-zinc-500'>@{twitterHandle}</div>
                  </div>
                </div>
                <div className='p-2'>
                  {twitterHistory?.history &&
                    Array.isArray(twitterHistory.history) &&
                    [...twitterHistory.history].reverse().map((entry, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between py-1.5 px-2 hover:bg-zinc-800/50 rounded-md'>
                        <span className='text-sm font-medium text-red-400'>@{entry.username}</span>
                        <span className='text-xs text-zinc-500'>
                          {formatDateSafe(entry.last_checked)}
                        </span>
                      </div>
                    ))}
                </div>
                {isMobile && (
                  <div className='p-2 border-t border-zinc-800'>
                    <a
                      href={`https://twitter.com/${twitterHandle}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='block w-full text-center text-xs font-medium text-blue-400 py-2 hover:text-blue-300'
                      onClick={() => setShowMobileTooltip(false)}>
                      Visit Twitter Profile
                    </a>
                  </div>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
