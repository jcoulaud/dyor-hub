'use client';

import { useToast } from '@/hooks/use-toast';
import { comments } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { CreateCommentDto, VoteType } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';
import { ArrowBigDown, ArrowBigUp, ChevronDown, MessageSquare } from 'lucide-react';
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

interface CommentType {
  id: string;
  content: string;
  createdAt: string;
  voteCount: number;
  parentId: string | null;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
  };
  userVoteType: VoteType | null;
  replies?: CommentType[];
}

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
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);

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
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toString(),
        voteCount: comment.voteCount,
        parentId: comment.parentId || null,
        user: {
          id: comment.user.id,
          displayName: comment.user.displayName,
          avatarUrl: comment.user.avatarUrl,
        },
        userVoteType: comment.userVoteType || null,
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

  const Comment = ({ comment, depth = 0 }: { comment: CommentType; depth?: number }) => {
    const [showReply, setShowReply] = useState(false);
    const maxDepth = 5;

    const handleReply = async (content: string) => {
      await handleSubmitComment(comment.id, content);
      setShowReply(false);
    };

    return (
      <div
        className={cn(
          'group/comment rounded-md transition-colors duration-150',
          depth > 0 && 'border-l-2 pl-4 ml-4',
          depth === 1 && 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/[0.03]',
          depth === 2 && 'border-purple-500/20 hover:border-purple-500/40 bg-purple-500/[0.03]',
          depth === 3 && 'border-pink-500/20 hover:border-pink-500/40 bg-pink-500/[0.03]',
          depth === 4 && 'border-orange-500/20 hover:border-orange-500/40 bg-orange-500/[0.03]',
          depth >= 5 && 'border-gray-500/20 hover:border-gray-500/40 bg-gray-500/[0.03]',
        )}>
        <div className='py-3'>
          <div className='flex gap-3'>
            <Avatar className='h-[28px] w-[28px] flex-shrink-0'>
              <AvatarImage src={comment.user.avatarUrl} alt={comment.user.displayName} />
              <AvatarFallback>{comment.user.displayName.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 text-sm'>
                <span className='font-semibold hover:text-primary cursor-pointer transition-colors'>
                  {comment.user.displayName}
                </span>
                <span className='text-muted-foreground text-xs'>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>

              <div className='text-sm mt-2 mb-3 leading-relaxed'>{comment.content}</div>

              <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={cn(
                      'h-auto p-0',
                      'hover:text-emerald-500 transition-colors',
                      comment.userVoteType === 'upvote' && 'text-emerald-500',
                    )}
                    onClick={() => handleVote(comment.id, 'upvote')}>
                    <ArrowBigUp className='h-4 w-4' />
                  </Button>
                  <span className='min-w-[2ch] text-center'>{comment.voteCount}</span>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={cn(
                      'h-auto p-0',
                      'hover:text-red-500 transition-colors',
                      comment.userVoteType === 'downvote' && 'text-red-500',
                    )}
                    onClick={() => handleVote(comment.id, 'downvote')}>
                    <ArrowBigDown className='h-4 w-4' />
                  </Button>
                </div>

                <Button
                  variant='ghost'
                  size='sm'
                  className='h-auto p-0 hover:text-primary flex items-center gap-1'
                  onClick={() => setShowReply(!showReply)}>
                  <MessageSquare className='h-3.5 w-3.5' />
                  Reply
                </Button>
              </div>

              {showReply && (
                <div className='mt-4'>
                  <CommentInput
                    onSubmit={handleReply}
                    onCancel={() => setShowReply(false)}
                    autoFocus
                    submitLabel='Reply'
                    placeholder='What are your thoughts?'
                  />
                </div>
              )}

              {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
                <div className='mt-4 space-y-2'>
                  {comment.replies.map((reply) => (
                    <Comment key={reply.id} comment={reply} depth={depth + 1} />
                  ))}
                  {depth === maxDepth - 1 && comment.replies.length > 0 && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-xs text-muted-foreground hover:text-primary mt-2'
                      onClick={() => window.open(`/comments/${comment.id}`, '_blank')}>
                      Continue this thread →
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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
      <div className='space-y-4'>
        <CommentInput
          onSubmit={(content) => handleSubmitComment(undefined, content)}
          onCancel={() => setNewComment('')}
          placeholder='What are your thoughts?'
        />

        <div className='flex items-center pb-2'>
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
          <div className='space-y-3'>
            {commentsList.map((comment) => (
              <Comment key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <Card className='p-6 text-center text-gray-500'>
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
