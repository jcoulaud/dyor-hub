import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { Globe } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface WebsiteInfoTooltipProps {
  websiteUrl: string;
  className?: string;
}

interface DomainInfo {
  registered: string;
  expires: string;
  lastUpdated: string;
}

interface DomainEvent {
  eventAction: string;
  eventDate: string;
}

// Map of TLDs to their RDAP servers
const RDAP_SERVERS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1',
  net: 'https://rdap.verisign.com/net/v1',
  org: 'https://rdap.publicinterestregistry.org/rdap',
  io: 'https://rdap.centralnic.com/io',
  xyz: 'https://rdap.centralnic.com/xyz',
  app: 'https://www.registry.google/rdap',
  dev: 'https://www.registry.google/rdap',
  ai: 'https://rdap.centralnic.com/ai',
};

const formatDate = (dateString: string): string => {
  try {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    return format(parseISO(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
};

export const WebsiteInfoTooltip = ({ websiteUrl, className = '' }: WebsiteInfoTooltipProps) => {
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  const getDomain = (url: string) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const domain = new URL(fullUrl).hostname;
      return domain.startsWith('www.') ? domain.substring(4) : domain;
    } catch {
      return url;
    }
  };

  const domain = getDomain(websiteUrl);
  const domainParts = domain.split('.');
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1].toLowerCase() : '';

  useEffect(() => {
    const fetchDomainInfo = async () => {
      if (!domain || !tld) return;

      setLoading(true);
      setError(null);

      try {
        const rdapBase = RDAP_SERVERS[tld] || `https://rdap.centralnic.com/${tld}`;
        const rdapUrl = `${rdapBase}/domain/${domain}`;

        const response = await fetch(rdapUrl);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Domain not found in RDAP registry');
          } else {
            throw new Error(`Failed to fetch domain info: ${response.status}`);
          }
        }

        const data = await response.json();

        if (data.events && Array.isArray(data.events)) {
          const registrationEvent = data.events.find(
            (event: DomainEvent) => event.eventAction === 'registration',
          );
          const expirationEvent = data.events.find(
            (event: DomainEvent) => event.eventAction === 'expiration',
          );
          const lastChangedEvent = data.events.find(
            (event: DomainEvent) =>
              event.eventAction === 'last changed' ||
              event.eventAction === 'last update of RDAP database',
          );

          setDomainInfo({
            registered: registrationEvent?.eventDate || 'Unknown',
            expires: expirationEvent?.eventDate || 'Unknown',
            lastUpdated: lastChangedEvent?.eventDate || 'Unknown',
          });
        } else {
          setError('No domain event information available');
        }
      } catch (err) {
        console.error('Error fetching domain info:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Could not fetch domain information';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDomainInfo();
  }, [domain, tld]);

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
    if (isMobile) {
      e.preventDefault();
      setShowMobileTooltip(!showMobileTooltip);
    }
  };

  // Handle link navigation for mobile
  const handleLinkClick = (e: React.MouseEvent) => {
    if (isMobile && !showMobileTooltip) {
      e.preventDefault();
    }
  };

  return (
    <div className='relative'>
      <TooltipProvider>
        <Tooltip delayDuration={300} open={isMobile ? showMobileTooltip : undefined}>
          <TooltipTrigger asChild>
            <Link
              href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
              target='_blank'
              rel='noopener noreferrer'
              className={`flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 ${className}`}
              title='Website'
              onClick={handleLinkClick}
              onTouchStart={handleTouch}>
              <Globe className='w-4 h-4 text-blue-400' />
            </Link>
          </TooltipTrigger>
          <TooltipContent
            side='bottom'
            align='center'
            className='p-0 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-lg'>
            <div className='w-[280px] overflow-auto'>
              <div className='p-3 border-b border-zinc-800'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-zinc-300'>Domain Information</span>
                  <div className='text-xs text-zinc-500'>{domain}</div>
                </div>
              </div>

              <div className='p-4'>
                {loading ? (
                  <div className='flex items-center justify-center py-4'>
                    <div className='animate-spin h-4 w-4 border-2 border-blue-400 rounded-full border-t-transparent'></div>
                    <span className='ml-2 text-xs text-zinc-400'>Loading domain info...</span>
                  </div>
                ) : error ? (
                  <div className='text-xs text-zinc-400 py-2'>{error}</div>
                ) : domainInfo ? (
                  <div className='space-y-3'>
                    <div className='flex justify-between items-center'>
                      <span className='text-xs text-zinc-400'>Registered:</span>
                      <span className='text-xs font-medium text-zinc-300'>
                        {formatDate(domainInfo.registered)}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-xs text-zinc-400'>Expires:</span>
                      <span className='text-xs font-medium text-zinc-300'>
                        {formatDate(domainInfo.expires)}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-xs text-zinc-400'>Last Updated:</span>
                      <span className='text-xs font-medium text-zinc-300'>
                        {formatDate(domainInfo.lastUpdated)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className='text-xs text-zinc-400 py-2'>No domain information available</div>
                )}
              </div>

              {isMobile && (
                <div className='p-2 border-t border-zinc-800'>
                  <a
                    href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block w-full text-center text-xs font-medium text-blue-400 py-2 hover:text-blue-300'
                    onClick={() => setShowMobileTooltip(false)}>
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
