'use client';

import { useToast } from '@/hooks/use-toast';
import { comments } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { Comment, CreateCommentDto, VoteType } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowBigDown,
  ArrowBigUp,
  ChevronDown,
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from '../auth/AuthModal';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { CommentInput } from './CommentInput';

interface CommentSectionProps {
  tokenMintAddress: string;
}

type CommentType = Comment & {
  replies?: CommentType[];
};

type SortOption = 'best' | 'new' | 'old' | 'controversial';

export function CommentSection({ tokenMintAddress }: CommentSectionProps) {
  const [commentsList, setComments] = useState<CommentType[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('best');
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();

  const organizeComments = useCallback(
    (comments: CommentType[]) => {
      const commentMap = new Map<string, CommentType>();
      const rootComments: CommentType[] = [];

      // First pass: Create a map of all comments
      comments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: Organize into tree structure
      comments.forEach((comment) => {
        const processedComment = commentMap.get(comment.id)!;
        if (comment.parentId) {
          const parent = commentMap.get(comment.parentId);
          if (parent) {
            parent.replies?.push(processedComment);
          }
        } else {
          rootComments.push(processedComment);
        }
      });

      // Sort comments based on selected option
      const sortComments = (commentsToSort: CommentType[]) => {
        const sortFn = {
          best: (a: CommentType, b: CommentType) => b.voteCount - a.voteCount,
          new: (a: CommentType, b: CommentType) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          old: (a: CommentType, b: CommentType) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          controversial: (a: CommentType, b: CommentType) =>
            Math.abs(a.voteCount) - Math.abs(b.voteCount),
        }[sortBy];

        commentsToSort.sort(sortFn);
        commentsToSort.forEach((comment) => {
          if (comment.replies?.length) {
            sortComments(comment.replies);
          }
        });
      };

      sortComments(rootComments);
      return rootComments;
    },
    [sortBy],
  );

  const fetchComments = useCallback(async () => {
    try {
      const data = await comments.list(tokenMintAddress);
      const processedComments = data.map((comment) => ({
        ...comment,
        replies: [],
      }));
      setComments(organizeComments(processedComments));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setIsLoading(false);
    }
  }, [tokenMintAddress, organizeComments]);

  // Fetch comments when component mounts or auth state changes
  useEffect(() => {
    if (!authLoading) {
      fetchComments();
    }
  }, [authLoading, isAuthenticated, fetchComments]);

  const withAuth = async (action: () => Promise<void>) => {
    if (authLoading) {
      return;
    }

    if (isAuthenticated) {
      await action();
      return;
    }

    setPendingAction(() => action);
    setShowAuthModal(true);
  };

  const handleVote = async (commentId: string, type: VoteType) => {
    await withAuth(async () => {
      try {
        const response = await comments.vote(commentId, type);

        setComments((prevComments) => {
          const updateCommentVotes = (comments: CommentType[]): CommentType[] => {
            return comments.map((comment) => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  voteCount: response.upvotes - response.downvotes,
                  userVoteType: response.userVoteType,
                };
              }

              if (comment.replies?.length) {
                return {
                  ...comment,
                  replies: updateCommentVotes(comment.replies),
                };
              }

              return comment;
            });
          };

          return updateCommentVotes(prevComments);
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to vote',
          variant: 'destructive',
        });
      }
    });
  };

  const handleSubmitComment = async (parentId?: string, content?: string) => {
    const commentContent = content || newComment.trim();
    if (!commentContent) return;

    await withAuth(async () => {
      try {
        const createCommentDto: CreateCommentDto = {
          content: commentContent,
          tokenMintAddress,
          parentId,
        };

        await comments.create(createCommentDto);
        setNewComment('');
        setReplyingTo(null);
        await fetchComments();

        toast({
          title: 'Success',
          description: 'Comment posted successfully',
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to post comment',
          variant: 'destructive',
        });
      }
    });
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPendingAction(null);
  };

  const handleRemoveComment = useCallback(
    async (commentId: string) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        setPendingAction(() => async () => handleRemoveComment(commentId));
        return;
      }

      try {
        await comments.remove(commentId);
        await fetchComments();
        toast({
          title: 'Comment removed',
          description: 'The comment has been removed successfully.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to remove the comment. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [isAuthenticated, fetchComments, toast],
  );

  const Comment = ({ comment, depth = 0 }: { comment: CommentType; depth?: number }) => {
    const [showReply, setShowReply] = useState(false);
    const maxDepth = 5;
    const isCommentOwner = user?.id === comment.user.id;
    const canRemove = (user?.isAdmin ?? false) || isCommentOwner;

    const handleReply = async (content: string) => {
      await handleSubmitComment(comment.id, content);
      setShowReply(false);
    };

    return (
      <div
        className={cn(
          'group/comment rounded-md transition-colors duration-150 w-full pr-2 sm:pr-4',
          depth > 0 && 'border-l-2 pl-2 sm:pl-4 ml-2 sm:ml-4',
          depth === 1 && 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/[0.03]',
          depth === 2 && 'border-purple-500/20 hover:border-purple-500/40 bg-purple-500/[0.03]',
          depth === 3 && 'border-pink-500/20 hover:border-pink-500/40 bg-pink-500/[0.03]',
          depth === 4 && 'border-orange-500/20 hover:border-orange-500/40 bg-orange-500/[0.03]',
          depth >= 5 && 'border-gray-500/20 hover:border-gray-500/40 bg-gray-500/[0.03]',
          comment.isRemoved && 'opacity-90',
        )}>
        <div className='py-2 sm:py-3'>
          <div className='flex gap-2 sm:gap-3'>
            <Avatar className='h-6 w-6 sm:h-[28px] sm:w-[28px] flex-shrink-0'>
              <AvatarImage src={comment.user.avatarUrl} alt={comment.user.displayName} />
              <AvatarFallback>{comment.user.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <div className='flex flex-wrap items-center gap-x-2 text-sm'>
                <span
                  className={cn(
                    'font-medium truncate',
                    comment.isRemoved && 'text-muted-foreground/70',
                  )}>
                  {comment.user.displayName}
                </span>
                <span className='text-muted-foreground text-xs'>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p
                className={cn(
                  'mt-1 text-sm break-words whitespace-pre-wrap',
                  comment.isRemoved && 'text-muted-foreground/60 italic',
                )}>
                {comment.isRemoved ? 'Comment removed by user' : comment.content}
              </p>
              <div className='mt-2 flex items-center gap-2 text-sm'>
                <div className='flex items-center'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={cn(
                      'h-8 w-8 hover:text-green-500',
                      comment.isRemoved && 'opacity-50',
                    )}
                    onClick={() => handleVote(comment.id, 'upvote')}
                    disabled={comment.isRemoved}>
                    <ArrowBigUp
                      className={cn(
                        'h-5 w-5',
                        comment.userVoteType === 'upvote' && 'fill-green-500 text-green-500',
                      )}
                    />
                  </Button>
                  <span
                    className={cn(
                      'min-w-[2ch] text-center',
                      comment.isRemoved && 'text-muted-foreground/60',
                      !comment.isRemoved && comment.userVoteType === 'upvote' && 'text-green-500',
                      !comment.isRemoved && comment.userVoteType === 'downvote' && 'text-red-500',
                    )}>
                    {comment.voteCount}
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={cn('h-8 w-8 hover:text-red-500', comment.isRemoved && 'opacity-50')}
                    onClick={() => handleVote(comment.id, 'downvote')}
                    disabled={comment.isRemoved}>
                    <ArrowBigDown
                      className={cn(
                        'h-5 w-5',
                        comment.userVoteType === 'downvote' && 'fill-red-500 text-red-500',
                      )}
                    />
                  </Button>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 px-2 text-xs'
                  onClick={() => setShowReply(!showReply)}
                  disabled={comment.isRemoved}>
                  <MessageSquare className='mr-1 h-4 w-4' />
                  Reply
                </Button>
                {canRemove && !comment.isRemoved && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='sm' className='h-8 w-8 p-0 hover:bg-accent/50'>
                        <MoreHorizontal className='h-3 w-3 text-muted-foreground/70' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='min-w-[140px]'>
                      <DropdownMenuItem
                        className='text-xs text-red-600 hover:text-red-600 hover:bg-accent/50 focus:text-red-600 focus:bg-accent/50 cursor-pointer'
                        onClick={() => handleRemoveComment(comment.id)}>
                        <Trash2 className='mr-2 h-4 w-4' />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {showReply && (
                <div className='mt-3'>
                  <CommentInput
                    onSubmit={handleReply}
                    onCancel={() => setShowReply(false)}
                    submitLabel='Reply'
                    placeholder='Write a reply...'
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className='space-y-2 sm:space-y-3'>
            {comment.replies.map((reply) => (
              <Comment key={reply.id} comment={reply} depth={Math.min(depth + 1, maxDepth)} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <Card key={i} className='p-4 animate-pulse'>
            <div className='flex gap-3'>
              <div className='w-10 h-20 bg-gray-200 rounded'></div>
              <div className='flex-1 space-y-2'>
                <div className='h-5 bg-gray-200 rounded w-1/4'></div>
                <div className='h-4 bg-gray-200 rounded w-3/4'></div>
                <div className='h-4 bg-gray-200 rounded w-1/2'></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className='p-6 text-center'>
        <div className='text-red-500 mb-3'>Error: {error}</div>
        <Button onClick={() => fetchComments()} variant='outline'>
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className='space-y-4 w-full'>
        <CommentInput
          onSubmit={(content) => handleSubmitComment(undefined, content)}
          onCancel={() => setNewComment('')}
          placeholder='What are your thoughts?'
          className='w-full'
        />

        <div className='flex items-center pb-2 w-full'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='sm' className='text-sm text-gray-500'>
                Sort by: <span className='font-medium ml-1 capitalize'>{sortBy}</span>
                <ChevronDown className='ml-1 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(['best', 'new', 'old', 'controversial'] as const).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setSortBy(option)}
                  className='capitalize'>
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {commentsList.length > 0 ? (
          <div className='space-y-3 w-full'>
            {commentsList.map((comment) => (
              <Comment key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <Card className='p-6 text-center text-gray-500 w-full'>
            <MessageSquare className='h-12 w-12 mx-auto mb-3 text-gray-400' />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </Card>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onAuthSuccess={pendingAction ?? undefined}
      />
    </>
  );
}
