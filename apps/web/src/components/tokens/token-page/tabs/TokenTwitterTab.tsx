'use client';

import LoadingSpinner from '@/components/ui/loading-spinner';
import { tokens } from '@/lib/api';
import { Token, TwitterFeedResponse, TwitterFeedTweet } from '@dyor-hub/types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Heart, MessageCircle, Repeat2, Twitter } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useEffect, useState } from 'react';

interface TokenTwitterTabProps {
  tokenData: Token | null;
}

interface TweetComponentProps {
  tweet: TwitterFeedTweet;
}

const TweetComponent = memo(function TweetComponent({ tweet }: TweetComponentProps) {
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatTweetText = (text: string): string => {
    let formattedText = text
      .replace(/https:\/\/t\.co\/\w+/g, '') // Remove t.co links
      .replace(/\n/g, '<br />') // Preserve line breaks
      .trim(); // Remove any extra whitespace

    // Handle mentions
    formattedText = formattedText.replace(/@(\w+)/g, (match, username) => {
      const replacement = `<a href="https://twitter.com/${username}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300">@${username}</a>`;
      return replacement;
    });

    // Handle hashtags
    formattedText = formattedText.replace(/#(\w+)/g, '<span class="text-blue-400">#$1</span>');

    // Handle other URLs
    formattedText = formattedText.replace(
      /(https?:\/\/(?!twitter\.com\/\w+)[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">$1</a>',
    );

    return formattedText;
  };

  const parseRetweetContent = (text: string) => {
    const retweetMatch = text.match(/^RT @(\w+):\s*([\s\S]*)/);
    if (retweetMatch) {
      return {
        isRetweet: true,
        retweetedUser: retweetMatch[1],
        content: retweetMatch[2],
      };
    }
    return {
      isRetweet: false,
      retweetedUser: null,
      content: text,
    };
  };

  const { isRetweet, retweetedUser, content } = parseRetweetContent(tweet.text);

  return (
    <div className='bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-6 backdrop-blur-sm'>
      {/* Retweet Header */}
      {isRetweet && (
        <div className='flex items-center gap-2 mb-3 text-zinc-400 text-sm'>
          <Repeat2 className='w-4 h-4' />
          <span>
            <a
              href={`https://twitter.com/${tweet.authorUsername}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-400 hover:text-blue-300'>
              @{tweet.authorUsername}
            </a>{' '}
            retweeted{' '}
            <a
              href={`https://twitter.com/${retweetedUser}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-400 hover:text-blue-300'>
              @{retweetedUser}
            </a>
          </span>
        </div>
      )}

      {/* Tweet Header */}
      <div className='flex items-start gap-3 mb-4'>
        {tweet.authorProfileImageUrl && (
          <div className='relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0'>
            <Image
              src={tweet.authorProfileImageUrl}
              alt={`${tweet.authorDisplayName} profile`}
              fill
              sizes='40px'
              className='object-cover'
              unoptimized
            />
          </div>
        )}
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold text-white text-sm'>{tweet.authorDisplayName}</span>
            <span className='text-zinc-400 text-sm'>@{tweet.authorUsername}</span>
          </div>
          <div className='flex items-center gap-2 text-zinc-500 text-xs'>
            <span>{formatDistanceToNow(parseISO(tweet.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
        <a
          href={`https://twitter.com/${tweet.authorUsername}/status/${tweet.id}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-400 hover:text-blue-300 transition-colors p-1'>
          <Twitter className='w-4 h-4' />
        </a>
      </div>

      {/* Tweet Content */}
      <div className='mb-4'>
        <div
          className='text-zinc-200 text-sm leading-relaxed'
          dangerouslySetInnerHTML={{ __html: formatTweetText(content) }}
        />
      </div>

      {/* Tweet Media */}
      {tweet.media && tweet.media.length > 0 && (
        <div className='mb-4'>
          <div
            className={`grid gap-2 ${tweet.media.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {tweet.media.slice(0, 4).map((media) => (
              <div
                key={media.mediaKey}
                className={`rounded-xl overflow-hidden border border-zinc-700/50 ${tweet.media && tweet.media.length === 1 ? 'max-w-lg w-full' : 'w-full'}`}>
                <div className='relative w-full h-0 pb-[75%]'>
                  {media.url ? (
                    <Image
                      src={media.url}
                      alt='Tweet media'
                      fill
                      sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                      className='absolute inset-0 object-cover'
                      unoptimized
                    />
                  ) : (
                    <div className='absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-400'>
                      No image available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tweet Metrics */}
      <div className='flex items-center gap-6 text-zinc-400 text-sm'>
        <div className='flex items-center gap-1.5'>
          <MessageCircle className='w-4 h-4' />
          <span>{formatCount(tweet.publicMetrics.replyCount)}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <Repeat2 className='w-4 h-4' />
          <span>{formatCount(tweet.publicMetrics.retweetCount)}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <Heart className='w-4 h-4' />
          <span>{formatCount(tweet.publicMetrics.likeCount)}</span>
        </div>
      </div>
    </div>
  );
});

export const TokenTwitterTab = memo(function TokenTwitterTab({ tokenData }: TokenTwitterTabProps) {
  const [twitterFeed, setTwitterFeed] = useState<TwitterFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTwitterFeed = useCallback(
    async (cursor?: string) => {
      if (!tokenData?.mintAddress || !tokenData?.twitterHandle) {
        setError('No Twitter handle available for this token');
        return;
      }

      const isInitialLoad = !cursor;
      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        const feedData = await tokens.getTwitterFeed(tokenData.mintAddress, cursor);

        if (feedData) {
          if (isInitialLoad) {
            setTwitterFeed(feedData);
          } else {
            setTwitterFeed((prev) => {
              if (!prev) return feedData;
              return {
                ...feedData,
                tweets: [...prev.tweets, ...feedData.tweets],
              };
            });
          }
        } else {
          setError('Failed to load Twitter feed');
        }
      } catch (err) {
        console.error('Error fetching Twitter feed:', err);
        setError('Failed to load Twitter feed');
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [tokenData?.mintAddress, tokenData?.twitterHandle],
  );

  useEffect(() => {
    if (tokenData?.twitterHandle) {
      fetchTwitterFeed();
    } else {
      setError('No Twitter handle available for this token');
    }
  }, [fetchTwitterFeed, tokenData?.twitterHandle]);

  const handleLoadMore = () => {
    if (twitterFeed?.meta.nextToken && !isLoadingMore) {
      fetchTwitterFeed(twitterFeed.meta.nextToken);
    }
  };

  if (!tokenData?.twitterHandle) {
    return (
      <div className='flex flex-col items-center justify-center py-16'>
        <div className='bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-8 text-center max-w-md'>
          <Twitter className='w-12 h-12 text-zinc-400 mx-auto mb-4' />
          <h3 className='text-xl font-semibold text-white mb-2'>No Twitter Account</h3>
          <p className='text-zinc-400'>
            This token doesn&apos;t have an associated Twitter account.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-16'>
        <LoadingSpinner size='lg' />
        <p className='text-zinc-400 mt-4'>Loading Twitter feed...</p>
      </div>
    );
  }

  if (error && !twitterFeed) {
    return (
      <div className='w-full'>
        <div className='bg-gradient-to-r from-red-600/20 to-red-500/20 border border-red-500/30 rounded-xl p-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='bg-red-500/20 p-3 rounded-xl'>
                <Twitter className='w-8 h-8 text-red-400' />
              </div>
              <div>
                <h3 className='text-xl font-semibold text-white mb-1'>
                  Failed to Load Twitter Feed
                </h3>
                <p className='text-red-200'>{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchTwitterFeed()}
              className='px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium cursor-pointer'>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!twitterFeed?.tweets?.length) {
    return (
      <div className='flex flex-col items-center justify-center py-16'>
        <div className='bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-8 text-center max-w-md'>
          <Twitter className='w-12 h-12 text-zinc-400 mx-auto mb-4' />
          <h3 className='text-xl font-semibold text-white mb-2'>No Tweets Found</h3>
          <p className='text-zinc-400'>No recent tweets found for @{tokenData.twitterHandle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6'>
        <div className='flex items-center gap-3'>
          <div className='bg-blue-500/20 p-3 rounded-xl'>
            <Twitter className='w-6 h-6 text-blue-400' />
          </div>
          <div>
            <h2 className='text-xl font-semibold text-white'>
              Recent tweets from @{tokenData.twitterHandle}
            </h2>
            <p className='text-blue-200 text-sm'>{twitterFeed.meta.resultCount} tweets loaded</p>
          </div>
        </div>
      </div>

      {/* Tweet Feed */}
      <div className='space-y-4'>
        {twitterFeed.tweets.map((tweet) => (
          <TweetComponent key={tweet.id} tweet={tweet} />
        ))}
      </div>

      {/* Load More Button */}
      {twitterFeed.meta.nextToken && (
        <div className='flex justify-center pt-6'>
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className='px-6 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white rounded-xl transition-colors border border-zinc-700/50 flex items-center gap-2'>
            {isLoadingMore ? (
              <>
                <LoadingSpinner size='sm' />
                Loading more tweets...
              </>
            ) : (
              'Load more tweets'
            )}
          </button>
        </div>
      )}
    </div>
  );
});
