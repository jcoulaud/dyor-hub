'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { formatLargeNumber } from '@/lib/utils';
import { SolanaTrackerHolderDataPoint } from '@dyor-hub/types';
import { format } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  YAxis,
} from 'recharts';

interface HolderHistoryChartProps {
  data: SolanaTrackerHolderDataPoint[] | null;
  isLoading?: boolean;
  className?: string;
}

interface ChartDataPoint {
  time: number;
  formattedTime: string;
  holders: number;
}

const CustomTooltip = memo(({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as ChartDataPoint;
    return (
      <div className='bg-zinc-800/90 px-3 py-2 rounded-lg border border-zinc-700/50 shadow-lg backdrop-blur-sm'>
        <p className='text-xs text-zinc-400'>{dataPoint.formattedTime}</p>
        <p className='text-sm font-medium text-white'>
          {payload[0].value?.toLocaleString()} holders
        </p>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

export const HolderHistoryChart = memo(
  ({ data, isLoading, className }: HolderHistoryChartProps) => {
    const chartData: ChartDataPoint[] | null = useMemo(() => {
      if (!data) return null;
      return data
        .map((item) => ({
          ...item,
          time: Number(item.time),
          formattedTime: format(new Date(Number(item.time) * 1000), 'MMM d, HH:mm'),
          holders: Number(item.holders),
        }))
        .sort((a, b) => a.time - b.time);
    }, [data]);

    // Calculate min and max for better Y-axis display
    const minMaxValues = useMemo(() => {
      if (!chartData || chartData.length === 0) return { min: 0, max: 0 };

      const holdersValues = chartData.map((item) => item.holders);
      const min = Math.min(...holdersValues);
      const max = Math.max(...holdersValues);

      // Add a small padding to ensure the values don't touch the edges
      return {
        min: Math.max(0, min * 0.95),
        max: max * 1.05,
      };
    }, [chartData]);

    if (isLoading) {
      return (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
            <BarChart3 className='h-4 w-4 mr-2 text-blue-400' />
            Holder History
          </h3>
          <Skeleton className='h-[120px] w-full bg-zinc-800/50 rounded-xl' />
        </div>
      );
    }

    if (!chartData || chartData.length === 0) {
      return (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
            <BarChart3 className='h-4 w-4 mr-2 text-blue-400' />
            Holder History
          </h3>
          <div className='flex h-[120px] w-full items-center justify-center bg-zinc-800/10 rounded-lg border border-zinc-700/20'>
            <p className='text-zinc-400'>No holder history data available.</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-3 ${className}`}>
        <h3 className='text-sm font-medium text-zinc-400 flex items-center'>
          <BarChart3 className='h-4 w-4 mr-2 text-blue-400' />
          Holder History
        </h3>
        <div className='relative w-full h-[120px] bg-zinc-900 rounded-xl shadow py-2'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart
              data={chartData}
              margin={{
                top: 15,
                right: 10,
                left: 0,
                bottom: 5,
              }}>
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke='rgba(255,255,255,0.1)'
              />
              <YAxis
                stroke='hsl(var(--muted-foreground))'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                ticks={[
                  minMaxValues.min,
                  (minMaxValues.min + minMaxValues.max) / 2,
                  minMaxValues.max,
                ]}
                tickFormatter={(value) => formatLargeNumber(value)}
                allowDecimals={false}
                domain={[minMaxValues.min, minMaxValues.max]}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#525252', strokeWidth: 1 }} />
              <Area
                type='monotone'
                dataKey='holders'
                stroke='hsl(var(--emerald-500, 16 185 129))'
                fill='none'
                strokeWidth={1.5}
                activeDot={{
                  r: 4,
                  style: {
                    fill: 'hsl(var(--emerald-500, 16 185 129))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2,
                  },
                }}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  },
);

HolderHistoryChart.displayName = 'HolderHistoryChart';
