import { useToast } from '@/hooks/use-toast';
import { reputation } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import { ActivityPointsConfig, UserReputation } from '@dyor-hub/types';
import React, { useEffect, useState } from 'react';

export const ReputationAdmin: React.FC = () => {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pointsConfig, setPointsConfig] = useState<ActivityPointsConfig | null>(null);
  const [topUsers, setTopUsers] = useState<UserReputation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.isAdmin) {
        setError('Unauthorized access');
        return;
      }

      try {
        setLoading(true);

        const [pointsData, topUsersData] = await Promise.all([
          reputation.admin.getActivityPointValues(),
          reputation.getTopUsers(10),
        ]);

        setPointsConfig(pointsData);
        setTopUsers(topUsersData.users);
        setLoading(false);
      } catch {
        setError('Failed to fetch reputation data');
        toast({
          title: 'Error',
          description: 'Failed to fetch reputation data',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  if (loading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4'>
        <div className='bg-zinc-950 border border-zinc-800 rounded-lg p-6 animate-pulse'>
          <div className='h-6 bg-zinc-800 rounded mb-4 w-1/2'></div>
          <div className='space-y-2'>
            <div className='h-4 bg-zinc-800 rounded w-3/4'></div>
            <div className='h-4 bg-zinc-800 rounded w-2/3'></div>
            <div className='h-4 bg-zinc-800 rounded w-1/2'></div>
          </div>
        </div>
        <div className='bg-zinc-950 border border-zinc-800 rounded-lg p-6 animate-pulse'>
          <div className='h-6 bg-zinc-800 rounded mb-4 w-1/2'></div>
          <div className='space-y-3'>
            <div className='h-4 bg-zinc-800 rounded w-full'></div>
            <div className='h-4 bg-zinc-800 rounded w-full'></div>
            <div className='h-4 bg-zinc-800 rounded w-full'></div>
            <div className='h-4 bg-zinc-800 rounded w-full'></div>
            <div className='h-4 bg-zinc-800 rounded w-full'></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-zinc-950 border border-zinc-800 rounded-lg p-6'>
        <p className='text-red-500'>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className='mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md'>
          Retry
        </button>
      </div>
    );
  }

  if (!pointsConfig) {
    return (
      <div className='bg-zinc-950 border border-zinc-800 rounded-lg p-6'>
        No point configuration found
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      {/* Point Values */}
      <div className='bg-zinc-950 border border-zinc-800 rounded-lg p-6'>
        <h3 className='text-lg font-medium mb-4 text-zinc-200'>Reputation Point Values</h3>

        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-zinc-400'>Post Creation</span>
            <span className='font-semibold text-zinc-200'>{pointsConfig.post} points</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-zinc-400'>Comment</span>
            <span className='font-semibold text-zinc-200'>{pointsConfig.comment} points</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-zinc-400'>Upvote</span>
            <span className='font-semibold text-zinc-200'>{pointsConfig.upvote} points</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-zinc-400'>Downvote</span>
            <span className='font-semibold text-zinc-200'>{pointsConfig.downvote} points</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-zinc-400'>Login</span>
            <span className='font-semibold text-zinc-200'>{pointsConfig.login} points</span>
          </div>
          <div className='border-t border-zinc-800 my-3 pt-3'>
            <div className='flex items-center justify-between'>
              <span className='text-zinc-400'>Weekly Reduction</span>
              <span className='font-semibold text-zinc-200'>
                {pointsConfig.weeklyDecayPercentage}%
              </span>
            </div>
            <div className='flex items-center justify-between mt-2'>
              <span className='text-zinc-400'>Minimum Activity to Skip Reduction</span>
              <span className='font-semibold text-zinc-200'>
                {pointsConfig.minWeeklyActivityToPauseReduction} actions
              </span>
            </div>
          </div>

          {/* Reduction Tiers */}
          <div className='border-t border-zinc-800 my-3 pt-3'>
            <h4 className='text-sm font-medium mb-3 text-zinc-300'>Reduction Tiers</h4>

            {/* Bronze Tier */}
            <div className='mb-2 p-2 bg-zinc-900 rounded'>
              <div className='flex items-center justify-between'>
                <span className='text-amber-700 font-medium'>Bronze Tier</span>
                <span className='text-xs text-zinc-400'>
                  Up to {pointsConfig.reductionTiers.bronze.maxPoints} points
                </span>
              </div>
              <div className='flex items-center justify-between mt-1'>
                <span className='text-zinc-400 text-sm'>Maximum Reduction</span>
                <span className='font-semibold text-zinc-200'>
                  {pointsConfig.reductionTiers.bronze.maxReduction} points
                </span>
              </div>
            </div>

            {/* Silver Tier */}
            <div className='mb-2 p-2 bg-zinc-900 rounded'>
              <div className='flex items-center justify-between'>
                <span className='text-zinc-400 font-medium'>Silver Tier</span>
                <span className='text-xs text-zinc-400'>
                  Up to {pointsConfig.reductionTiers.silver.maxPoints} points
                </span>
              </div>
              <div className='flex items-center justify-between mt-1'>
                <span className='text-zinc-400 text-sm'>Maximum Reduction</span>
                <span className='font-semibold text-zinc-200'>
                  {pointsConfig.reductionTiers.silver.maxReduction} points
                </span>
              </div>
            </div>

            {/* Gold Tier */}
            <div className='mb-2 p-2 bg-zinc-900 rounded'>
              <div className='flex items-center justify-between'>
                <span className='text-amber-500 font-medium'>Gold Tier</span>
                <span className='text-xs text-zinc-400'>
                  Up to {pointsConfig.reductionTiers.gold.maxPoints} points
                </span>
              </div>
              <div className='flex items-center justify-between mt-1'>
                <span className='text-zinc-400 text-sm'>Maximum Reduction</span>
                <span className='font-semibold text-zinc-200'>
                  {pointsConfig.reductionTiers.gold.maxReduction} points
                </span>
              </div>
            </div>

            {/* Platinum Tier */}
            <div className='p-2 bg-zinc-900 rounded'>
              <div className='flex items-center justify-between'>
                <span className='text-cyan-400 font-medium'>Platinum Tier</span>
                <span className='text-xs text-zinc-400'>
                  Above {pointsConfig.reductionTiers.gold.maxPoints} points
                </span>
              </div>
              <div className='flex items-center justify-between mt-1'>
                <span className='text-zinc-400 text-sm'>Maximum Reduction</span>
                <span className='font-semibold text-zinc-200'>
                  {pointsConfig.reductionTiers.platinum.maxReduction} points
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className='bg-zinc-950 border border-zinc-800 rounded-lg p-6'>
        <h3 className='text-lg font-medium mb-4 text-zinc-200'>Top Users by Reputation</h3>

        {topUsers.length > 0 ? (
          <div className='space-y-2'>
            {topUsers.map((user, index) => (
              <div
                key={user.userId}
                className='flex items-center justify-between p-2 hover:bg-zinc-900 rounded'>
                <div className='flex items-center'>
                  <span className='w-5 text-center font-medium text-zinc-500 mr-3'>
                    {index + 1}
                  </span>
                  <span className='text-zinc-300'>{user.username}</span>
                </div>
                <div className='flex flex-col items-end'>
                  <span className='font-bold text-zinc-200'>{user.totalPoints}</span>
                  <span className='text-xs text-zinc-500'>{user.weeklyPoints} this week</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-zinc-500'>No reputation data available yet.</p>
        )}
      </div>
    </div>
  );
};
