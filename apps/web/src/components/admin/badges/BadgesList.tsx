'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { badges } from '@/lib/api';
import { BadgeFormValues, Badge as BadgeType } from '@dyor-hub/types';
import { Award, Edit, Eye, MoreHorizontal, Shield, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AwardBadgeDialog } from './AwardBadgeDialog';
import { BadgeDetailsDialog } from './BadgeDetailsDialog';
import { DeleteBadgeDialog } from './DeleteBadgeDialog';

interface BadgesListProps {
  category?: string;
}

export function BadgesList({ category }: BadgesListProps) {
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewBadge, setViewBadge] = useState<BadgeType | null>(null);
  const [editBadge, setEditBadge] = useState<BadgeType | null>(null);
  const [awardBadge, setAwardBadge] = useState<BadgeType | null>(null);
  const [deleteBadge, setDeleteBadge] = useState<BadgeType | null>(null);

  const { toast } = useToast();

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const badgesData = await badges.admin.getAllBadges();
      setAllBadges(badgesData || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load badges: ${errorMessage}`);
      toast({
        title: 'Badge Loading Error',
        description: `Failed to load badges: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const filteredBadges = allBadges.filter((badge) => {
    if (category && category !== 'all' && badge.category !== category) {
      return false;
    }
    return true;
  });

  const handleUpdateBadge = async (badgeId: string, values: BadgeFormValues) => {
    try {
      const updated = await badges.admin.updateBadge(badgeId, values);

      if (updated) {
        toast({
          title: 'Badge updated',
          description: `Badge "${values.name}" has been updated successfully.`,
        });

        // Refresh badges list
        fetchBadges();
        return Promise.resolve();
      } else {
        throw new Error('Failed to update badge');
      }
    } catch (error) {
      console.error('Error updating badge:', error);
      toast({
        title: 'Error',
        description: 'Failed to update badge. Please try again.',
        variant: 'destructive',
      });
      return Promise.reject(error);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    try {
      const success = await badges.admin.deleteBadge(badgeId);

      if (success) {
        toast({
          title: 'Badge deleted',
          description: 'Badge has been deleted successfully.',
        });

        // Refresh badges list
        fetchBadges();
        return Promise.resolve();
      } else {
        throw new Error('Failed to delete badge');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete badge. Please try again.',
        variant: 'destructive',
      });
      return Promise.reject(error);
    }
  };

  const handleAwardBadge = async (badgeId: string, userIds: string[]) => {
    try {
      const success = await badges.admin.awardBadgeToUsers(badgeId, userIds);

      if (success) {
        toast({
          title: 'Badge awarded',
          description: `Badge has been awarded to ${userIds.length} user(s).`,
        });

        // Refresh badges list
        fetchBadges();
        return Promise.resolve();
      } else {
        throw new Error('Failed to award badge');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to award badge. Please try again.',
        variant: 'destructive',
      });
      return Promise.reject(error);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'streak':
        return 'Streak';
      case 'content':
        return 'Content';
      case 'engagement':
        return 'Engagement';
      case 'voting':
        return 'Voting';
      case 'reception':
        return 'Reception';
      case 'quality':
        return 'Quality';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'streak':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'content':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'engagement':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'voting':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'reception':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'quality':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className='w-full py-12 text-center'>
        <p className='text-zinc-400'>Loading badges...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='w-full py-12 text-center'>
        <p className='text-red-500'>{error}</p>
        <Button onClick={fetchBadges} className='mt-4 bg-blue-600 hover:bg-blue-700 text-white'>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className='rounded-md border border-zinc-800 overflow-hidden'>
        <Table>
          <TableHeader className='bg-zinc-900/50'>
            <TableRow className='hover:bg-zinc-900/80 border-zinc-800'>
              <TableHead className='w-[280px] text-zinc-400'>Name</TableHead>
              <TableHead className='w-[100px] text-zinc-400'>Category</TableHead>
              <TableHead className='hidden md:table-cell w-[220px] text-zinc-400'>
                Requirement
              </TableHead>
              <TableHead className='text-right text-zinc-400'>Awarded</TableHead>
              <TableHead className='text-center text-zinc-400'>Status</TableHead>
              <TableHead className='text-right text-zinc-400'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBadges.length === 0 ? (
              <TableRow className='hover:bg-zinc-900/20 border-zinc-800'>
                <TableCell colSpan={6} className='h-24 text-center text-zinc-500'>
                  No badges found.
                </TableCell>
              </TableRow>
            ) : (
              filteredBadges.map((badge) => (
                <TableRow key={badge.id} className='hover:bg-zinc-900/20 border-zinc-800'>
                  <TableCell className='font-medium text-zinc-300'>
                    <div className='flex items-center gap-3'>
                      <Award className='h-5 w-5 text-zinc-500' />
                      <div>
                        <div>{badge.name}</div>
                        <div className='text-xs text-zinc-500 mt-1 max-w-[320px] truncate'>
                          {badge.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline' className={getCategoryColor(badge.category)}>
                      {getCategoryLabel(badge.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className='hidden md:table-cell text-zinc-400 whitespace-nowrap'>
                    {badge.requirement
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}{' '}
                    ≥ {badge.thresholdValue}
                  </TableCell>
                  <TableCell className='text-right font-medium text-zinc-300'>
                    {badge.awardCount}
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant='outline'
                      className={
                        badge.isActive
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }>
                      {badge.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          className='h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100'>
                          <span className='sr-only'>Open menu</span>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='bg-zinc-900 border-zinc-800'>
                        <DropdownMenuItem
                          className='text-zinc-300 hover:text-zinc-100 cursor-pointer'
                          onClick={() => setViewBadge(badge)}>
                          <Eye className='mr-2 h-4 w-4' />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='text-zinc-300 hover:text-zinc-100 cursor-pointer'
                          onClick={() => setEditBadge(badge)}>
                          <Edit className='mr-2 h-4 w-4' />
                          Edit Badge
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className='bg-zinc-800' />
                        <DropdownMenuItem
                          className='text-zinc-300 hover:text-zinc-100 cursor-pointer'
                          onClick={() => setAwardBadge(badge)}>
                          <Shield className='mr-2 h-4 w-4' />
                          Award to Users
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className='bg-zinc-800' />
                        <DropdownMenuItem
                          className='text-red-500 hover:text-red-400 cursor-pointer'
                          onClick={() => setDeleteBadge(badge)}>
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete Badge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Badge Details Dialog */}
      <BadgeDetailsDialog
        open={!!viewBadge}
        onOpenChange={(open) => !open && setViewBadge(null)}
        badge={viewBadge}
        mode='view'
      />

      {/* Edit Badge Dialog */}
      <BadgeDetailsDialog
        open={!!editBadge}
        onOpenChange={(open) => !open && setEditBadge(null)}
        badge={editBadge}
        mode='edit'
        onSave={handleUpdateBadge}
      />

      {/* Award Badge Dialog */}
      <AwardBadgeDialog
        open={!!awardBadge}
        onOpenChange={(open) => !open && setAwardBadge(null)}
        badge={awardBadge}
        onAward={handleAwardBadge}
      />

      {/* Delete Badge Dialog */}
      <DeleteBadgeDialog
        open={!!deleteBadge}
        onOpenChange={(open) => !open && setDeleteBadge(null)}
        badge={deleteBadge}
        onConfirm={handleDeleteBadge}
      />
    </>
  );
}
