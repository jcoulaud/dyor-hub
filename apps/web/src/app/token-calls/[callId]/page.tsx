'use client';

import { format } from 'date-fns';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle,
  Clock,
  Copy,
  Info,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Twitter,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { tokenCalls } from '@/lib/api';
import { calculateMultiplier, formatLargeNumber, formatPrice } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { TokenCall as BaseTokenCall, Comment, TokenCallStatus } from '@dyor-hub/types';

type TokenCall = BaseTokenCall & { explanationComment?: Comment | null };

type StatusConfig = {
  icon: React.ReactNode;
  label: string;
  variant: 'success' | 'error' | 'warning';
};

const STATUS_CONFIG: Record<TokenCallStatus, StatusConfig> = {
  [TokenCallStatus.VERIFIED_SUCCESS]: {
    icon: <CheckCircle className='h-4 w-4' />,
    label: 'Success',
    variant: 'success',
  },
  [TokenCallStatus.VERIFIED_FAIL]: {
    icon: <XCircle className='h-4 w-4' />,
    label: 'Failed',
    variant: 'error',
  },
  [TokenCallStatus.PENDING]: {
    icon: <Clock className='h-4 w-4' />,
    label: 'Pending',
    variant: 'warning',
  },
  [TokenCallStatus.ERROR]: {
    icon: <XCircle className='h-4 w-4' />,
    label: 'Error',
    variant: 'error',
  },
};

