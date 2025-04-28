'use client';

import { SolscanButton } from '@/components/SolscanButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SingleBundleData } from '@dyor-hub/types';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  HelpCircle,
  ListFilter,
  Table as TableIcon,
  Users,
} from 'lucide-react';
import { Fragment, useState } from 'react';

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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleRow = (bundleId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bundleId)) {
        newSet.delete(bundleId);
      } else {
        newSet.add(bundleId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copied`,
        description: `${text} copied to clipboard.`,
      });
    });
  };

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
  const numColumns = 6;

  return (
    <div className={cn('space-y-4', className)}>
      <div className='w-full rounded-xl border border-zinc-800 overflow-x-auto bg-zinc-900/30 backdrop-blur-sm'>
        <div className='flex items-center justify-between px-4 py-2 bg-zinc-800/30 border-b border-zinc-700'>
          <div className='text-sm font-medium text-white flex items-center'>Bundle Details</div>
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className='cursor-help underline decoration-dotted decoration-zinc-500'>
                        Breakdown
                      </TooltipTrigger>
                      <TooltipContent className='max-w-xs'>
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
                const isExpanded = expandedRows.has(bundle.id);
                const isHighRisk = bundle.unique_wallets >= 5 && bundle.token_percentage > 5;
                const walletAddresses = bundle.wallet_info ? Object.keys(bundle.wallet_info) : [];

                return (
                  <Fragment key={bundle.id}>
                    <TableRow
                      className={cn(
                        'border-zinc-800/50 hover:bg-zinc-800/30',
                        isHighRisk && 'bg-red-900/10',
                        isExpanded && 'bg-zinc-700/30',
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
                        {walletAddresses.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <span className='cursor-help'>
                                <CategoryBadge category={bundle.bundle_analysis.primary_category} />
                              </span>
                            </PopoverTrigger>
                            <PopoverContent
                              side='top'
                              align='start'
                              className='w-auto max-w-xs max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800 p-2 bg-zinc-800 border-zinc-700 text-zinc-200 z-50'>
                              <div className='flex flex-col space-y-1'>
                                <p className='text-xs font-medium text-zinc-300 border-b border-zinc-700 pb-1 mb-1'>
                                  Bundled Wallets ({walletAddresses.length}):
                                </p>
                                {walletAddresses.map((address) => (
                                  <p key={address} className='text-xs font-mono text-zinc-400'>
                                    {address}
                                  </p>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <CategoryBadge category={bundle.bundle_analysis.primary_category} />
                        )}
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
                        <div
                          className='flex items-center justify-center space-x-1 cursor-pointer'
                          onClick={() => toggleRow(bundle.id)}>
                          {walletAddresses.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <span className='cursor-help underline decoration-dotted decoration-zinc-500'>
                                  {bundle.unique_wallets}
                                </span>
                              </PopoverTrigger>
                              <PopoverContent
                                side='top'
                                align='end'
                                className='w-auto max-w-xs max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800 p-2 bg-zinc-800 border-zinc-700 text-zinc-200 z-50'>
                                <div className='flex flex-col space-y-1'>
                                  <p className='text-xs font-medium text-zinc-300 border-b border-zinc-700 pb-1 mb-1'>
                                    Bundled Wallets ({walletAddresses.length}):
                                  </p>
                                  {walletAddresses.map((address) => (
                                    <p key={address} className='text-xs font-mono text-zinc-400'>
                                      {address}
                                    </p>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span>{bundle.unique_wallets}</span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className='h-3 w-3 text-zinc-400 flex-shrink-0' />
                          ) : (
                            <ChevronRight className='h-3 w-3 text-zinc-500 flex-shrink-0' />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className='bg-zinc-800/20 hover:bg-zinc-800/30'>
                        <TableCell colSpan={numColumns} className='p-0'>
                          <div className='p-4 space-y-4'>
                            <h4 className='text-xs font-medium text-zinc-300 flex items-center'>
                              <Users className='w-3.5 h-3.5 mr-1.5 text-cyan-400' />
                              Bundled Wallets ({walletAddresses.length})
                            </h4>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent pr-1'>
                              {walletAddresses.map((address) => {
                                // Generate a consistent color based on the address
                                const addressSum = address
                                  .split('')
                                  .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const hue = addressSum % 360;
                                const bgColor = `hsla(${hue}, 70%, 40%, 0.2)`;
                                const textColor = `hsla(${hue}, 90%, 70%, 1)`;

                                return (
                                  <div
                                    key={address}
                                    className='flex items-center gap-3 bg-zinc-800/70 backdrop-blur-sm border border-zinc-700/50 rounded-lg p-2 hover:bg-zinc-700/50 transition-colors group'>
                                    <Avatar className='h-7 w-7 bg-zinc-700/30 border border-zinc-600/30'>
                                      <AvatarFallback
                                        style={{ backgroundColor: bgColor, color: textColor }}
                                        className='text-[9px] font-mono'>
                                        {address.substring(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className='flex-1 min-w-0 font-mono text-xs text-zinc-300 truncate'>
                                      {address}
                                    </div>
                                    <div className='flex items-center gap-1 opacity-70 group-hover:opacity-100'>
                                      <Button
                                        variant='ghost'
                                        size='icon'
                                        className='h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700'
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(address, 'Wallet Address');
                                        }}
                                        title='Copy Address'>
                                        <Copy className='h-3 w-3' />
                                      </Button>
                                      <SolscanButton
                                        address={address}
                                        type='account'
                                        className='h-6 w-6 p-0 flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded-md cursor-pointer'>
                                        <ExternalLink className='h-3 w-3' />
                                      </SolscanButton>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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
