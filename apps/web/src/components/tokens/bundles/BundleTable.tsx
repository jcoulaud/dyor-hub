'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SingleBundleData } from '@dyor-hub/types';
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  HelpCircle,
  InfoIcon,
  ListFilter,
  Table as TableIcon,
  Users,
} from 'lucide-react';

interface BundleTableProps {
  bundles: SingleBundleData[];
  isLoading: boolean;
  className?: string;
}

const formatCategoryBreakdown = (breakdown: Record<string, number>): string => {
  const parts = [];
  if (breakdown.sniper) parts.push(`S: ${breakdown.sniper}`);
  if (breakdown.new_wallet) parts.push(`N: ${breakdown.new_wallet}`);
  if (breakdown.regular) parts.push(`R: ${breakdown.regular}`);
  return parts.join(', ');
};

const CategoryBadge = ({ category }: { category: string }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
  const className = 'capitalize';

  switch (category?.toLowerCase()) {
    case 'sniper':
      variant = 'destructive';
      break;
    case 'new_wallet':
      variant = 'outline';
      break;
    case 'regular':
      variant = 'default';
      break;
  }

  const additionalClass =
    category?.toLowerCase() === 'new_wallet' ? 'border-green-500/50 text-green-400' : '';

  return (
    <Badge variant={variant} className={cn('text-xs px-1.5 py-0.5', className, additionalClass)}>
      {category}
    </Badge>
  );
};

