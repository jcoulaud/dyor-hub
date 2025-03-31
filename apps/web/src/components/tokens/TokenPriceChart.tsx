'use client';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { tokens, users } from '@/lib/api';
import { format } from 'date-fns';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

interface ChartPoint {
  time: string;
  price: number;
  marketCap?: number;
}

interface TokenPriceChartProps {
  tokenAddress: string;
  totalSupply: string;
}

// Cache for price history data
const priceHistoryCache = new Map<string, { data: ChartPoint[]; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
};

const formatMarketCap = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
};

const formatTime = (timestamp: number): string => {
  return format(new Date(timestamp * 1000), 'h:mm a');
};

const TokenPriceChartComponent = memo(({ tokenAddress, totalSupply }: TokenPriceChartProps) => {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPriceUp, setIsPriceUp] = useState<boolean>(false);
  const [showMarketCap, setShowMarketCap] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Load user preference on initial render
  useEffect(() => {
    const loadUserPreference = async () => {
      try {
        const settings = await users.getUserSettings();
        if (settings.tokenChartDisplay === 'marketCap') {
          setShowMarketCap(true);
        } else {
          setShowMarketCap(false);
        }
      } catch {
        // Silently fail and use default preference
      }
    };

    loadUserPreference();
  }, []);

  // Save user preference when it changes
  const handleDisplayToggle = useCallback(async (checked: boolean) => {
    setShowMarketCap(!checked);
    try {
      const chartMode = !checked ? 'marketCap' : 'price';
      await users.updateUserSettings({
        tokenChartDisplay: chartMode,
      });
    } catch {
      // Continue with local state change even if saving fails
    }
  }, []);

  const fetchData = useCallback(
    async (retryCount = 0) => {
      if (isDevelopment) return;

      try {
        // Check cache first
        const cached = priceHistoryCache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setData(cached.data);
          setIsLoading(false);
          const firstPrice = cached.data[0]?.price;
          const lastPrice = cached.data[cached.data.length - 1]?.price;
          setIsPriceUp(lastPrice > firstPrice);
          return;
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setError(null);

        const priceHistory = await tokens.getTokenPriceHistory(
          tokenAddress,
          abortControllerRef.current.signal,
        );

        if (priceHistory.items.length > 0) {
          const supply = parseFloat(totalSupply);
          const formatted = priceHistory.items.map((item) => ({
            time: formatTime(item.unixTime),
            price: item.value,
            marketCap: item.value * supply,
          }));

          const firstPrice = formatted[0]?.price;
          const lastPrice = formatted[formatted.length - 1]?.price;
          setIsPriceUp(lastPrice > firstPrice);
          setData(formatted);

          // Update cache
          priceHistoryCache.set(tokenAddress, {
            data: formatted,
            timestamp: Date.now(),
          });
        } else {
          setError('No price data available');
        }
      } catch (error) {
        // Handle aborted requests
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setError('Failed to load price data');

        // Retry with exponential backoff
        if (retryCount < 3) {
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }

          const delay = Math.min(1000 * 2 ** retryCount, 10000);
          retryTimeoutRef.current = setTimeout(() => {
            fetchData(retryCount + 1);
          }, delay);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [tokenAddress, totalSupply, isDevelopment],
  );

  useEffect(() => {
    fetchData();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Render placeholder in development mode
  if (isDevelopment) {
    return (
      <div className='w-full h-[120px] p-4 bg-zinc-900 rounded-xl shadow flex items-center justify-center'>
        <p className='text-sm text-zinc-400'>Price chart not shown in development mode</p>
      </div>
    );
  }

  if (isLoading && !data.length) {
    return (
      <div className='w-full h-[120px] p-4 bg-zinc-900 rounded-xl shadow'>
        <div className='h-full w-full flex items-center justify-center'>
          <div className='w-full h-[80px] bg-zinc-800/50 animate-pulse rounded-lg'></div>
        </div>
      </div>
    );
  }

  if (error && !data.length) {
    return (
      <div className='w-full h-[120px] p-4 bg-zinc-900 rounded-xl shadow flex items-center justify-center'>
        <p className='text-sm text-zinc-400'>{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className='w-full h-[120px] p-4 bg-zinc-900 rounded-xl shadow flex items-center justify-center'>
        <p className='text-sm text-zinc-400'>No price data available</p>
      </div>
    );
  }

  const dataKey = showMarketCap ? 'marketCap' : 'price';
  const formatValue = showMarketCap ? formatMarketCap : formatPrice;

  return (
    <div className='relative w-full h-[120px] bg-zinc-900 rounded-xl shadow'>
      <div className='absolute top-2 left-3 text-xs text-zinc-400'>24h</div>
      <div className='absolute top-2 right-3 flex items-center gap-2 z-10'>
        <Label htmlFor='chart-toggle' className='text-xs text-zinc-400 cursor-pointer'>
          {showMarketCap ? 'Market Cap' : 'Price'}
        </Label>
        <Switch
          id='chart-toggle'
          checked={!showMarketCap}
          onCheckedChange={handleDisplayToggle}
          className='data-[state=checked]:bg-blue-500 cursor-pointer'
        />
      </div>
      <ResponsiveContainer width='100%' height='100%'>
        <LineChart data={data} margin={{ top: 35, right: 10, bottom: 10, left: 10 }}>
          <YAxis domain={['dataMin', 'dataMax']} hide={true} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0 && payload[0].payload) {
                return (
                  <div className='bg-zinc-800/90 px-3 py-2 rounded-lg border border-zinc-700/50 shadow-lg backdrop-blur-sm'>
                    <p className='text-xs text-zinc-400'>{payload[0].payload.time}</p>
                    <p className='text-sm font-medium text-white'>
                      {formatValue(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ stroke: '#525252', strokeWidth: 1 }}
          />
          <Line
            type='monotone'
            dataKey={dataKey}
            stroke={isPriceUp ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

TokenPriceChartComponent.displayName = 'TokenPriceChart';

export default TokenPriceChartComponent;
