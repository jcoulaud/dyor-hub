'use client';

import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { tipping } from '@/lib/api';
import { DYORHUB_DECIMALS, DYORHUB_SYMBOL } from '@/lib/constants';
import { cn, formatPrice } from '@/lib/utils';
import { PaginatedTipsResponse, Tip } from '@dyor-hub/types';
import { format } from 'date-fns';
import { ExternalLink, Info, Loader2, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function TipsTable() {
  const [tipsData, setTipsData] = useState<PaginatedTipsResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    const loadTips = async () => {
      setIsLoading(true);
      try {
        const data = await tipping.getUserTipHistory({ page: currentPage, limit });
        setTipsData(data);
      } catch (error) {
        console.error('Failed to fetch tips:', error);
        setTipsData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadTips();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const formatAmount = (amount: number): string => {
    const displayAmount = amount / Math.pow(10, DYORHUB_DECIMALS);
    return formatPrice(displayAmount);
  };

  const formatDate = (timestamp: string | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return format(date, 'MM/dd/yyyy');
  };

  const getContentInfo = (tip: Tip): { label: string; link: string | null } => {
    if (!tip.context) return { label: 'Direct', link: null };
    const [type, id] = tip.context.split('/');

    switch (type) {
      case 'comment':
        if (!tip.tokenId) return { label: 'Comment', link: null };
        return {
          label: 'Comment',
          link: `/tokens/${tip.tokenId}/comments/${id}`,
        };
      case 'profile':
        const tipWithType = tip as Tip & { recipientUsername?: string };
        if (!tipWithType.recipientUsername) return { label: 'Profile', link: null };
        return {
          label: 'Profile',
          link: `/users/${tipWithType.recipientUsername}`,
        };
      case 'call':
        return { label: 'Prediction', link: `/token-calls/${id}` };
      default:
        return { label: type, link: null };
    }
  };

  const getSolscanUrl = (txHash: string): string => {
    return `https://solscan.io/tx/${txHash}`;
  };

  const getUserProfileUrl = (tip: Tip): string | null => {
    const userToLink = tip.type === 'Given' ? tip.recipientUsername : tip.senderUsername;

    if (userToLink) {
      return `/users/${userToLink}`;
    }

    return null;
  };

  const tips = tipsData?.data ?? [];
  const totalPages = tipsData?.meta?.totalPages ?? 1;

  return (
    <TooltipProvider>
      <div className='space-y-6'>
        <div className='rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <Table>
              {tips.length === 0 && !isLoading && (
                <TableCaption className='py-16'>
                  <div className='flex flex-col items-center justify-center text-muted-foreground'>
                    <div className='rounded-full bg-muted p-3 mb-3'>
                      <Tag className='h-6 w-6' />
                    </div>
                    <p>No tip history found.</p>
                  </div>
                </TableCaption>
              )}
              <TableHeader className='bg-muted/30'>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='w-[100px]'>Type</TableHead>
                  <TableHead>
                    <div className='flex items-center gap-1'>
                      Amount
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help' />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Amount in {DYORHUB_SYMBOL}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead className='w-[50px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-40 text-center'>
                      <div className='flex flex-col items-center justify-center gap-2'>
                        <Loader2 className='h-8 w-8 animate-spin text-primary/60' />
                        <span className='text-muted-foreground'>Loading tips...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}></TableCell>
                  </TableRow>
                ) : (
                  tips.map((tip) => {
                    const { label: contentLabel, link: contentLink } = getContentInfo(tip);
                    const isReceived = tip.type === 'Received';
                    const userProfileUrl = getUserProfileUrl(tip);
                    const displayName =
                      tip.type === 'Given' ? tip.recipientDisplayName : tip.senderDisplayName;

                    return (
                      <TableRow key={tip.id} className='group transition-colors hover:bg-muted/50'>
                        <TableCell className='py-4'>
                          <div
                            className={cn(
                              'inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium',
                              isReceived
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
                            )}>
                            {tip.type}
                          </div>
                        </TableCell>
                        <TableCell className='py-4 font-medium text-sm'>
                          {formatAmount(tip.amount)}
                        </TableCell>
                        <TableCell className='py-4'>
                          {userProfileUrl ? (
                            <Link
                              href={userProfileUrl}
                              className='text-primary font-medium hover:text-primary/80 hover:underline inline-flex items-center'>
                              {displayName || 'Unknown User'}
                            </Link>
                          ) : (
                            <span className='text-foreground font-medium'>
                              {displayName || 'Unknown User'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className='py-4 text-muted-foreground text-sm'>
                          {formatDate(tip.timestamp)}
                        </TableCell>
                        <TableCell className='py-4'>
                          {contentLink ? (
                            <Link
                              href={contentLink}
                              className='text-foreground hover:text-primary inline-flex items-center gap-1 rounded-md px-2 py-1 bg-muted/50 hover:bg-muted transition-colors text-sm'>
                              {contentLabel}
                            </Link>
                          ) : (
                            <span className='text-muted-foreground text-sm rounded-md px-2 py-1 bg-muted/30'>
                              {contentLabel}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className='py-4 text-right'>
                          {tip.transactionHash ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={getSolscanUrl(tip.transactionHash)}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='inline-flex items-center justify-center rounded-md w-8 h-8 bg-muted/50 text-muted-foreground hover:text-primary hover:bg-muted transition-colors'>
                                  <ExternalLink className='h-4 w-4' />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View on Solscan</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className='inline-block w-8'></span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && !isLoading && (
          <div className='flex justify-center mt-6 py-4 border-t border-border/60'>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
