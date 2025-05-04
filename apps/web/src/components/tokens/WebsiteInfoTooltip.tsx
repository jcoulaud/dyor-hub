import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { ExternalLink, Globe } from 'lucide-react';
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

interface RdapLink {
  rel: string;
  href: string;
  type?: string;
  value?: string;
}

interface RdapResponse {
  events?: DomainEvent[];
  links?: RdapLink[];
  objectClassName?: string;
  handle?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  entities?: unknown[];
  notices?: unknown[];
  rdapConformance?: string[];
  secureDNS?: unknown;
  nameservers?: unknown[];
}

const RDAP_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';

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
  const rdapLookupUrl = `https://client.rdap.org/?type=domain&object=${encodeURIComponent(domain)}`;

  useEffect(() => {
    const findRdapService = async (domain: string, tld: string) => {
      try {
        // Use IANA bootstrap service to find the correct RDAP server
        const bootstrapResponse = await fetch(RDAP_BOOTSTRAP_URL);
        if (!bootstrapResponse.ok) {
          throw new Error('Bootstrap service unavailable');
        }

        const bootstrapData = await bootstrapResponse.json();

        // Look for matching TLD in the bootstrap data
        let baseUrl = null;
        if (bootstrapData.services && Array.isArray(bootstrapData.services)) {
          for (const service of bootstrapData.services) {
            if (Array.isArray(service[0]) && service[0].includes(tld)) {
              baseUrl = service[1][0];
              break;
            }
          }
        }

        if (baseUrl) {
          if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
          }
          return `${baseUrl}domain/${domain}`;
        }

        return null;
      } catch (error) {
        console.error('Error finding RDAP service:', error);
        return null;
      }
    };

    const fetchDomainInfo = async () => {
      if (!domain || !tld) return;

      setLoading(true);
      setError(null);

      try {
        // Try to discover the appropriate RDAP server
        const rdapUrl = await findRdapService(domain, tld);

        if (!rdapUrl) {
          throw new Error('Could not determine the appropriate RDAP server');
        }

        const response = await fetch(rdapUrl);

        if (!response.ok) {
          // Handle redirects or references to other RDAP servers
          if (response.status === 301 || response.status === 302 || response.status === 303) {
            const redirectUrl = response.headers.get('Location');
            if (redirectUrl) {
              const redirectResponse = await fetch(redirectUrl);
              if (!redirectResponse.ok) {
                throw new Error('Failed to fetch from redirect');
              }
              const data = await redirectResponse.json();
              processRdapData(data);
              return;
            }
          }
          throw new Error('Could not fetch domain information');
        }

        const data = await response.json();
        processRdapData(data);
      } catch {
        setError('We could not fetch the registration information for this domain');
      } finally {
        setLoading(false);
      }
    };

    const processRdapData = (data: RdapResponse) => {
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
      } else if (data.links && Array.isArray(data.links)) {
        // Some RDAP servers respond with links to the actual data
        const relatedLink = data.links.find(
          (link: RdapLink) => link.rel === 'related' && link.href && link.href.includes('/domain/'),
        );

        if (relatedLink && relatedLink.href) {
          fetch(relatedLink.href)
            .then((response) => {
              if (!response.ok) throw new Error('Failed to fetch from related link');
              return response.json();
            })
            .then((relatedData: RdapResponse) => {
              processRdapData(relatedData);
            })
            .catch(() => {
              setError('We could not fetch the registration information for this domain');
            });
          return;
        }

        setError('No domain registration information available');
      } else {
        setError('No domain registration information available');
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
                  <div className='space-y-3'>
                    <div className='text-xs text-zinc-400 py-2'>{error}</div>
                    <div className='pt-2 border-t border-zinc-800'>
                      <Link
                        href={rdapLookupUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center justify-center gap-1.5 w-full text-xs text-blue-400 py-2 hover:text-blue-300'>
                        <span>Check on RDAP.org</span>
                        <ExternalLink className='h-3 w-3' />
                      </Link>
                    </div>
                  </div>
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
