'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TokenCallListFilters, TokenCallListSort, tokenCalls } from '@/lib/api';
import { cn, formatPrice, getHighResAvatar } from '@/lib/utils';
import { TokenCall, TokenCallSortBy, TokenCallStatus } from '@dyor-hub/types';
import { formatDistanceStrict, isValid, parseISO } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  HelpCircle,
  Loader2,
  Search,
  Slash,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { useDebounce } from 'use-debounce';

const CALLS_PER_PAGE = 25;

const getStatusIcon = (status: TokenCallStatus) => {
  switch (status) {
    case TokenCallStatus.VERIFIED_SUCCESS:
      return <CheckCircle className='w-full h-full' />;
    case TokenCallStatus.VERIFIED_FAIL:
      return <XCircle className='w-full h-full' />;
    case TokenCallStatus.PENDING:
      return <Clock className='w-full h-full' />;
    case TokenCallStatus.ERROR:
      return <Slash className='w-full h-full' />;
    default:
      return <HelpCircle className='w-full h-full' />;
  }
};

export default function TokenCallsExplorerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [calls, setCalls] = useState<TokenCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize page from URL or default to 1
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  const [totalPages, setTotalPages] = useState(1);

  // Initialize tab from URL or default to 'all'
  const [activeTab, setActiveTab] = useState<string>(() => {
    return searchParams.get('tab') || 'all';
  });

  // Initialize filters from URL
  const [usernameFilter, setUsernameFilter] = useState(() => searchParams.get('username') || '');
  const [tokenSearchFilter, setTokenSearchFilter] = useState(
    () => searchParams.get('tokenSearch') || '',
  );

  // Initialize statuses from URL
  const [selectedStatuses, setSelectedStatuses] = useState<TokenCallStatus[]>(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      return statusParam.split(',').map((s) => s as TokenCallStatus);
    }
    return [];
  });

  // Initialize date range from URL
  const [targetDateRange, setTargetDateRange] = useState<DateRange | undefined>(() => {
    const startDate = searchParams.get('targetStartDate');
    const endDate = searchParams.get('targetEndDate');

    if (startDate || endDate) {
      const range: Partial<DateRange> = {};

      if (startDate) {
        const parsedStartDate = parseISO(startDate);
        if (isValid(parsedStartDate)) {
          range.from = parsedStartDate;
        }
      }

      if (endDate) {
        const parsedEndDate = parseISO(endDate);
        if (isValid(parsedEndDate)) {
          range.to = parsedEndDate;
        }
      }

      return Object.keys(range).length > 0 ? (range as DateRange) : undefined;
    }

    return undefined;
  });

  const [debouncedUsernameFilter] = useDebounce(usernameFilter, 500);
  const [debouncedTokenSearchFilter] = useDebounce(tokenSearchFilter, 500);

  // Initialize sort from URL
  const [sortBy, setSortBy] = useState<TokenCallSortBy>(() => {
    const sortByParam = searchParams.get('sortBy');
    if (sortByParam && Object.values(TokenCallSortBy).includes(sortByParam as TokenCallSortBy)) {
      return sortByParam as TokenCallSortBy;
    }
    return TokenCallSortBy.CREATED_AT;
  });

  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(() => {
    const sortOrderParam = searchParams.get('sortOrder');
    return sortOrderParam === 'ASC' || sortOrderParam === 'DESC' ? sortOrderParam : 'DESC';
  });

  // Update URL with current filters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    // Only add parameters that have values
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (debouncedUsernameFilter) params.set('username', debouncedUsernameFilter);
    if (debouncedTokenSearchFilter) params.set('tokenSearch', debouncedTokenSearchFilter);

    if (selectedStatuses.length > 0) {
      params.set('status', selectedStatuses.join(','));
    }

    if (targetDateRange?.from) {
      params.set('targetStartDate', targetDateRange.from.toISOString().split('T')[0]);
    }

    if (targetDateRange?.to) {
      params.set('targetEndDate', targetDateRange.to.toISOString().split('T')[0]);
    }

    if (sortBy !== TokenCallSortBy.CREATED_AT) {
      params.set('sortBy', sortBy);
    }

    if (sortOrder !== 'DESC') {
      params.set('sortOrder', sortOrder);
    }

    // Update the URL without refreshing the page
    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
    router.replace(newUrl, { scroll: false });
  }, [
    currentPage,
    activeTab,
    debouncedUsernameFilter,
    debouncedTokenSearchFilter,
    selectedStatuses,
    targetDateRange,
    sortBy,
    sortOrder,
    router,
  ]);

  const fetchTokenCalls = useCallback(
    async (page: number, filters: TokenCallListFilters, sort: TokenCallListSort) => {
      setIsLoading(true);
      setError(null);
      try {
        const apiFilters: TokenCallListFilters = {
          username: filters.username || undefined,
          tokenSearch: filters.tokenSearch || undefined,
          status: filters.status?.length ? filters.status : undefined,
          targetStartDate: filters.targetStartDate || undefined,
          targetEndDate: filters.targetEndDate || undefined,
        };
        const apiSort = {
          sortBy: sort.sortBy,
          sortOrder: sort.sortOrder,
        };

        const result = await tokenCalls.list(apiFilters, { page, limit: CALLS_PER_PAGE }, apiSort);
        setCalls(result.items || []);
        setTotalPages(Math.ceil((result.total || 0) / CALLS_PER_PAGE));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load token calls.');
        setCalls([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let newStatuses: TokenCallStatus[] = [];

    switch (activeTab) {
      case 'pending':
        newStatuses = [TokenCallStatus.PENDING];
        break;
      case 'success':
        newStatuses = [TokenCallStatus.VERIFIED_SUCCESS];
        break;
      case 'failed':
        newStatuses = [TokenCallStatus.VERIFIED_FAIL];
        break;
      case 'all':
      default:
        newStatuses = [];
        break;
    }

    setSelectedStatuses(newStatuses);
  }, [activeTab]);

  useEffect(() => {
    const currentFilters: TokenCallListFilters = {
      username: debouncedUsernameFilter,
      tokenSearch: debouncedTokenSearchFilter,
      status: selectedStatuses,
      targetStartDate: targetDateRange?.from?.toISOString(),
      targetEndDate: targetDateRange?.to?.toISOString(),
    };
    const currentSort: TokenCallListSort = { sortBy, sortOrder };

    fetchTokenCalls(currentPage, currentFilters, currentSort);
  }, [
    currentPage,
    debouncedUsernameFilter,
    debouncedTokenSearchFilter,
    selectedStatuses,
    targetDateRange,
    sortBy,
    sortOrder,
    fetchTokenCalls,
  ]);

  useEffect(() => {
    updateUrlParams();
  }, [
    currentPage,
    activeTab,
    debouncedUsernameFilter,
    debouncedTokenSearchFilter,
    selectedStatuses,
    targetDateRange,
    sortBy,
    sortOrder,
    updateUrlParams,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedUsernameFilter,
    debouncedTokenSearchFilter,
    selectedStatuses,
    targetDateRange,
    sortBy,
    sortOrder,
  ]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleUsernameFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsernameFilter(event.target.value);
  };

  const handleTokenSearchFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTokenSearchFilter(event.target.value);
  };

  const handleTargetDateRangeChange = (range: DateRange | undefined) => {
    setTargetDateRange(range);
  };

  const clearTargetDateRange = () => setTargetDateRange(undefined);

  const handleSortClick = (field: TokenCallSortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const clearFilters = () => {
    setUsernameFilter('');
    setTokenSearchFilter('');
    setSelectedStatuses([]);
    setTargetDateRange(undefined);
    setSortBy(TokenCallSortBy.CREATED_AT);
    setSortOrder('DESC');
    setCurrentPage(1);
    setActiveTab('all');
  };

  const calculateMultiplier = (reference: number, target: number) => {
    if (reference <= 0) return null;
    return target / reference;
  };

  const formatRelativeDateSafe = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '-';
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return formatDistanceStrict(date, new Date(), { addSuffix: true });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const formatTargetDate = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '-';
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      const now = new Date();

      // If target date is in the past, display the actual date
      if (date < now) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }

      // Otherwise show relative time
      return formatDistanceStrict(date, now, { addSuffix: true });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const formatCurrency = (price: number | undefined | null): string => {
    if (price === undefined || price === null) return 'N/A';
    return `$${formatPrice(price)}`;
  };

  const renderSortIcon = (field: TokenCallSortBy) => {
    if (sortBy !== field) {
      return <ArrowUpDown className='ml-2 h-3 w-3 text-zinc-600' />;
    }
    return sortOrder === 'ASC' ? (
      <ArrowUp className='ml-2 h-3 w-3 text-white' />
    ) : (
      <ArrowDown className='ml-2 h-3 w-3 text-white' />
    );
  };

  return (
    <div className='container mx-auto px-2 sm:px-4 py-6 sm:py-12'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-center text-gradient-emerald'>
          Token Calls Explorer
        </h1>
        <p className='text-zinc-400 mb-6 sm:mb-8 text-center max-w-2xl mx-auto text-sm sm:text-base'>
          Browse all token price predictions made by the community.
        </p>

        <div className='mb-6'>
          <Card className='bg-zinc-900/40 border-zinc-800 shadow-lg overflow-visible'>
            <CardContent className='p-0'>
              <div className='flex items-center justify-between p-3 border-b border-zinc-800'>
                <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
                  <TabsList className='bg-zinc-800/50 grid grid-cols-4 p-1 h-10'>
                    <TabsTrigger
                      value='all'
                      className='data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600/20 data-[state=active]:to-amber-900/30 hover:bg-zinc-700/40 transition-colors text-[11px] xs:text-xs sm:text-sm h-full'>
                      All Calls
                    </TabsTrigger>
                    <TabsTrigger
                      value='pending'
                      className='data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600/20 data-[state=active]:to-yellow-900/30 hover:bg-zinc-700/40 transition-colors text-[11px] xs:text-xs sm:text-sm h-full'>
                      Pending
                    </TabsTrigger>
                    <TabsTrigger
                      value='success'
                      className='data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600/20 data-[state=active]:to-green-900/30 hover:bg-zinc-700/40 transition-colors text-[11px] xs:text-xs sm:text-sm h-full'>
                      Successful
                    </TabsTrigger>
                    <TabsTrigger
                      value='failed'
                      className='data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600/20 data-[state=active]:to-red-900/30 hover:bg-zinc-700/40 transition-colors text-[11px] xs:text-xs sm:text-sm h-full'>
                      Failed
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearFilters}
                  className='ml-2 bg-zinc-800/50 h-10 flex-shrink-0 hidden xs:flex'>
                  <XCircle className='h-4 w-4 mr-2' />
                  Clear Filters
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={clearFilters}
                  className='ml-2 bg-zinc-800/50 h-10 w-10 flex-shrink-0 flex xs:hidden'>
                  <XCircle className='h-4 w-4' />
                </Button>
              </div>

              {/* Search Inputs */}
              <div className='px-3 pt-4 pb-4 border-b border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center sm:gap-3'>
                <div className='relative w-full sm:w-64 md:w-72'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500' />
                  <Input
                    placeholder='Search user...'
                    value={usernameFilter}
                    onChange={handleUsernameFilterChange}
                    className='pl-10 h-11 sm:h-12 bg-zinc-900/90 border-zinc-800 rounded-lg text-sm text-zinc-300 w-full'
                  />
                </div>
                <div className='relative w-full sm:w-64 md:w-72 mt-4 sm:mt-0 mb-1 sm:mb-0'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500' />
                  <Input
                    placeholder='Search token...'
                    value={tokenSearchFilter}
                    onChange={handleTokenSearchFilterChange}
                    className='pl-10 h-11 sm:h-12 bg-zinc-900/90 border-zinc-800 rounded-lg text-sm text-zinc-300 w-full'
                  />
                </div>
                <div className='relative sm:ml-auto sm:mt-0 w-full sm:w-auto hidden sm:block'>
                  <div className='flex items-center justify-center sm:justify-end'>
                    <DateRangePicker
                      date={targetDateRange}
                      onDateChange={handleTargetDateRangeChange}
                      className='border-0 [&_button]:border-0'
                    />
                    {targetDateRange && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 ml-1 text-zinc-500 hover:text-white hover:bg-zinc-700/50 rounded-full'
                        onClick={clearTargetDateRange}
                        aria-label='Clear target date range'>
                        <X className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {isLoading && (
                <div className='flex items-center justify-center h-64'>
                  <Loader2 className='h-8 w-8 text-amber-500 animate-spin' />
                </div>
              )}

              {!isLoading && error && (
                <div className='p-6 text-center text-red-400 bg-red-950/30'>
                  Error loading data: {error}
                </div>
              )}

              {!isLoading && !error && calls.length === 0 && (
                <div className='p-10 text-center text-zinc-500'>
                  <Filter className='h-12 w-12 mx-auto mb-4 text-zinc-700' />
                  No token calls found matching your criteria.
                </div>
              )}

              {!isLoading && !error && calls.length > 0 && (
                <div className='overflow-x-auto'>
                  <Table className='w-full min-w-[650px]'>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent border-zinc-800'>
                        <TableHead className='px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap'>
                          User
                        </TableHead>
                        <TableHead className='px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap'>
                          Token
                        </TableHead>
                        <TableHead className='px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap'>
                          Status
                        </TableHead>
                        <TableHead
                          className='px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white transition-colors hidden sm:table-cell'
                          onClick={() => handleSortClick(TokenCallSortBy.REFERENCE_PRICE)}>
                          <div className='flex items-center justify-end'>
                            Reference {renderSortIcon(TokenCallSortBy.REFERENCE_PRICE)}
                          </div>
                        </TableHead>
                        <TableHead
                          className='px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white transition-colors'
                          onClick={() => handleSortClick(TokenCallSortBy.TARGET_PRICE)}>
                          <div className='flex items-center justify-end'>
                            Target {renderSortIcon(TokenCallSortBy.TARGET_PRICE)}
                          </div>
                        </TableHead>
                        <TableHead
                          className='px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white transition-colors'
                          onClick={() => handleSortClick(TokenCallSortBy.MULTIPLIER)}>
                          <div className='flex items-center justify-center'>
                            Change {renderSortIcon(TokenCallSortBy.MULTIPLIER)}
                          </div>
                        </TableHead>
                        <TableHead
                          className='px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white transition-colors'
                          onClick={() => handleSortClick(TokenCallSortBy.CALL_TIMESTAMP)}>
                          <div className='flex items-center justify-end'>
                            Called {renderSortIcon(TokenCallSortBy.CALL_TIMESTAMP)}
                          </div>
                        </TableHead>
                        <TableHead
                          className='px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white transition-colors'
                          onClick={() => handleSortClick(TokenCallSortBy.TARGET_DATE)}>
                          <div className='flex items-center justify-end'>
                            Deadline {renderSortIcon(TokenCallSortBy.TARGET_DATE)}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='divide-y divide-zinc-800/50'>
                      {calls.map((call) => {
                        const multiplier = calculateMultiplier(
                          call.referencePrice,
                          call.targetPrice,
                        );
                        const isUp = multiplier !== null && multiplier > 1;

                        let userAvatarSrc: string | undefined = undefined;
                        if (call.user?.avatarUrl) {
                          userAvatarSrc = getHighResAvatar(call.user.avatarUrl);
                        }

                        let tokenImageSrc: string | undefined = undefined;
                        if (call.token?.imageUrl) {
                          tokenImageSrc = call.token.imageUrl;
                        }

                        return (
                          <TableRow
                            key={call.id}
                            className='hover:bg-zinc-800/40 transition-colors duration-150 bg-transparent border-0'>
                            <TableCell className='px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap'>
                              {call.user ? (
                                <Link
                                  href={`/users/${call.user.username}`}
                                  className='flex items-center gap-2 group'>
                                  <Avatar className='h-8 w-8 border border-zinc-700 group-hover:border-amber-500 transition-all group-hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]'>
                                    <AvatarImage src={userAvatarSrc} alt={call.user.displayName} />
                                    <AvatarFallback className='text-xs bg-zinc-800'>
                                      {call.user.username.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className='text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors truncate max-w-[80px] sm:max-w-[120px]'>
                                    {call.user.displayName}
                                  </span>
                                </Link>
                              ) : (
                                <span className='text-sm text-zinc-500'>Unknown User</span>
                              )}
                            </TableCell>

                            <TableCell className='px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap'>
                              {call.token ? (
                                <Link
                                  href={`/tokens/${call.token.mintAddress}`}
                                  className='group inline-flex items-center gap-2 rounded p-1 -m-1 transition-colors'>
                                  <Avatar className='h-8 w-8 border border-zinc-700 group-hover:border-amber-500 transition-all group-hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]'>
                                    <AvatarImage src={tokenImageSrc} alt={call.token.name} />
                                    <AvatarFallback className='text-xs bg-zinc-800'>
                                      {call.token.symbol.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className='flex flex-col'>
                                    <span className='text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors truncate max-w-[80px] sm:max-w-[120px]'>
                                      {call.token.name}
                                    </span>
                                    <span className='text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors'>
                                      ${call.token.symbol}
                                    </span>
                                  </div>
                                </Link>
                              ) : (
                                <span className='text-sm text-zinc-500'>Unknown Token</span>
                              )}
                            </TableCell>

                            <TableCell className='px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap'>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className='inline-flex items-center'>
                                      <div
                                        className={cn(
                                          'flex items-center justify-center w-5 h-5 rounded-full overflow-hidden',
                                          call.status === TokenCallStatus.VERIFIED_SUCCESS &&
                                            'bg-green-950 text-green-400 ring-1 ring-green-600/50',
                                          call.status === TokenCallStatus.VERIFIED_FAIL &&
                                            'bg-red-950 text-red-400 ring-1 ring-red-600/50',
                                          call.status === TokenCallStatus.PENDING &&
                                            'bg-yellow-950 text-yellow-400 ring-1 ring-yellow-600/50',
                                          call.status === TokenCallStatus.ERROR &&
                                            'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-600/50',
                                        )}>
                                        {getStatusIcon(call.status)}
                                      </div>
                                      <span className='hidden xs:inline ml-1.5 text-xs capitalize'>
                                        {call.status.replace('VERIFIED_', '').toLowerCase()}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {call.status === TokenCallStatus.PENDING
                                        ? 'Waiting for target date'
                                        : call.status === TokenCallStatus.VERIFIED_SUCCESS
                                          ? 'Price target met'
                                          : call.status === TokenCallStatus.VERIFIED_FAIL
                                            ? 'Price target missed'
                                            : 'Call processing error'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>

                            <TableCell className='px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap font-mono text-sm text-zinc-300 hidden sm:table-cell'>
                              {formatCurrency(call.referencePrice)}
                            </TableCell>
                            <TableCell className='px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap font-mono text-sm font-medium'>
                              <span
                                className={cn(
                                  isUp ? 'text-green-400' : 'text-red-400',
                                  'text-xs sm:text-sm',
                                )}>
                                {formatCurrency(call.targetPrice)}
                              </span>
                            </TableCell>
                            <TableCell className='px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap'>
                              {multiplier !== null ? (
                                <span
                                  className={cn(
                                    'font-mono font-semibold px-1.5 py-0.5 rounded-md text-xs sm:text-sm',
                                    isUp
                                      ? 'bg-green-950/50 text-green-400'
                                      : 'bg-red-950/50 text-red-400',
                                  )}>
                                  {isUp ? (
                                    <ArrowUp className='inline h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 mb-px' />
                                  ) : (
                                    <ArrowDown className='inline h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 mb-px' />
                                  )}
                                  {multiplier.toFixed(2)}x
                                </span>
                              ) : (
                                <span className='text-zinc-500 text-xs sm:text-sm'>-</span>
                              )}
                            </TableCell>

                            <TableCell
                              className='px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap text-sm text-zinc-400'
                              title={new Date(call.callTimestamp).toLocaleString()}>
                              <span className='hidden sm:inline'>
                                {formatRelativeDateSafe(call.callTimestamp)}
                              </span>
                              <span className='sm:hidden text-xs'>
                                {formatRelativeDateSafe(call.callTimestamp)}
                              </span>
                            </TableCell>
                            <TableCell
                              className='px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap text-sm text-zinc-400'
                              title={new Date(call.targetDate).toLocaleString()}>
                              <span className='hidden sm:inline'>
                                {formatTargetDate(call.targetDate)}
                              </span>
                              <span className='sm:hidden text-xs'>
                                {formatTargetDate(call.targetDate)}
                              </span>
                            </TableCell>
                            <TableCell className='px-2 py-2 sm:py-3 whitespace-nowrap text-center'>
                              <Link
                                href={`/token-calls/${call.id}`}
                                className='text-zinc-400 hover:text-white flex items-center justify-center'>
                                <Eye className='h-4 w-4' />
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className='flex justify-center mt-8'>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