export default function TokenCallDetailPage() {
  const params = useParams();
  const callId = params?.callId as string;
  const { user: currentUser, isAuthenticated } = useAuthContext();
  const { toast } = useToast();

  const [tokenCall, setTokenCall] = useState<TokenCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'price' | 'mcap'>('mcap');
  const [priceHistory, setPriceHistory] = useState<{
    items: { unixTime: number; value: number }[];
  } | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenCallData = async () => {
      if (!callId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await tokenCalls.getById(callId);
        setTokenCall(data);
      } catch (err) {
        console.error('Error fetching token call:', err);
        setError('Failed to load token call data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenCallData();
  }, [callId]);

  useEffect(() => {
    if (!tokenCall) {
      return;
    }
    if (!tokenCall.priceHistoryUrl) {
      return;
    }
    setIsHistoryLoading(true);
    setHistoryError(null);
    fetch(tokenCall.priceHistoryUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch price history');
        return res.json();
      })
      .then((data) => {
        setPriceHistory(data);
      })
      .catch(() => {
        setHistoryError('Could not load price history');
        setPriceHistory(null);
      })
      .finally(() => setIsHistoryLoading(false));
  }, [tokenCall]);

  const callDetails = useMemo(() => {
    if (!tokenCall) return null;

    const { referencePrice, targetPrice, targetDate, createdAt, referenceSupply } = tokenCall;
    const multiplier = calculateMultiplier(referencePrice, targetPrice);
    const isUp = multiplier !== null && multiplier > 1;

    // Fix market cap calculations to handle very small numbers
    const refPrice =
      typeof referencePrice === 'string' ? parseFloat(referencePrice) : referencePrice || 0;
    const refSupply =
      typeof referenceSupply === 'string' ? parseFloat(referenceSupply) : referenceSupply || 0;
    const tgtPrice = typeof targetPrice === 'string' ? parseFloat(targetPrice) : targetPrice || 0;

    const referenceMcap = refPrice && refSupply ? refPrice * refSupply : null;
    const targetMcap = tgtPrice && refSupply ? tgtPrice * refSupply : null;

    return {
      multiplier,
      isUp,
      formattedMultiplier: multiplier ? `${multiplier.toFixed(2)}x` : '-',
      targetDate: targetDate ? new Date(targetDate) : null,
      createdAt: createdAt ? new Date(createdAt) : null,
      targetDateFormatted: targetDate ? format(new Date(targetDate), 'MMM d, yyyy h:mm a') : '-',
      createdAtFormatted: createdAt ? format(new Date(createdAt), 'MMM d, yyyy h:mm a') : '-',
      referenceMcap,
      targetMcap,
    };
  }, [tokenCall]);

  const handleShare = () => {
    if (!tokenCall) return;

    const shareUrl = window.location.href;
    const tokenSymbol = tokenCall.token?.symbol ? `$${tokenCall.token.symbol}` : 'token';
    const predictedPrice = formatPrice(tokenCall.targetPrice);
    const percentChange =
      ((tokenCall.targetPrice - tokenCall.referencePrice) / tokenCall.referencePrice) * 100;
    const percentageText = `(${callDetails?.isUp ? '+' : ''}${percentChange.toFixed(2)}%)`;
    const tokenAddress = tokenCall.token?.mintAddress || '';

    // Check if this is the current user's prediction
    const isOwnPrediction = isAuthenticated && currentUser?.id === tokenCall.user?.id;

    // Check if target date is in the past
    const isTargetDatePassed = tokenCall.targetDate
      ? new Date(tokenCall.targetDate) < new Date()
      : false;

    let baseText = '';

    if (displayMode === 'mcap' && callDetails?.targetMcap) {
      const formattedMcap = formatLargeNumber(callDetails.targetMcap);
      baseText = isOwnPrediction
        ? `I${isTargetDatePassed ? ' predicted' : "'m predicting"} a market cap of $${formattedMcap} ${percentageText} for ${tokenSymbol} on #DYORhub!`
        : `Check out ${tokenCall.user?.username ? `@${tokenCall.user.username}'s` : "this user's"} market cap prediction of $${formattedMcap} ${percentageText} for ${tokenSymbol} on #DYORhub!`;
    } else {
      baseText = isOwnPrediction
        ? `I${isTargetDatePassed ? ' predicted' : "'m predicting"} a price of $${predictedPrice} ${percentageText} for ${tokenSymbol} on #DYORhub!`
        : `Check out ${tokenCall.user?.username ? `@${tokenCall.user.username}'s` : "this user's"} price prediction of $${predictedPrice} ${percentageText} for ${tokenSymbol} on #DYORhub!`;
    }

    const text = `${baseText} What do you think? 🔥\n\n${tokenAddress}\n\n${shareUrl}`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=800,height=600');
  };

  const handleCopy: React.MouseEventHandler<HTMLButtonElement> = () => {
    if (!tokenCall) return;
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: 'URL Copied',
        description: 'Prediction link copied to clipboard',
      });
    });
  };

  if (isLoading) {
    return <TokenCallSkeleton />;
  }

  if (error || !tokenCall) {
    return <TokenCallError errorMessage={error || undefined} />;
  }

  const user = tokenCall.user;
  const token = tokenCall.token;
  const status = tokenCall.status;

  return (
    <div className='container mx-auto px-4 py-6 max-w-5xl'>
      {/* Background elements */}
      <div className='fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 -z-10' />
      <div className='fixed inset-0 bg-[url("/grid-pattern.svg")] bg-repeat opacity-10 -z-10' />
      <div className='fixed inset-0 bg-gradient-radial from-amber-500/5 via-transparent to-transparent -z-10' />

      <h1 className='text-2xl sm:text-3xl font-bold mb-5 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600'>
        Token Price Prediction
      </h1>

      {/* Main Card */}
      <div className='relative group transition-all duration-300'>
        <div className='absolute -inset-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300'></div>
        <Card className='relative bg-zinc-900/70 backdrop-blur-lg border-zinc-800/50 rounded-xl overflow-hidden shadow-xl'>
          <CardHeader className='flex flex-row items-center pb-2 border-b border-zinc-800/50'>
            <div className='flex-1'>
              <UserProfile user={user} />
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 gap-1.5 px-3 cursor-pointer bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/40 rounded-md'
                onClick={handleCopy}>
                <Copy className='h-4 w-4 text-zinc-400' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 gap-1.5 px-3 cursor-pointer bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/40 rounded-md'
                onClick={handleShare}>
                <Twitter className='h-4 w-4 text-zinc-400' />
                <span className='text-xs font-medium text-zinc-400'>Share</span>
              </Button>
            </div>
          </CardHeader>

          {/* Subheader status badge and view all predictions button */}
          <div className='flex items-center justify-between px-5 py-3'>
            <StatusBadge status={status} />
            <Button
              variant='secondary'
              size='sm'
              className='h-8 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium border border-blue-500/40 shadow-sm'
              asChild>
              <Link href={`/token-calls?username=${user?.username || ''}`}>
                <span className='flex items-center gap-1.5'>
                  View all predictions
                  <ArrowUpRight className='h-3.5 w-3.5' />
                </span>
              </Link>
            </Button>
          </div>

          <CardContent className='p-5 pt-0'>
            {/* Main content */}
            <div className='grid grid-cols-1 md:grid-cols-12 gap-6'>
              {/* Left column: Token and Chart */}
              <div className='md:col-span-7 space-y-5'>
                {/* Token card */}
                <div className='bg-zinc-800/40 backdrop-blur-sm rounded-xl border border-zinc-700/30 p-4'>
                  <Link href={`/tokens/${token?.mintAddress}`} className='block'>
                    <div className='flex items-center'>
                      {/* Token image */}
                      <div className='relative mr-3 flex-shrink-0'>
                        <Avatar className='h-14 w-14 shadow-md border border-zinc-700/50'>
                          <AvatarImage
                            src={token?.imageUrl || ''}
                            alt={token?.name || 'Token'}
                            className='object-cover'
                          />
                          <AvatarFallback className='bg-gradient-to-br from-amber-600/40 to-amber-700/40 text-amber-200 text-lg'>
                            {token?.symbol?.substring(0, 2).toUpperCase() || 'TK'}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Token name and symbol */}
                      <div className='flex-grow'>
                        <h3 className='text-base md:text-lg font-semibold text-zinc-100 mb-0.5 hover:text-amber-400 transition-colors'>
                          {token?.name || 'Unknown Token'}
                        </h3>
                        <div className='flex items-center gap-2'>
                          <span className='px-2 py-0.5 rounded-md bg-zinc-800/70 border border-zinc-700/30 text-zinc-300 text-xs font-medium'>
                            ${token?.symbol || 'TOKEN'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Chart card */}
                <div className='bg-zinc-800/40 backdrop-blur-sm rounded-xl border border-zinc-700/30 overflow-hidden shadow-md'>
                  <div>
                    {isHistoryLoading ? (
                      <div className='w-full flex items-center justify-center py-8'>
                        <Skeleton className='w-full h-36' />
                      </div>
                    ) : historyError ? (
                      <div className='text-red-500 flex items-center justify-center py-8 text-sm'>
                        <XCircle className='h-4 w-4 mr-2' />
                        {historyError}
                      </div>
                    ) : priceHistory && priceHistory.items.length > 0 ? (
                      <div className='bg-zinc-800/10' style={{ height: '260px' }}>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart
                            data={priceHistory.items.map((item) => {
                              // Calculate market cap if needed
                              const price = item.value;
                              const mcap = tokenCall.referenceSupply
                                ? price * parseFloat(String(tokenCall.referenceSupply))
                                : null;

                              return {
                                time: item.unixTime * 1000,
                                price,
                                mcap,
                              };
                            })}
                            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                            <CartesianGrid
                              stroke='#666'
                              opacity={0.1}
                              vertical={false}
                              strokeDasharray='2 6'
                              strokeWidth={0.8}
                            />

                            {/* X-axis */}
                            <XAxis
                              dataKey='time'
                              type='number'
                              scale='time'
                              domain={['dataMin', 'dataMax']}
                              tickFormatter={(timestamp) => {
                                const date = new Date(timestamp);

                                // Calculate if the data spans 5 or more days
                                const firstDate =
                                  priceHistory && new Date(priceHistory.items[0].unixTime * 1000);
                                const lastDate =
                                  priceHistory &&
                                  new Date(
                                    priceHistory.items[priceHistory.items.length - 1].unixTime *
                                      1000,
                                  );
                                const daySpan =
                                  firstDate && lastDate
                                    ? Math.floor(
                                        (lastDate.getTime() - firstDate.getTime()) /
                                          (1000 * 60 * 60 * 24),
                                      )
                                    : 0;

                                // Use date format if span is 5+ days, otherwise use time
                                if (daySpan >= 5) {
                                  return format(date, 'MMM d');
                                } else {
                                  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                                }
                              }}
                              stroke='#666'
                              tick={{ fontSize: 10, fill: '#aaa' }}
                              tickSize={3}
                              axisLine={{ stroke: '#555' }}
                              interval='preserveStartEnd'
                              minTickGap={80}
                              padding={{ left: 10, right: 10 }}
                            />

                            {/* Y-axis */}
                            <YAxis
                              dataKey={displayMode === 'mcap' ? 'mcap' : 'price'}
                              tickFormatter={(value) => {
                                if (displayMode === 'mcap') {
                                  return `$${formatLargeNumber(value)}`;
                                }
                                return `$${value.toFixed(4)}`;
                              }}
                              domain={[
                                (dataMin: number) =>
                                  Math.min(
                                    dataMin * 0.95,
                                    status === TokenCallStatus.PENDING ||
                                      status === TokenCallStatus.VERIFIED_SUCCESS
                                      ? displayMode === 'mcap' && callDetails?.targetMcap
                                        ? callDetails.targetMcap * 0.95
                                        : parseFloat(String(tokenCall.targetPrice)) * 0.95
                                      : dataMin * 0.95,
                                  ),
                                (dataMax: number) =>
                                  Math.max(
                                    dataMax * 1.05,
                                    status === TokenCallStatus.PENDING ||
                                      status === TokenCallStatus.VERIFIED_SUCCESS
                                      ? displayMode === 'mcap' && callDetails?.targetMcap
                                        ? callDetails.targetMcap * 1.05
                                        : parseFloat(String(tokenCall.targetPrice)) * 1.05
                                      : dataMax * 1.05,
                                  ),
                              ]}
                              stroke='#666'
                              tick={{ fontSize: 10, fill: '#aaa' }}
                              width={58}
                              tickSize={3}
                              axisLine={{ stroke: '#555' }}
                              tickMargin={5}
                              allowDecimals={true}
                              tickCount={5}
                            />

                            {/* Tooltip */}
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  let value: string;
                                  if (displayMode === 'mcap') {
                                    const mcapValue = payload[0].value as number;
                                    value = `$${formatLargeNumber(mcapValue)}`;
                                  } else {
                                    const priceValue = payload[0].value as number;
                                    value = `$${Number(priceValue).toFixed(6)}`;
                                  }

                                  const date = new Date(label);
                                  const formattedTime = format(date, 'h:mm a');
                                  const formattedDate = format(date, 'MMM d, yyyy');

                                  return (
                                    <div className='bg-zinc-800/90 px-3 py-2 rounded-lg border border-zinc-700/50 shadow-lg backdrop-blur-sm'>
                                      <p className='text-xs text-zinc-400 mb-1'>
                                        {formattedDate} {formattedTime}
                                      </p>
                                      <p className='text-sm font-medium text-white'>{value}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                              cursor={{
                                stroke:
                                  status === TokenCallStatus.VERIFIED_FAIL ? '#ef4444' : '#22c55e',
                                strokeOpacity: 0.7,
                                strokeWidth: 1,
                              }}
                            />

                            {/* Main line */}
                            <Line
                              type='monotone'
                              dataKey={displayMode === 'mcap' ? 'mcap' : 'price'}
                              stroke={
                                status === TokenCallStatus.VERIFIED_FAIL ? '#ef4444' : '#22c55e'
                              }
                              strokeWidth={2}
                              dot={false}
                              activeDot={{
                                r: 5,
                                fill:
                                  status === TokenCallStatus.VERIFIED_FAIL ? '#ef4444' : '#22c55e',
                                stroke: '#222',
                                strokeWidth: 1,
                                strokeOpacity: 0.8,
                              }}
                              animationDuration={1200}
                              animationEasing='ease-out'
                            />

                            {/* Target reference line */}
                            {(status === TokenCallStatus.PENDING ||
                              status === TokenCallStatus.VERIFIED_SUCCESS ||
                              status === TokenCallStatus.VERIFIED_FAIL) && (
                              <ReferenceLine
                                y={
                                  displayMode === 'mcap' && callDetails?.targetMcap
                                    ? callDetails.targetMcap
                                    : parseFloat(String(tokenCall.targetPrice))
                                }
                                stroke={
                                  status === TokenCallStatus.VERIFIED_FAIL ? '#ef4444' : '#22c55e'
                                }
                                strokeDasharray='3 3'
                                strokeWidth={1.5}
                                isFront={true}
                                ifOverflow='extendDomain'
                                label={{
                                  value: 'Target',
                                  position: 'insideRight',
                                  offset: 2,
                                  dy: -10,
                                  fill:
                                    status === TokenCallStatus.VERIFIED_FAIL
                                      ? '#ef4444'
                                      : '#22c55e',
                                  fontSize: 11,
                                  fontWeight: 500,
                                }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div
                        className='bg-zinc-800/10 flex items-center justify-center'
                        style={{ height: '273px' }}>
                        <div className='text-zinc-400 flex flex-col items-center justify-center py-8 text-sm'>
                          <Info className='h-5 w-5 mb-2 text-zinc-500' />
                          <p>Chart will be available when the target date is reached.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: Prediction details */}
              <div className='md:col-span-5'>
                <div className='bg-zinc-800/40 backdrop-blur-sm rounded-xl border border-zinc-700/30 h-full'>
                  {/* Prediction content */}
                  <div className='p-4 pb-2'>
                    {/* Multiplier card */}
                    <div
                      className={`relative overflow-hidden rounded-lg border p-4 mb-4 ${
                        callDetails?.isUp
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700/50'
                      }`}>
                      <div className='flex flex-col items-center justify-center text-center relative z-10'>
                        <span className='text-zinc-400 uppercase tracking-wider text-xs font-semibold mb-1'>
                          Price Multiplier
                        </span>
                        <div
                          className={`flex items-center justify-center ${
                            callDetails?.isUp ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {callDetails?.isUp ? (
                            <TrendingUp className='h-6 w-6 mr-2' />
                          ) : (
                            <TrendingDown className='h-6 w-6 mr-2' />
                          )}
                          <span className='text-3xl font-bold'>
                            {callDetails?.formattedMultiplier}
                          </span>
                        </div>
                        <div
                          className={`mt-1 text-sm font-medium ${
                            callDetails?.isUp ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {callDetails?.isUp ? 'Price Increase' : 'Price Decrease'}
                        </div>
                      </div>
                    </div>

                    {/* Tabs for Price/Mcap */}
                    <Tabs
                      value={displayMode}
                      onValueChange={(value) => setDisplayMode(value as 'price' | 'mcap')}
                      className='mb-4'>
                      <div className='flex flex-col relative'>
                        <TabsList className='grid w-full grid-cols-2 h-9 bg-zinc-900/60 border border-zinc-700/40 p-0.5 rounded-full shadow-inner overflow-hidden'>
                          {/* Mcap Trigger */}
                          <TabsTrigger
                            value='mcap'
                            className='text-xs h-full rounded-full transition-all duration-300 data-[state=active]:shadow-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600/70 data-[state=active]:to-amber-700/70 data-[state=active]:text-zinc-100 text-zinc-400 font-medium'>
                            Market Cap
                          </TabsTrigger>
                          {/* Price Trigger */}
                          <TabsTrigger
                            value='price'
                            className='text-xs h-full rounded-full transition-all duration-300 data-[state=active]:shadow-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600/70 data-[state=active]:to-amber-700/70 data-[state=active]:text-zinc-100 text-zinc-400 font-medium'>
                            Price
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      {/* Mcap Content */}
                      <TabsContent
                        value='mcap'
                        className='mt-4 animate-in fade-in-50 zoom-in-95 duration-300'>
                        <div className='grid grid-cols-2 gap-3'>
                          <div className='flex flex-col bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3'>
                            <span className='text-xs text-zinc-400 mb-1 font-medium'>
                              Initial Mcap
                            </span>
                            <span className='font-semibold text-zinc-100 text-base'>
                              ${formatLargeNumber(callDetails?.referenceMcap)}
                            </span>
                          </div>
                          <div
                            className={`flex flex-col rounded-lg p-3 border ${
                              status === TokenCallStatus.VERIFIED_FAIL
                                ? 'border-red-500/30 text-red-400'
                                : 'border-green-500/30 text-green-400'
                            }`}>
                            <span className='text-xs text-zinc-400 mb-1 font-medium'>
                              {status === TokenCallStatus.VERIFIED_SUCCESS
                                ? 'Target Hit'
                                : status === TokenCallStatus.VERIFIED_FAIL
                                  ? 'Target Missed'
                                  : 'Target Mcap'}
                            </span>
                            <span className='font-semibold text-base'>
                              ${formatLargeNumber(callDetails?.targetMcap)}
                            </span>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Price Content */}
                      <TabsContent
                        value='price'
                        className='mt-4 animate-in fade-in-50 zoom-in-95 duration-300'>
                        <div className='grid grid-cols-2 gap-3'>
                          <div className='flex flex-col bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3'>
                            <span className='text-xs text-zinc-400 mb-1 font-medium'>
                              Initial Price
                            </span>
                            <span className='font-semibold text-zinc-100 text-base'>
                              ${formatPrice(tokenCall.referencePrice)}
                            </span>
                          </div>
                          <div
                            className={`flex flex-col rounded-lg p-3 border ${
                              status === TokenCallStatus.VERIFIED_FAIL
                                ? 'border-red-500/30 text-red-400'
                                : 'border-green-500/30 text-green-400'
                            }`}>
                            <span className='text-xs text-zinc-400 mb-1 font-medium'>
                              {status === TokenCallStatus.VERIFIED_SUCCESS
                                ? 'Target Hit'
                                : status === TokenCallStatus.VERIFIED_FAIL
                                  ? 'Target Missed'
                                  : 'Target Price'}
                            </span>
                            <span className='font-semibold text-base'>
                              ${formatPrice(tokenCall.targetPrice)}
                            </span>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Dates */}
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3'>
                        <div className='flex items-center gap-1.5 mb-1.5'>
                          <Clock className='h-3.5 w-3.5 text-amber-500/80' />
                          <span className='text-zinc-400 text-xs font-medium'>Created</span>
                        </div>
                        {callDetails?.createdAt ? (
                          <div>
                            <div className='font-bold text-zinc-100 text-lg leading-tight'>
                              {format(callDetails.createdAt, 'MMM d, yyyy')}
                            </div>
                            <div className='font-medium text-amber-400/90 text-sm mt-0.5'>
                              {format(callDetails.createdAt, 'h:mm a')}
                            </div>
                          </div>
                        ) : (
                          <span className='font-medium text-zinc-200 text-sm'>-</span>
                        )}
                      </div>

                      <div className='bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3'>
                        <div className='flex items-center gap-1.5 mb-1.5'>
                          <CalendarClock className='h-3.5 w-3.5 text-amber-500/80' />
                          <span className='text-zinc-400 text-xs font-medium'>Target Date</span>
                        </div>
                        {callDetails?.targetDate ? (
                          <div>
                            <div className='font-bold text-zinc-100 text-lg leading-tight'>
                              {format(callDetails.targetDate, 'MMM d, yyyy')}
                            </div>
                            <div className='font-medium text-amber-400/90 text-sm mt-0.5'>
                              {format(callDetails.targetDate, 'h:mm a')}
                            </div>
                          </div>
                        ) : (
                          <span className='font-medium text-zinc-200 text-sm'>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation comment */}
            {tokenCall.explanationComment && (
              <div className='mt-4 w-full'>
                <div className='w-full rounded-xl border border-zinc-700/30 bg-zinc-800/40 backdrop-blur-sm shadow-md p-5 relative'>
                  <a
                    href={`/tokens/${token?.mintAddress}/comments/${tokenCall.explanationComment.id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='absolute top-4 right-4 p-2 rounded-full bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-700/40 text-zinc-400 hover:text-amber-400 transition-colors shadow-sm'
                    title='Open comment thread'>
                    <MessageCircle className='h-5 w-5' />
                  </a>
                  <div className='flex items-center mb-3'>
                    <Avatar className='h-10 w-10 mr-3 border border-amber-700/30'>
                      <AvatarImage
                        src={tokenCall.explanationComment.user?.avatarUrl || ''}
                        alt={tokenCall.explanationComment.user?.displayName || ''}
                      />
                      <AvatarFallback className='bg-amber-700/40 text-amber-200 text-base'>
                        {tokenCall.explanationComment.user?.displayName?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex flex-1 items-center gap-2'>
                      <span className='font-semibold text-zinc-100 text-base'>
                        {tokenCall.explanationComment.user?.displayName || 'User'}
                      </span>
                      <span className='text-xs text-zinc-500'>
                        {format(
                          new Date(tokenCall.explanationComment.createdAt),
                          'MMMM d, yyyy • h:mm a',
                        )}
                      </span>
                    </div>
                  </div>
                  <div className='text-zinc-100 text-base leading-relaxed whitespace-pre-line px-1'>
                    {tokenCall.explanationComment.content}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserProfile({ user }: { user?: TokenCall['user'] }) {
  if (!user) return <div className='h-12'>Unknown User</div>;

  return (
    <div className='flex items-center'>
      <Link
        href={`/users/${user.username || user.id}`}
        className='flex items-center group hover:opacity-90 transition-opacity'>
        <div className='relative'>
          <Avatar className='h-12 w-12 mr-4 border border-zinc-700/70 ring-1 ring-amber-500/10 shadow-lg'>
            <AvatarImage src={user.avatarUrl || ''} alt={user.displayName || 'User'} />
            <AvatarFallback className='bg-gradient-to-br from-amber-600/30 to-amber-700/30 text-amber-400'>
              {user.displayName?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div>
          <span className='font-medium text-lg text-zinc-100 hover:text-amber-400 transition-colors'>
            {user.displayName || 'Anonymous User'}
          </span>
          {user.username && (
            <p className='text-zinc-500 text-sm flex items-center'>
              <span className='text-zinc-400'>@{user.username}</span>
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: TokenCallStatus }) {
  const config = STATUS_CONFIG[status];

  const variants = {
    success: 'bg-green-500/10 border-green-500/30 text-green-500',
    error: 'bg-red-500/10 border-red-500/30 text-red-500',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
  };

  return (
    <Badge
      variant='outline'
      className={`px-3 py-1.5 gap-1.5 ${variants[config.variant]} text-sm font-medium`}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}

function TokenCallSkeleton() {
  return (
    <div className='container mx-auto px-4 py-6 max-w-5xl'>
      <Skeleton className='h-9 w-48 mb-5 rounded-md' />

      <Card className='bg-zinc-900/70 backdrop-blur-lg border-zinc-800/50 rounded-xl overflow-hidden shadow-xl'>
        <CardContent className='p-0'>
          <div className='flex items-center justify-between p-5 pb-2 border-b border-zinc-800/50'>
            <div className='flex items-center'>
              <Skeleton className='h-12 w-12 rounded-full mr-4' />
              <div>
                <Skeleton className='h-6 w-40 mb-1 rounded-md' />
                <Skeleton className='h-4 w-24 rounded-md' />
              </div>
            </div>
            <Skeleton className='h-8 w-20 rounded-md' />
          </div>

          <div className='flex items-center justify-between px-5 py-3'>
            <Skeleton className='h-7 w-28 rounded-full' />
            <Skeleton className='h-8 w-36 rounded-md' />
          </div>

          <div className='p-5'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Skeleton className='h-64 rounded-lg' />
              <Skeleton className='h-64 rounded-lg' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TokenCallError({ errorMessage }: { errorMessage?: string }) {
  return (
    <div className='container mx-auto px-4 py-6 max-w-5xl'>
      <Card className='bg-zinc-900/70 backdrop-blur-lg border-zinc-800/50 rounded-xl overflow-hidden shadow-xl'>
        <CardContent className='p-6'>
          <div className='text-center py-12'>
            <XCircle className='h-14 w-14 text-red-500/80 mx-auto mb-4' />
            <h2 className='text-xl font-medium text-zinc-200 mb-2'>
              {errorMessage || 'Token call not found'}
            </h2>
            <p className='text-zinc-500 mb-6 max-w-md mx-auto'>
              The token call you&apos;re looking for doesn&apos;t exist or could not be loaded.
            </p>
            <Button
              variant='secondary'
              size='sm'
              className='h-8 px-3 bg-zinc-800/70 hover:bg-zinc-800 text-zinc-100 text-xs font-medium border border-zinc-700/40 shadow-sm'
              asChild>
              <Link href='/token-calls'>
                <span className='flex items-center gap-1.5'>
                  View all predictions
                  <ArrowUpRight className='h-3.5 w-3.5' />
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