export const BundleTableDialog = ({ bundles, isLoading }: BundleTableProps) => {
  if (isLoading || !bundles || bundles.length === 0) {
    return null;
  }

  return (
    <div className='mt-4'>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='bg-zinc-900/60 border-zinc-700/50 hover:bg-zinc-800/80 w-full'>
            <TableIcon className='w-4 h-4 mr-2' />
            View {bundles.length} Bundle{bundles.length !== 1 ? 's' : ''} Details
            <ChevronRight className='w-4 h-4 ml-auto' />
          </Button>
        </DialogTrigger>
        <DialogContent className='max-w-2xl max-h-[70vh] flex flex-col bg-zinc-900/95 border-zinc-700'>
          <DialogHeader className='pb-2'>
            <DialogTitle className='text-zinc-100 flex items-center'>
              <ListFilter className='w-4 h-4 mr-2 text-cyan-400' />
              Bundle Analysis Details
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600 flex-1 mt-2'>
            <BundleTable bundles={bundles} isLoading={false} className='w-full' />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const BundleTable = ({ bundles, isLoading, className }: BundleTableProps) => {
  if (isLoading) {
    return (
      <div className='rounded-xl border border-zinc-800 overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='border-zinc-800 hover:bg-transparent'>
              {[...Array(6)].map((_, i) => (
                <TableHead key={i} className='px-3 py-2 h-10'>
                  <Skeleton className='h-4 w-full' />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className='border-zinc-800/50'>
                {[...Array(6)].map((_, j) => (
                  <TableCell key={j} className='px-3 py-2 h-12'>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!bundles || bundles.length === 0) {
    return (
      <div className='text-center text-zinc-500 py-8 bg-zinc-900/30 rounded-xl border border-zinc-800'>
        No bundle data available for this token.
      </div>
    );
  }

  const sortedBundles = [...bundles].sort((a, b) => b.token_percentage - a.token_percentage);

  return (
    <div className={cn('space-y-4', className)}>
      <div className='w-full rounded-xl border border-zinc-800 overflow-x-auto bg-zinc-900/30 backdrop-blur-sm'>
        <div className='flex items-center justify-between px-4 py-2 bg-zinc-800/30 border-b border-zinc-700'>
          <div className='text-sm font-medium text-white flex items-center'>
            Bundle Details
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-6 w-6 p-0 ml-1 text-zinc-400'>
                    <InfoIcon className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className='max-w-72'>
                  <p className='text-xs mb-1'>
                    <strong>Legend:</strong>
                  </p>
                  <p className='text-xs mb-1'>
                    • <strong>S:</strong> Sniper wallets (often suspicious)
                  </p>
                  <p className='text-xs mb-1'>
                    • <strong>N:</strong> New wallets (recently created)
                  </p>
                  <p className='text-xs'>
                    • <strong>R:</strong> Regular wallets (established)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className='text-xs text-zinc-400'>{sortedBundles.length} bundle groups detected</div>
        </div>

        <div className='w-full'>
          <Table className='text-xs w-full border-collapse'>
            <TableHeader>
              <TableRow className='border-zinc-800 hover:bg-transparent'>
                <TableHead className='px-3 py-2 text-zinc-400 whitespace-nowrap text-center'>
                  Likely
                </TableHead>
                <TableHead className='px-3 py-2 text-zinc-400 whitespace-nowrap'>Type</TableHead>
                <TableHead className='px-3 py-2 text-zinc-400 whitespace-nowrap'>
                  Breakdown
                </TableHead>
                <TableHead className='px-3 py-2 text-zinc-400 whitespace-nowrap text-right'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className='cursor-help'>% Supply</TooltipTrigger>
                      <TooltipContent>
                        <p className='text-xs'>
                          Percentage of token supply initially purchased by this bundle group
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className='px-3 py-2 text-zinc-400 whitespace-nowrap text-right'>
                  <div className='flex items-center justify-end'>
                    <CircleDollarSign className='w-3 h-3 mr-1 text-yellow-400' /> SOL
                  </div>
                </TableHead>
                <TableHead className='px-3 py-2 text-zinc-400 whitespace-nowrap text-right'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className='cursor-help flex items-center justify-end'>
                        <Users className='w-3 h-3 mr-1' /> Wallets
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='text-xs'>
                          Number of wallets in this bundle group. 3+ wallets in the same bundle is a
                          potential red flag.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBundles.map((bundle) => {
                const isHighRisk = bundle.unique_wallets >= 5 && bundle.token_percentage > 5;

                return (
                  <TableRow
                    key={bundle.id}
                    className={cn(
                      'border-zinc-800/50 hover:bg-zinc-800/30',
                      isHighRisk && 'bg-red-900/10',
                    )}>
                    <TableCell className='px-3 py-2 text-center'>
                      {bundle.bundle_analysis.is_likely_bundle ? (
                        <span title='Likely Bundle'>
                          <CheckCircle2 className='w-4 h-4 text-green-500 mx-auto' />
                        </span>
                      ) : (
                        <span title='Unlikely Bundle'>
                          <HelpCircle className='w-4 h-4 text-zinc-500 mx-auto' />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='px-3 py-2'>
                      <CategoryBadge category={bundle.bundle_analysis.primary_category} />
                    </TableCell>
                    <TableCell className='px-3 py-2 font-mono text-zinc-400 truncate'>
                      {formatCategoryBreakdown(bundle.bundle_analysis.category_breakdown)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-3 py-2 text-right font-medium',
                        bundle.token_percentage > 10
                          ? 'text-red-400'
                          : bundle.token_percentage > 5
                            ? 'text-amber-400'
                            : 'text-white',
                      )}>
                      {bundle.token_percentage.toFixed(2)}%
                    </TableCell>
                    <TableCell className='px-3 py-2 text-right font-medium text-white'>
                      {bundle.total_sol.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-3 py-2 text-right font-medium',
                        bundle.unique_wallets >= 5
                          ? 'text-red-400'
                          : bundle.unique_wallets >= 3
                            ? 'text-amber-400'
                            : 'text-white',
                      )}>
                      {bundle.unique_wallets}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className='text-xs text-zinc-500 px-2'>
        <p>
          Bundle data powered by{' '}
          <a
            href='https://docs.trench.bot/bundle-tools/bundle-scanner-guide'
            target='_blank'
            rel='noopener noreferrer'
            className='text-cyan-500 hover:underline'>
            Trench
          </a>
          . Bundle detection shows wallets buying in the same slot (0.4s window) which indicates
          coordinated purchases.
        </p>
      </div>
    </div>
  );
};
