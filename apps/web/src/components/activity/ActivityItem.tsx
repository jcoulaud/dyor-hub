'use client';

import { ActivityType, FeedActivity, UserActivity } from '@dyor-hub/types';
import { formatDistanceStrict } from 'date-fns';
import { FileText, MessageSquare, Reply, Target, ThumbsDown, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComponentProps, ReactNode, memo } from 'react';
import { PredictionCardContent } from './PredictionCardContent';

function isFeedActivity(activity: FeedActivity | UserActivity): activity is FeedActivity {
  return (
    typeof (activity as FeedActivity).user === 'object' &&
    (activity as FeedActivity).user !== null &&
    'activityType' in activity
  );
}

const CommentContent = memo(({ html }: { html: string }) => {
  return (
    <div
      className='text-zinc-300 text-sm line-clamp-3 break-words'
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
CommentContent.displayName = 'CommentContent';

interface ActivityPresentation {
  typeLabel: string;
  icon: ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  iconBg: string;
}

const getActivityPresentation = (activity: FeedActivity | UserActivity): ActivityPresentation => {
  let type: ActivityType | string = 'unknown';
  let isReplyFlag = false;
  let isUpvoteFlag = false;
  let isDownvoteFlag = false;

  if (isFeedActivity(activity)) {
    type = activity.activityType;
    isReplyFlag = !!activity.comment?.isReply;
    if (type === ActivityType.UPVOTE) isUpvoteFlag = true;
    if (type === ActivityType.DOWNVOTE) isDownvoteFlag = true;
  } else {
    isReplyFlag = activity.isReply ?? false;
    isUpvoteFlag = activity.isUpvote ?? false;
    isDownvoteFlag = activity.isDownvote ?? false;
    if (isUpvoteFlag) type = ActivityType.UPVOTE;
    else if (isDownvoteFlag) type = ActivityType.DOWNVOTE;
    else type = ActivityType.COMMENT;
  }

  if (isUpvoteFlag) {
    return {
      typeLabel: 'Upvote',
      icon: <ThumbsUp className='h-4 w-4 text-green-400 opacity-100' />,
      color: 'text-green-400',
      borderColor: 'border-green-500/20 hover:border-green-500/30',
      bgColor: 'bg-green-900/20',
      iconBg: 'bg-zinc-800/80',
    };
  }
  if (isDownvoteFlag) {
    return {
      typeLabel: 'Downvote',
      icon: <ThumbsDown className='h-4 w-4 text-red-400 opacity-100' />,
      color: 'text-red-400',
      borderColor: 'border-red-500/20 hover:border-red-500/30',
      bgColor: 'bg-red-900/20',
      iconBg: 'bg-zinc-800/80',
    };
  }

  switch (type) {
    case ActivityType.COMMENT:
      return {
        typeLabel: isReplyFlag ? 'Reply' : 'Comment',
        icon: isReplyFlag ? (
          <Reply className='h-4 w-4 text-purple-400 opacity-100' />
        ) : (
          <MessageSquare className='h-4 w-4 text-blue-400 opacity-100' />
        ),
        color: isReplyFlag ? 'text-purple-400' : 'text-blue-400',
        borderColor: isReplyFlag
          ? 'border-purple-500/20 hover:border-purple-500/30'
          : 'border-blue-500/20 hover:border-blue-500/30',
        bgColor: isReplyFlag ? 'bg-purple-900/20' : 'bg-blue-900/20',
        iconBg: 'bg-zinc-800/80',
      };
    case ActivityType.POST:
      return {
        typeLabel: 'Post',
        icon: <FileText className='h-4 w-4 text-cyan-400 opacity-100' />,
        color: 'text-cyan-400',
        borderColor: 'border-cyan-500/20 hover:border-cyan-500/30',
        bgColor: 'bg-cyan-900/20',
        iconBg: 'bg-zinc-800/80',
      };
    case ActivityType.PREDICTION:
      return {
        typeLabel: 'Prediction',
        icon: <Target className='h-4 w-4 text-indigo-400 opacity-100' />,
        color: 'text-indigo-400',
        borderColor: 'border-indigo-500/20 hover:border-indigo-500/30',
        bgColor: 'bg-indigo-900/20',
        iconBg: 'bg-zinc-800/80',
      };
    default:
      return {
        typeLabel: String(type || 'Activity'),
        icon: <MessageSquare className='h-4 w-4 text-zinc-400 opacity-100' />,
        color: 'text-zinc-400',
        borderColor: 'border-zinc-700/30 hover:border-zinc-600/40',
        bgColor: 'bg-zinc-900/20',
        iconBg: 'bg-zinc-800/80',
      };
  }
};

const getActivityLink = (activity: FeedActivity | UserActivity): string => {
  if (isFeedActivity(activity)) {
    if (activity.activityType === ActivityType.PREDICTION && activity.tokenCall?.id) {
      return `/token-calls/${activity.tokenCall.id}`;
    }
    if (activity.comment?.tokenMintAddress && activity.comment?.id) {
      return `/tokens/${activity.comment.tokenMintAddress}/comments/${activity.comment.id}`;
    }
    return '#';
  } else {
    // UserActivity: check for prediction by presence of tokenCallId
    const userActivity = activity as UserActivity;
    if (
      'tokenCallId' in userActivity &&
      typeof userActivity.tokenCallId === 'string' &&
      userActivity.tokenCallId
    ) {
      return `/token-calls/${userActivity.tokenCallId}`;
    }
    if (userActivity.tokenMintAddress && userActivity.id) {
      return `/tokens/${userActivity.tokenMintAddress}/comments/${userActivity.id}`;
    }
    return '#';
  }
};

type ActivityItemProps = Omit<ComponentProps<'div'>, 'onClick'> & {
  activity: FeedActivity | UserActivity;
  showUser?: boolean;
  activityOwnerUsername?: string;
};

function getPredictionPercent(
  reference: number | null | undefined | string,
  target: number | null | undefined | string,
): string | null {
  const numReference = typeof reference === 'string' ? parseFloat(reference) : reference;
  const numTarget = typeof target === 'string' ? parseFloat(target) : target;

  if (
    typeof numReference !== 'number' ||
    typeof numTarget !== 'number' ||
    !isFinite(numReference) ||
    numReference === 0
  )
    return null;

  const percent = ((numTarget - numReference) / numReference) * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(0)}%`;
}

export const ActivityItem = memo(
  ({
    activity,
    showUser = false,
    activityOwnerUsername,
    className,
    ...props
  }: ActivityItemProps) => {
    const router = useRouter();

    const presentation = getActivityPresentation(activity);
    const linkTarget = getActivityLink(activity);
    const isFeed = isFeedActivity(activity);
    let activityType: ActivityType | string = 'unknown';
    if (isFeed) {
      activityType = activity.activityType;
    } else {
      if (activity.isUpvote) activityType = ActivityType.UPVOTE;
      else if (activity.isDownvote) activityType = ActivityType.DOWNVOTE;
      else activityType = ActivityType.COMMENT;
    }
    const isRemoved =
      !isFeed && (activity as UserActivity).isRemoved
        ? (activity as UserActivity).isRemoved
        : false;
    const isClickable = linkTarget !== '#' && !isRemoved;
    const activityDate = new Date(activity.createdAt);
    const timeAgo = formatDistanceStrict(activityDate, new Date()) + ' ago';
    const commentContent = isFeed ? activity.comment?.content : (activity as UserActivity).content;
    const commentUpvotes = isFeed
      ? (activity.comment?.upvotes ?? 0)
      : ((activity as UserActivity).upvotes ?? 0);
    const commentDownvotes = isFeed
      ? (activity.comment?.downvotes ?? 0)
      : ((activity as UserActivity).downvotes ?? 0);
    const isReply = isFeed
      ? !!activity.comment?.isReply
      : ((activity as UserActivity).isReply ?? false);
    const parentCommentContent = isFeed ? activity.comment?.parent?.content : undefined;
    const tokenSymbol = !isFeed ? (activity as UserActivity).tokenSymbol : undefined;
    const tokenMintAddress = isFeed
      ? (activity.comment?.tokenMintAddress ?? activity.tokenCall?.tokenMintAddress)
      : (activity as UserActivity).tokenMintAddress;
    const user = isFeed ? activity.user : undefined;
    const userDisplayName =
      user?.displayName ?? (showUser && !isFeed ? activityOwnerUsername : null);
    const username = user?.username ?? activityOwnerUsername;
    const userAvatar = user?.avatarUrl;
    const tokenCall = isFeed ? activity.tokenCall : undefined;

    let handleClick: React.MouseEventHandler<HTMLDivElement> | undefined = undefined;
    if (isClickable) {
      handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('a, button')) {
          return;
        }
        router.push(linkTarget);
      };
    }

    const wrapperBaseProps = {
      className: `block p-4 bg-zinc-900/30 backdrop-blur-sm border rounded-lg ${presentation.borderColor} ${isClickable ? 'hover:bg-zinc-900/50 cursor-pointer' : ''} ${isRemoved ? 'opacity-60 cursor-not-allowed' : !isClickable ? 'cursor-default' : ''} transition-all duration-200 ${className ?? ''}`,
      'aria-disabled': isRemoved || !isClickable,
      tabIndex: isRemoved || !isClickable ? -1 : 0,
    };

    const finalWrapperProps = {
      ...wrapperBaseProps,
      onClick: handleClick,
      ...props,
    };

    const predictionPercent =
      activityType === ActivityType.PREDICTION && tokenCall
        ? getPredictionPercent(tokenCall.referencePrice, tokenCall.targetPrice)
        : null;

    const Content = (
      <div className='flex gap-3 relative'>
        {showUser && username ? (
          <Link
            href={`/users/${username}`}
            className='relative flex-shrink-0'
            onClick={(e) => e.stopPropagation()}>
            {userAvatar ? (
              <div className='w-8 h-8 rounded-full bg-zinc-800 overflow-hidden'>
                <Image
                  src={userAvatar}
                  alt={userDisplayName || username}
                  width={32}
                  height={32}
                  className='object-cover w-full h-full'
                />
              </div>
            ) : (
              <div className='w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center font-semibold text-sm text-blue-300'>
                {(userDisplayName || username)?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </Link>
        ) : (
          <div className='w-8 h-8 flex-shrink-0' />
        )}
        <div className='flex-1 min-w-0'>
          <div className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-1 text-xs relative'>
            {showUser && userDisplayName && username && (
              <>
                <Link
                  href={`/users/${username}`}
                  className='font-medium text-blue-400 hover:underline'
                  onClick={(e) => e.stopPropagation()}>
                  {userDisplayName}
                </Link>
                <span className='text-zinc-500'>•</span>
              </>
            )}
            <span className={`font-medium ${presentation.color}`}>{presentation.typeLabel}</span>
            <span className='text-zinc-500'>•</span>
            <span className='text-zinc-500 whitespace-nowrap'>{timeAgo}</span>
            {tokenSymbol && tokenMintAddress && (
              <>
                <span className='text-zinc-500'>•</span>
                <Link
                  href={`/tokens/${tokenMintAddress}`}
                  className='text-zinc-400 hover:text-blue-400 hover:underline'
                  onClick={(e) => e.stopPropagation()}>
                  ${tokenSymbol}
                </Link>
              </>
            )}
          </div>
          {isRemoved ? (
            <p className='text-sm text-zinc-500 italic'>[Content removed]</p>
          ) : (
            <>
              {isReply && parentCommentContent && (
                <div className='mb-2 pb-2 border-b border-zinc-700/50'>
                  <div className='text-xs text-zinc-500 mb-1'>Replying to:</div>
                  <div
                    className='text-xs text-zinc-400 line-clamp-1'
                    dangerouslySetInnerHTML={{ __html: parentCommentContent ?? '' }}
                  />
                </div>
              )}
              {commentContent &&
                (activityType === ActivityType.COMMENT || activityType === ActivityType.POST) && (
                  <CommentContent html={commentContent} />
                )}
              {activityType === ActivityType.PREDICTION && tokenCall && (
                <div className='flex flex-col gap-2'>
                  <PredictionCardContent
                    tokenCall={tokenCall}
                    predictionPercent={predictionPercent}
                  />
                </div>
              )}
              {commentContent &&
                (activityType === ActivityType.UPVOTE ||
                  activityType === ActivityType.DOWNVOTE) && (
                  <div className='mt-1'>
                    <CommentContent html={commentContent} />
                  </div>
                )}
              {activityType !== ActivityType.PREDICTION && (
                <div className='flex items-center gap-3 mt-1.5 text-xs'>
                  <div className='flex items-center gap-1 text-green-400/90'>
                    <ThumbsUp className='h-3 w-3' />
                    <span>{commentUpvotes}</span>
                  </div>
                  <div className='flex items-center gap-1 text-red-400/90'>
                    <ThumbsDown className='h-3 w-3' />
                    <span>{commentDownvotes}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {activityType === ActivityType.PREDICTION && (
          <div className='flex-shrink-0 flex items-start pr-4 pt-1'>{presentation.icon}</div>
        )}
      </div>
    );

    return <div {...finalWrapperProps}>{Content}</div>;
  },
);

ActivityItem.displayName = 'ActivityItem';
