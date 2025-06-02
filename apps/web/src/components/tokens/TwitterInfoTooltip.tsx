import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { tokens, users } from '@/lib/api';
import {
  TwitterCommunityInfo,
  TwitterTweetInfo,
  TwitterUserInfo,
  TwitterUsernameHistoryEntity,
} from '@dyor-hub/types';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, ExternalLink, Heart, MessageCircle, Repeat2, Twitter } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useState } from 'react';

interface BaseTwitterInfoTooltipProps {
  twitterHandle: string;
  hasUsernameHistory?: boolean;
  tokenHistoryData?: TwitterUsernameHistoryEntity | null;
  className?: string;
}

interface TokenTwitterInfoTooltipProps extends BaseTwitterInfoTooltipProps {
  mode: 'token';
  mintAddress: string;
}

interface UserTwitterInfoTooltipProps extends BaseTwitterInfoTooltipProps {
  mode: 'user';
  username: string;
}

type TwitterInfoTooltipProps = TokenTwitterInfoTooltipProps | UserTwitterInfoTooltipProps;

function isTwitterUser(
  data: TwitterUserInfo | TwitterCommunityInfo | TwitterTweetInfo,
): data is TwitterUserInfo {
  return 'userName' in data;
}

function isTwitterTweet(
  data: TwitterUserInfo | TwitterCommunityInfo | TwitterTweetInfo,
): data is TwitterTweetInfo {
  return 'text' in data && 'author' in data;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const TwitterInfoTooltip = memo((props: TwitterInfoTooltipProps) => {
  const {
    twitterHandle,
    hasUsernameHistory = false,
    tokenHistoryData = null,
    className = '',
  } = props;

  const [twitterInfo, setTwitterInfo] = useState<
    TwitterUserInfo | TwitterCommunityInfo | TwitterTweetInfo | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTwitterInfo = async () => {
      if (!twitterHandle) {
        return;
      }

      if (props.mode === 'token' && !props.mintAddress) {
        return;
      }

      if (props.mode === 'user' && !props.username) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let data;
        if (props.mode === 'token') {
          data = await tokens.getTwitterInfo(props.mintAddress);
        } else {
          data = await users.getTwitterInfo(props.username);
        }

        if (data) {
          setTwitterInfo(
            data as unknown as TwitterUserInfo | TwitterCommunityInfo | TwitterTweetInfo,
          );
        } else {
          setError('Twitter info not available');
        }
      } catch {
        setError('Failed to load Twitter info');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTwitterInfo();
  }, [twitterHandle, props]);

  const renderHistoryTooltipContent = () => {
    if (!tokenHistoryData?.history || tokenHistoryData.history.length === 0) {
      return (
        <div className='p-3'>
          <div className='flex items-center gap-2 mb-2'>
            <AlertTriangle className='w-4 h-4 text-orange-400' />
            <span className='font-medium text-white'>Username History</span>
          </div>
          <p className='text-sm text-zinc-400'>No username history available</p>
        </div>
      );
    }

    return (
      <div className='w-[280px] max-h-80 overflow-auto'>
        <div className='p-3 border-b border-zinc-800'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-zinc-300'>Twitter History</span>
            <div className='text-xs text-zinc-500'>@{twitterHandle}</div>
          </div>
        </div>
        <div className='p-2'>
          {[...tokenHistoryData.history].reverse().map((entry, index) => (
            <div
              key={index}
              className='flex items-center justify-between py-1.5 px-2 hover:bg-zinc-800/50 rounded-md'>
              <span className='text-sm font-medium text-red-400'>@{entry.username}</span>
              <span className='text-xs text-zinc-500'>
                {format(parseISO(entry.last_checked), 'MMM d, yyyy')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTooltipContent = () => {
    if (isLoading) {
      return (
        <div className='p-3'>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin' />
            <span className='text-sm text-zinc-300'>Loading Twitter info...</span>
          </div>
        </div>
      );
    }

    if (error || !twitterInfo) {
      return (
        <div className='p-3'>
          <div className='flex items-center gap-2 mb-2'>
            <Twitter className='w-4 h-4 text-blue-400' />
            <span className='font-medium text-white'>@{twitterHandle}</span>
          </div>
          <p className='text-sm text-zinc-400'>{error || 'Twitter information not available'}</p>
          <Link
            href={`https://twitter.com/${twitterHandle}`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors'>
            View on Twitter
            <ExternalLink className='w-3 h-3' />
          </Link>
        </div>
      );
    }

    if (isTwitterTweet(twitterInfo)) {
      // Twitter Tweet Info
      const tweet = twitterInfo;
      const tweetDate = tweet.createdAt
        ? format(new Date(tweet.createdAt), 'MMM d, yyyy')
        : 'Unknown';

      return (
        <div className='max-w-sm rounded-xl overflow-hidden'>
          {/* No banner for tweets, just content */}
          <div className='p-4 bg-zinc-900 rounded-xl'>
            {/* Header with author info */}
            <div className='flex items-start gap-3 mb-3'>
              <div className='w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0'>
                {tweet.author.profilePicture ? (
                  <img
                    src={tweet.author.profilePicture}
                    alt={tweet.author.name}
                    className='w-10 h-10 rounded-full object-cover'
                  />
                ) : (
                  <Twitter className='w-5 h-5 text-blue-400' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-white text-sm truncate'>{tweet.author.name}</span>
                  {tweet.author.isVerified && (
                    <svg
                      className='w-4 h-4 text-blue-400 flex-shrink-0'
                      viewBox='0 0 24 24'
                      fill='currentColor'>
                      <path d='M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z' />
                    </svg>
                  )}
                  {tweet.author.isBlueVerified && (
                    <div className='w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <svg
                        className='w-2.5 h-2.5 text-white'
                        fill='currentColor'
                        viewBox='0 0 20 20'>
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className='text-zinc-400 text-sm'>@{tweet.author.userName}</div>
              </div>
            </div>

            {/* Tweet text */}
            <div className='mb-3'>
              <p className='text-zinc-300 text-sm leading-relaxed line-clamp-4'>{tweet.text}</p>
            </div>

            {/* Tweet media */}
            {tweet.extendedEntities?.media && tweet.extendedEntities.media.length > 0 && (
              <div className='mb-3'>
                <div className='rounded-lg overflow-hidden border border-zinc-700/50'>
                  <img
                    src={tweet.extendedEntities.media[0].media_url_https}
                    alt='Tweet media'
                    className='w-full h-32 object-cover'
                  />
                </div>
              </div>
            )}

            {/* Tweet date */}
            <div className='flex items-center gap-1 mb-3'>
              <svg
                className='w-4 h-4 text-zinc-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z'
                />
              </svg>
              <span className='text-zinc-400 text-sm'>{tweetDate}</span>
            </div>

            {/* Tweet metrics */}
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-1'>
                <MessageCircle className='w-4 h-4 text-zinc-400' />
                <span className='text-zinc-400 text-sm'>{formatNumber(tweet.replyCount)}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Repeat2 className='w-4 h-4 text-zinc-400' />
                <span className='text-zinc-400 text-sm'>{formatNumber(tweet.retweetCount)}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Heart className='w-4 h-4 text-zinc-400' />
                <span className='text-zinc-400 text-sm'>{formatNumber(tweet.likeCount)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (isTwitterUser(twitterInfo)) {
      // Twitter User Info
      const user = twitterInfo;
      const accountAge = user.createdAt
        ? format(parseISO(user.createdAt), 'MMM d, yyyy')
        : 'Unknown';

      return (
        <div className='max-w-sm rounded-xl overflow-hidden'>
          {/* Banner/Cover Image */}
          <div className='h-20 bg-gradient-to-r from-blue-600 to-purple-600 relative'>
            {user.coverPicture ? (
              <img
                src={user.coverPicture}
                alt={`${user.name} cover`}
                className='w-full h-20 object-cover'
              />
            ) : (
              <div className='w-full h-20 bg-gradient-to-r from-blue-600 to-purple-600' />
            )}
          </div>

          <div className='p-4 bg-zinc-900'>
            {/* Header with profile info */}
            <div className='flex items-start gap-3 mb-3'>
              <div className='w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0'>
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className='w-12 h-12 rounded-full object-cover'
                  />
                ) : (
                  <Twitter className='w-6 h-6 text-blue-400' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-white text-sm truncate'>{user.name}</span>
                  {user.isVerified && (
                    <svg
                      className='w-4 h-4 text-blue-400 flex-shrink-0'
                      viewBox='0 0 24 24'
                      fill='currentColor'>
                      <path d='M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z' />
                    </svg>
                  )}
                  {user.isBlueVerified && (
                    <div className='w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0'>
                      <svg
                        className='w-2.5 h-2.5 text-white'
                        fill='currentColor'
                        viewBox='0 0 20 20'>
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className='text-zinc-400 text-sm'>@{user.userName}</div>
              </div>
            </div>

            {/* Description */}
            {user.description && (
              <div className='mb-3'>
                <p className='text-zinc-300 text-sm leading-relaxed line-clamp-3'>
                  {user.description}
                </p>
              </div>
            )}

            {/* Join date */}
            <div className='flex items-center gap-1 mb-3'>
              <svg
                className='w-4 h-4 text-zinc-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z'
                />
              </svg>
              <span className='text-zinc-400 text-sm'>Joined {accountAge}</span>
            </div>

            {/* Following and Followers */}
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-1'>
                <span className='text-white text-sm font-medium'>
                  {formatNumber(user.following)}
                </span>
                <span className='text-zinc-400 text-sm'>Following</span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='text-white text-sm font-medium'>
                  {formatNumber(user.followers)}
                </span>
                <span className='text-zinc-400 text-sm'>Followers</span>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Twitter Community Info
      const community = twitterInfo;
      const createdDate = community.created_at
        ? format(new Date(community.created_at), 'MMM d, yyyy')
        : 'Unknown';

      return (
        <div className='max-w-sm rounded-xl overflow-hidden'>
          {/* Banner/Cover Image */}
          <div className='h-20 bg-gradient-to-r from-orange-600 to-red-600 relative'>
            {community.banner_url ? (
              <img
                src={community.banner_url}
                alt={`${community.name} banner`}
                className='w-full h-20 object-cover'
              />
            ) : (
              <div className='w-full h-20 bg-gradient-to-r from-orange-600 to-red-600' />
            )}
          </div>

          <div className='p-4 bg-zinc-900'>
            {/* Header with community info */}
            <div className='flex items-start gap-3 mb-3'>
              <div className='w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0'>
                {community.banner_url ? (
                  <img
                    src={community.banner_url}
                    alt={community.name}
                    className='w-12 h-12 rounded-full object-cover'
                  />
                ) : (
                  <Twitter className='w-6 h-6 text-blue-400' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-white text-sm truncate'>{community.name}</span>
                  <div className='w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0'>
                    <svg className='w-2.5 h-2.5 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z' />
                    </svg>
                  </div>
                </div>
                <div className='text-zinc-400 text-sm'>Community</div>
              </div>
            </div>

            {/* Description */}
            {community.description && (
              <div className='mb-3'>
                <p className='text-zinc-300 text-sm leading-relaxed line-clamp-3'>
                  {community.description}
                </p>
              </div>
            )}

            {/* Created date with creator */}
            <div className='flex items-center gap-1 mb-3'>
              <svg
                className='w-4 h-4 text-zinc-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z'
                />
              </svg>
              <span className='text-zinc-400 text-sm'>
                Created {createdDate}
                {community.creator && community.creator.screen_name && (
                  <>
                    {' by '}
                    <Link
                      href={`https://twitter.com/${community.creator.screen_name}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors text-xs'>
                      @{community.creator.screen_name}
                    </Link>
                  </>
                )}
              </span>
            </div>

            {/* Members only (removed moderators) */}
            <div className='flex items-center gap-1'>
              <span className='text-white text-sm font-medium'>
                {formatNumber(community.member_count)}
              </span>
              <span className='text-zinc-400 text-sm'>Members</span>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className='relative'>
      {/* Twitter Info Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`https://twitter.com/${twitterHandle}`}
              target='_blank'
              rel='noopener noreferrer'
              className={`flex items-center justify-center w-8 h-8 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 rounded-lg hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all duration-200 cursor-pointer ${className}`}
              title='Twitter'>
              <Twitter className='w-4 h-4 text-blue-400' />
            </Link>
          </TooltipTrigger>
          <TooltipContent side='top' className='bg-zinc-900 border-zinc-700 max-w-none p-0'>
            {renderTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Warning Icon with History Tooltip - only for token mode */}
      {props.mode === 'token' && hasUsernameHistory && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className='absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full flex items-center justify-center z-20 cursor-pointer border border-zinc-900 hover:bg-orange-400 transition-colors'
                title='Twitter username history available'>
                <AlertTriangle className='w-2 h-2 text-white' />
              </div>
            </TooltipTrigger>
            <TooltipContent side='top' className='bg-zinc-900 border-zinc-700 max-w-none p-0'>
              {renderHistoryTooltipContent()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

TwitterInfoTooltip.displayName = 'TwitterInfoTooltip';

export default TwitterInfoTooltip;
