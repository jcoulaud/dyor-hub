'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProcessedBundleData } from '@dyor-hub/types';
import {
  AlertTriangle,
  ArrowDown,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  HelpCircle,
  InfoIcon,
  Percent,
  RefreshCw,
  Users,
} from 'lucide-react';
import { BundleTableDialog } from './BundleTable';

interface BundleSummaryCardProps {
  bundleData: ProcessedBundleData | null;
  isLoading: boolean;
  error?: string | null;
  isRetrying?: boolean;
  onRetry?: () => void;
}

const StatItem = ({
  icon: Icon,
  label,
  value,
  isLoading,
  tooltip,
  severity,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | undefined;
  isLoading: boolean;
  tooltip?: string;
  severity?: 'low' | 'medium' | 'high' | 'none';
}) => {
  // Determine text color based on severity for percentage values
  const getValueColor = () => {
    if (!severity) return 'text-white';

    switch (severity) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-white';
    }
  };

  return (
    <div className='flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-b-0'>
      <div className='flex items-center text-sm text-zinc-400'>
        <Icon className='w-4 h-4 mr-2' />
        <span>{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' className='h-5 w-5 p-0 ml-1'>
                  <HelpCircle className='h-3 w-3 text-zinc-400' />
                </Button>
              </TooltipTrigger>
              <TooltipContent className='max-w-72'>
                <p className='text-xs'>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {isLoading ? (
        <Skeleton className='h-5 w-16 rounded' />
      ) : (
        <span className={`text-sm font-medium ${getValueColor()}`}>{value ?? 'N/A'}</span>
      )}
    </div>
  );
};

