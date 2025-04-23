'use client';

import { formatLargeNumber } from '@/lib/utils';
import { FeedActivity } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';

interface PredictionCardContentProps {
  tokenCall: NonNullable<FeedActivity['tokenCall']>;
  predictionPercent: string | null;
}

export function PredictionCardContent({
  tokenCall,
  predictionPercent,
}: PredictionCardContentProps) {
  const formatPrice = (price: number | null | undefined | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return (
      numPrice?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8, // Increased max digits for low prices
      }) ?? 'N/A'
    );
  };

  const formatDate = (date: string | Date | null | undefined) =>
    date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : 'N/A';

  const formatMCAP = (
    price: number | null | undefined | string,
    supply: number | null | undefined,
  ) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (numPrice == null || supply == null) return 'N/A';
    const mcap = numPrice * supply;
    if (!isFinite(mcap)) return 'N/A';
    return `$${formatLargeNumber(mcap)}`;
  };

  return (
    // Refactored to use CSS Grid
    <div className='grid grid-cols-3 gap-x-4 gap-y-3 bg-gradient-to-br from-zinc-800/70 to-zinc-900/80 border border-zinc-700/40 p-4 rounded-lg mt-2 shadow-sm'>
      {/* Row 1 */}
      <div className='flex flex-col'>
        <div className='text-xs text-zinc-400'>Reference Price</div>
        <div className='font-semibold text-zinc-100 text-sm mt-0.5'>
          ${formatPrice(tokenCall.referencePrice)}
        </div>
      </div>
      <div className='flex flex-col'>
        <div className='text-xs text-zinc-400 flex items-center gap-1.5'>
          Target Price
          {predictionPercent && (
            <span className='font-semibold text-emerald-400'>({predictionPercent})</span>
          )}
        </div>
        <div className='font-semibold text-emerald-400 text-sm mt-0.5'>
          ${formatPrice(tokenCall.targetPrice)}
        </div>
      </div>
      <div className='flex flex-col text-right'>
        <div className='text-xs text-zinc-400'>Target Date</div>
        <div className='font-semibold text-zinc-100 text-sm mt-0.5'>
          {formatDate(tokenCall.targetDate)}
        </div>
      </div>

      {/* Row 2 */}
      <div className='flex flex-col'>
        <div className='text-xs text-zinc-400'>Reference MCAP</div>
        <div className='font-semibold text-blue-300 text-sm mt-0.5'>
          {formatMCAP(tokenCall.referencePrice, tokenCall.referenceSupply)}
        </div>
      </div>
      <div className='flex flex-col'>
        <div className='text-xs text-zinc-400'>Target MCAP</div>
        <div className='font-semibold text-emerald-300 text-sm mt-0.5'>
          {formatMCAP(tokenCall.targetPrice, tokenCall.referenceSupply)}
        </div>
      </div>
      <div className='flex flex-col text-right'>
        <div className='text-xs text-zinc-400'>Predicted</div>
        <div className='font-semibold text-zinc-100 text-sm mt-0.5'>
          {formatDate(tokenCall.callTimestamp)}
        </div>
      </div>
    </div>
  );
}