export const BundleSummaryCard = ({
  bundleData,
  isLoading,
  error,
  isRetrying,
  onRetry,
}: BundleSummaryCardProps) => {
  const currentlyHeldPercent = bundleData?.total_holding_percentage || 0;

  const formattedTotalBundledPercent = bundleData
    ? `${bundleData.total_percentage_bundled.toFixed(2)}%`
    : undefined;

  const formattedCurrentlyHeldPercent = bundleData
    ? `${currentlyHeldPercent.toFixed(2)}%`
    : undefined;

  const getTotalBundledSeverity = () => {
    if (!bundleData) return 'none';
    if (bundleData.total_percentage_bundled > 50) return 'high';
    if (bundleData.total_percentage_bundled > 25) return 'medium';
    return 'low';
  };

  const getCurrentlyHeldSeverity = () => {
    if (!bundleData) return 'none';
    if (currentlyHeldPercent > 25) return 'high';
    if (currentlyHeldPercent > 10) return 'medium';
    return 'low';
  };

  const formattedSolSpent = bundleData
    ? bundleData.total_sol_spent.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : undefined;

  // Determine if there's a displayable error or informational message
  const isPumpOnlyMessage = error === 'Bundle analysis currently only supports pump.fun tokens.';
  const displayError =
    error && !isPumpOnlyMessage && error !== 'No bundle data found for this token.';

  return (
    <div className='relative group'>
      <div
        className={cn(
          'absolute -inset-0.5 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300',
          displayError
            ? 'bg-gradient-to-r from-red-600 to-orange-600'
            : 'bg-gradient-to-r from-teal-500 to-cyan-600',
        )}></div>
      <Card
        className={cn(
          'relative h-full bg-zinc-900/40 backdrop-blur-sm border-0 rounded-xl overflow-hidden',
          displayError && 'border border-red-500/30',
        )}>
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            displayError
              ? 'bg-gradient-to-br from-red-600/5 to-orange-800/5'
              : 'bg-gradient-to-br from-teal-600/5 to-cyan-800/5',
          )}
        />
        <CardHeader className='pb-2 relative'>
          <div className='flex items-center mb-4'>
            {isLoading ? (
              <>
                <div className='h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mr-4'>
                  <Boxes className='h-5 w-5 text-cyan-400/50' />
                </div>
                <div>
                  <CardTitle className='text-xl font-semibold text-white flex items-center'>
                    Bundle Analysis
                    <div className='ml-2 w-4 h-4 opacity-30'>
                      <Skeleton className='w-4 h-4 rounded-full' />
                    </div>
                  </CardTitle>
                  <div className='text-xs text-zinc-400/50 mt-1'>
                    <Skeleton className='h-3 w-40 mt-1' />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className='h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mr-4 group-hover:bg-cyan-500/20 transition-colors duration-300'>
                  <Boxes className='h-5 w-5 text-cyan-400' />
                </div>
                <div>
                  <CardTitle className='text-xl font-semibold text-white flex items-center'>
                    Bundle Analysis
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant='ghost' size='icon' className='h-6 w-6 p-0 ml-2'>
                            <InfoIcon className='h-4 w-4 text-zinc-400' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side='right' className='max-w-96'>
                          <p className='text-xs mb-2'>
                            <strong>What are bundles?</strong> Bundles are coordinated purchases
                            from multiple wallets controlled by the same entity (usually the token
                            team).
                          </p>
                          <p className='text-xs mb-2'>
                            Bundles are used to control token supply and manipulate price action. A
                            high bundle percentage (especially currently held) is a potential red
                            flag.
                          </p>
                          <p className='text-xs'>
                            Data provided by{' '}
                            <a
                              href='https://trench.bot/'
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-cyan-400 hover:underline'>
                              Trench
                            </a>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <div className='text-xs text-zinc-400 mt-1'>
                    Analyze bundled wallets and their token control
                  </div>
                </div>
              </>
            )}
          </div>
          <div className='w-full h-0.5 bg-gradient-to-r from-cyan-500/20 to-transparent'></div>
        </CardHeader>
        <CardContent className='relative pt-2 pb-4'>
          {/* Error, Info, or Data */}
          {displayError ? (
            <div className='flex flex-col items-center justify-center text-center space-y-2 py-4'>
              <div className='flex items-center text-red-400'>
                <AlertTriangle className='h-4 w-4 mr-2' />
                <span className='font-medium text-sm'>Error Loading Bundles</span>
              </div>
              {displayError && onRetry && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={onRetry}
                  disabled={isRetrying}
                  className='border-red-500/40 text-red-300 hover:bg-red-950/50 hover:text-red-200 px-2 py-1 mt-2'>
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}
            </div>
          ) : isPumpOnlyMessage ? (
            <div className='flex flex-col items-center sm:items-start justify-center text-center sm:text-left space-y-2 py-4 px-2'>
              <span className='font-medium text-sm text-zinc-400'>{error}</span>
            </div>
          ) : (
            <>
              <div className='space-y-1'>
                <StatItem
                  icon={Percent}
                  label='Total % Bundled'
                  value={formattedTotalBundledPercent}
                  isLoading={isLoading}
                  tooltip='The total percentage of tokens that were bundled at any point. This includes tokens that have since been sold.'
                  severity={getTotalBundledSeverity()}
                />
                <StatItem
                  icon={ArrowDown}
                  label='Currently Held % (Important)'
                  value={formattedCurrentlyHeldPercent}
                  isLoading={isLoading}
                  tooltip='The percentage of tokens currently held by bundled wallets. This is the most important metric to watch - high values indicate potential manipulation risk.'
                  severity={getCurrentlyHeldSeverity()}
                />
                <StatItem
                  icon={CircleDollarSign}
                  label='Total SOL Spent'
                  value={formattedSolSpent}
                  isLoading={isLoading}
                  tooltip='The total amount of SOL spent by bundled wallets to acquire tokens.'
                />
                <StatItem
                  icon={Boxes}
                  label='Total Bundles'
                  value={bundleData?.total_bundles}
                  isLoading={isLoading}
                  tooltip='The number of distinct bundle groups identified.'
                />
                <StatItem
                  icon={Users}
                  label='Bundled Wallets'
                  value={bundleData?.bundles.reduce(
                    (sum, bundle) => sum + bundle.unique_wallets,
                    0,
                  )}
                  isLoading={isLoading}
                  tooltip='The total number of unique wallets participating in bundles.'
                />
              </div>

              {!isLoading && bundleData && currentlyHeldPercent > 10 && (
                <div className='mt-4 bg-red-950/30 p-3 rounded-lg border border-red-500/30 flex items-start'>
                  <AlertTriangle className='h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0' />
                  <div className='text-xs text-red-200'>
                    <strong className='text-red-400'>High Bundle Risk:</strong> Currently held
                    percentage is over {currentlyHeldPercent > 25 ? '25' : '10'}%, suggesting
                    significant control by coordinated wallets. Proceed with caution.
                  </div>
                </div>
              )}

              {!isLoading &&
                bundleData &&
                currentlyHeldPercent === 0 &&
                bundleData.total_percentage_bundled > 10 && (
                  <div className='mt-4 bg-green-950/30 p-3 rounded-lg border border-green-500/30 flex items-start'>
                    <CheckCircle2 className='h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0' />
                    <div className='text-xs text-green-200'>
                      <strong className='text-green-400'>Tokens Distributed:</strong> While{' '}
                      {bundleData.total_percentage_bundled.toFixed(2)}% of tokens were initially
                      bundled, those wallets are now holding 0% of the supply, indicating the tokens
                      have been distributed.
                    </div>
                  </div>
                )}

              {!isLoading && bundleData && bundleData.bundles && bundleData.bundles.length > 0 && (
                <div className='mt-4'>
                  <BundleTableDialog bundles={bundleData.bundles} isLoading={false} />
                </div>
              )}
            </>
          )}
        </CardContent>
        {!isLoading && !displayError && !isPumpOnlyMessage && (
          <CardFooter className='pt-0 pb-3 px-4'>
            <div className='w-full text-center text-xs text-zinc-500'>
              Bundle data is provided by{' '}
              <a
                href='https://trench.bot/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-cyan-500 hover:underline'>
                Trench.bot
              </a>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
