'use client';

import { useToast } from '@/hooks/use-toast';
import { comments } from '@/lib/api';
import { cn, getHighResAvatar } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import type { Comment, CreateCommentDto, VoteType } from '@dyor-hub/types';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowLeft,
  ChevronDown,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthModal } from '../auth/AuthModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { AdminModeration } from './AdminModeration';
import { CommentInput } from './CommentInput';
import { CopyLinkButton } from './CopyLinkButton';
import { TwitterShareButton } from './TwitterShareButton';

interface CommentSectionProps {
  tokenMintAddress: string;
  commentId?: string;
}

type CommentType = Comment & {
  replies?: CommentType[];
};

type SortOption = 'best' | 'new' | 'old' | 'controversial';

export function CommentSection({ tokenMintAddress, commentId }: CommentSectionProps) {
  const [commentsList, setComments] = useState<CommentType[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('best');
  const [previousSort, setPreviousSort] = useState<SortOption | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSpecificComment, setIsLoadingSpecificComment] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasScrolled = useRef(false);
  const userHasInteracted = useRef(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const router = useRouter();
  const [focusedComment, setFocusedComment] = useState<CommentType | null>(null);
  const [threadComments, setThreadComments] = useState<CommentType[]>([]);

  const updateCommentInState = useCallback(
    (comments: CommentType[], commentId: string, newContent: string): CommentType[] => {
      return comments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            content: newContent,
            isEdited: true,
            updatedAt: new Date().toISOString(),
          };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentInState(comment.replies, commentId, newContent),
          };
        }
        return comment;
      });
    },
    [],
  );

  const markCommentAsRemovedInState = useCallback(
    (
      comments: CommentType[],
      commentId: string,
      removerId: string,
      isSelf: boolean,
    ): CommentType[] => {
      return comments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            content: '[removed]',
            isRemoved: true,
            userVoteType: null,
            voteCount: 0,
            removedBy: { id: removerId, isSelf },
          };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: markCommentAsRemovedInState(comment.replies, commentId, removerId, isSelf),
          };
        }
        return comment;
      });
    },
    [],
  );

  const addReplyToState = useCallback(
    (comments: CommentType[], parentId: string, newReply: CommentType): CommentType[] => {
      return comments.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [newReply, ...(comment.replies ?? [])],
          };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyToState(comment.replies, parentId, newReply),
          };
        }
        return comment;
      });
    },
    [],
  );

  const fetchComments = useCallback(
    async (page: number = 1) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await comments.list(tokenMintAddress, page, 10, sortBy);

        const newComments = response.data as CommentType[];

        if (page === 1) {
          setComments(newComments);
        } else {
          setComments((prevComments) => [...prevComments, ...newComments]);
        }
        setPagination(response.meta);
        setError(null);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch comments');
        if (page === 1) {
          setComments([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [tokenMintAddress, sortBy],
  );

  const fetchThreadData = useCallback(
    async (threadId: string) => {
      try {
        setIsLoadingSpecificComment(true);
        const threadData = await comments.getThread(threadId);
        setFocusedComment(threadData.rootComment);
        const organizeAndSortThreadComments = (commentsToOrganize: Comment[]) => {
          commentsToOrganize.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          const commentMap = new Map<string, CommentType>();
          const roots: CommentType[] = [];
          commentsToOrganize.forEach((c) => commentMap.set(c.id, { ...c, replies: [] }));
          commentsToOrganize.forEach((c) => {
            const dto = commentMap.get(c.id)!;
            if (c.parentId && commentMap.has(c.parentId)) {
              commentMap.get(c.parentId)!.replies!.push(dto);
            } else if (!c.parentId) {
              roots.push(dto);
            }
          });
          return roots;
        };
        setThreadComments(organizeAndSortThreadComments(threadData.comments));
      } catch {
        setFocusedComment(null);
        setThreadComments([]);
        toast({
          title: 'Error',
          description: 'Could not load comment thread.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingSpecificComment(false);
      }
    },
    [toast],
  );

  // Fetch comments when component mounts or auth state changes
  useEffect(() => {
    if (!authLoading && !commentId) {
      setIsLoading(true);
      fetchComments().finally(() => setIsLoading(false));
    }
  }, [authLoading, isAuthenticated, fetchComments, commentId]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (commentId) return; // Don't set up infinite scroll when viewing a specific comment

    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoadingMore && pagination.page < pagination.totalPages) {
          fetchComments(pagination.page + 1);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      },
    );

    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [isLoadingMore, pagination, fetchComments, commentId]);

  useEffect(() => {
    hasScrolled.current = false;
    userHasInteracted.current = false;
  }, [commentId]);

  const createCommentRefCallback = useCallback((itemId: string) => {
    return (el: HTMLDivElement | null) => {
      if (el) {
        commentRefs.current.set(itemId, el);
      } else {
        commentRefs.current.delete(itemId);
      }
    };
  }, []);

  // Mark any user interaction to prevent unwanted scrolling
  const handleUserInteraction = useCallback(() => {
    userHasInteracted.current = true;
  }, []);

  const withAuth = async (action: () => Promise<void>) => {
    handleUserInteraction();

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
    handleUserInteraction();

    await withAuth(async () => {
      try {
        const response = await comments.vote(commentId, type);
        const voteUpdate = {
          voteCount: response.upvotes - response.downvotes,
          userVoteType: response.userVoteType,
        };

        // Update main comments list state for regular view
        setComments((prevComments) => {
          const updateCommentVotes = (comments: CommentType[]): CommentType[] => {
            return comments.map((comment) => {
              if (comment.id === commentId) {
                return { ...comment, ...voteUpdate };
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

        // Update threadComments if we're viewing a comment thread
        if (threadComments.length > 0) {
          setThreadComments((prevThreadComments) => {
            const updateCommentVotes = (comments: CommentType[]): CommentType[] => {
              return comments.map((comment) => {
                if (comment.id === commentId) {
                  return { ...comment, ...voteUpdate };
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

            return updateCommentVotes(prevThreadComments);
          });
        }

        // Update the focusedComment if it's the one being voted on
        if (focusedComment && focusedComment.id === commentId) {
          setFocusedComment({
            ...focusedComment,
            ...voteUpdate,
          });
        }
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
    handleUserInteraction();

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

        if (parentId && commentId) {
          await fetchThreadData(commentId);
        } else if (parentId) {
          await fetchComments();
        } else {
          if (sortBy !== 'new') {
            setPreviousSort(sortBy);
            setSortBy('new');
          }
          await fetchComments();
        }

        toast({
          title: 'Success',
          description: 'Comment posted successfully',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to post comment';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    });
  };

  // Add handler for sort changes
  const handleSortChange = (newSort: SortOption) => {
    handleUserInteraction();

    // If we have a previous sort and user manually selects a sort
    if (previousSort && newSort !== 'new') {
      setSortBy(newSort);
      setPreviousSort(null);
    } else {
      setSortBy(newSort);
    }

    // Reset pagination to page 1 and fetch comments with the new sort
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));

    fetchComments(1);
  };

  const handleAuthModalClose = () => {
    handleUserInteraction();
    setShowAuthModal(false);
    setPendingAction(null);
  };

  const handleRemoveComment = useCallback(
    async (commentId: string) => {
      handleUserInteraction();

      if (!isAuthenticated) {
        setShowAuthModal(true);
        setPendingAction(() => async () => handleRemoveComment(commentId));
        return;
      }

      setCommentToDelete(commentId);
      setIsDeleteDialogOpen(true);
    },
    [isAuthenticated, handleUserInteraction],
  );

  const confirmDeleteComment = useCallback(async () => {
    if (!commentToDelete || !user) return;

    setIsDeleteLoading(true);
    try {
      await comments.remove(commentToDelete);

      setComments((prevComments) =>
        markCommentAsRemovedInState(
          prevComments,
          commentToDelete,
          user.id,
          commentToDelete === user.id,
        ),
      );

      toast({
        title: 'Comment removed',
        description: 'The comment has been removed successfully.',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to remove the comment. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleteLoading(false);
      setIsDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  }, [commentToDelete, toast, user, markCommentAsRemovedInState]);

  const Comment = ({ comment, depth = 0 }: { comment: CommentType; depth?: number }) => {
    const maxDepth = 5;
    const isCommentOwner = user?.id === comment.user.id;
    const canRemove = (user?.isAdmin ?? false) || isCommentOwner;
    const isAdmin = user?.isAdmin ?? false;
    const isReplying = replyingTo === comment.id;
    const isEditing = editingComment === comment.id;
    const isFocused = commentId === comment.id;

    // Check if comment is less than 15 minutes old
    const commentDate = new Date(comment.createdAt);
    const currentTime = new Date();
    const fifteenMinutesMs = 15 * 60 * 1000;
    const isEditable =
      isCommentOwner &&
      !comment.isRemoved &&
      currentTime.getTime() - commentDate.getTime() < fifteenMinutesMs;

    const handleReply = async (content: string) => {
      await withAuth(async () => {
        if (!user) return;

        try {
          const newCommentData: CreateCommentDto = {
            content,
            tokenMintAddress,
            parentId: comment.id,
          };
          const newReplyFromApi = await comments.create(newCommentData);

          const newReplyWithType: CommentType = {
            ...newReplyFromApi,
            user: {
              id: user.id,
              username: user.username,
              displayName: user.displayName || user.username,
              avatarUrl: user.avatarUrl,
            },
            replies: [],
            userVoteType: null,
            isRemoved: false,
            isEdited: false,
            removedBy: null,
            voteCount: newReplyFromApi.voteCount ?? 0,
            upvotes: newReplyFromApi.upvotes ?? 0,
            downvotes: newReplyFromApi.downvotes ?? 0,
          };

          setComments((prevComments) =>
            addReplyToState(prevComments, comment.id, newReplyWithType),
          );

          setReplyingTo(null);

          toast({
            title: 'Success',
            description: 'Your reply has been posted.',
          });
        } catch (err) {
          console.error('Error posting reply:', err);
          toast({
            title: 'Error',
            description: 'Could not post your reply. Please try again.',
            variant: 'destructive',
          });
        }
      });
    };

    const handleReplyClick = () => {
      handleUserInteraction();

      if (!isAuthenticated) {
        setShowAuthModal(true);
        setPendingAction(null);
        return;
      }
      setReplyingTo(isReplying ? null : comment.id);
    };

    const handleEditClick = () => {
      handleUserInteraction();
      setEditingComment(comment.id);
    };

    const handleCancelEdit = () => {
      handleUserInteraction();
      setEditingComment(null);
    };

    const handleSubmitEdit = async (content: string) => {
      handleUserInteraction();
      try {
        await comments.update(comment.id, content);
        setComments((prevComments) => updateCommentInState(prevComments, comment.id, content));
        toast({
          title: 'Success',
          description: 'Comment updated successfully',
        });
        setEditingComment(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update comment';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    const commentRef = createCommentRefCallback(comment.id);

    return (
      <div
        ref={commentRef}
        className={cn(
          'group/comment rounded-md transition-all duration-300 ease-in-out w-full pr-2 sm:pr-4 relative',
          depth > 0 && 'border-l-2 pl-2 sm:pl-4 ml-2 sm:ml-4',
          depth === 1 && 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/[0.03]',
          depth === 2 && 'border-purple-500/20 hover:border-purple-500/40 bg-purple-500/[0.03]',
          depth === 3 && 'border-pink-500/20 hover:border-pink-500/40 bg-pink-500/[0.03]',
          depth === 4 && 'border-orange-500/20 hover:border-orange-500/40 bg-orange-500/[0.03]',
          depth >= 5 && 'border-gray-500/20 hover:border-gray-500/40 bg-gray-500/[0.03]',
        )}>
        {isFocused && (
          <div className='absolute -top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-800/30 text-amber-700 dark:text-amber-200 text-[10px] font-medium shadow-sm'>
            <MessageSquare className='h-2.5 w-2.5 inline-block mr-0.5 -translate-y-[0.5px]' />
            Focused comment
          </div>
        )}
        <div className='py-2 sm:py-3'>
          <div className='flex gap-2 sm:gap-3'>
            <Avatar
              className={cn(
                'h-6 w-6 sm:h-[28px] sm:w-[28px] shrink-0',
                comment.isRemoved && 'opacity-40',
              )}>
              <AvatarImage
                src={getHighResAvatar(comment.user.avatarUrl)}
                alt={comment.user.displayName}
              />
              <AvatarFallback>{comment.user.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <div className='flex flex-wrap items-center gap-x-2 text-sm'>
                {comment.user.username ? (
                  <Link href={`/users/${comment.user.username}`}>
                    <span
                      className={cn(
                        'font-medium truncate cursor-pointer text-blue-400 hover:text-blue-600 transition-colors',
                        comment.isRemoved && 'opacity-40',
                      )}>
                      {comment.user.displayName}
                    </span>
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'font-medium truncate text-blue-400',
                      comment.isRemoved && 'opacity-40',
                    )}>
                    {comment.user.displayName}
                  </span>
                )}
                <span
                  className={cn(
                    'text-muted-foreground text-xs',
                    comment.isRemoved && 'opacity-60',
                  )}>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  {comment.isEdited && <span className='ml-1 italic'>(edited)</span>}
                </span>
              </div>
              {isEditing ? (
                <div className='mt-2'>
                  <CommentInput
                    variant='reply'
                    onSubmit={handleSubmitEdit}
                    onCancel={handleCancelEdit}
                    submitLabel='Save'
                    autoFocus
                    placeholder='Edit your comment...'
                    content={comment.content}
                    onAuthRequired={() => {
                      setPendingAction(null);
                      setShowAuthModal(true);
                    }}
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'prose prose-sm dark:prose-invert mt-1 max-w-none break-words',
                    comment.isRemoved && 'opacity-40',
                  )}
                  dangerouslySetInnerHTML={{ __html: comment.content }}
                />
              )}
              {!isEditing && (
                <div className='mt-2 flex items-center text-muted-foreground'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-1 cursor-pointer'
                    onClick={() => handleVote(comment.id, 'upvote')}
                    disabled={comment.isRemoved}>
                    <ArrowBigUp
                      className={cn(
                        'h-4 w-4',
                        comment.userVoteType === 'upvote' && 'fill-green-500 text-green-500',
                        comment.isRemoved && 'opacity-40',
                      )}
                    />
                  </Button>
                  <span
                    className={cn(
                      'min-w-[2ch] text-center text-sm tabular-nums px-0.5',
                      comment.isRemoved && 'opacity-40',
                    )}>
                    {comment.voteCount}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-1 cursor-pointer'
                    onClick={() => handleVote(comment.id, 'downvote')}
                    disabled={comment.isRemoved}>
                    <ArrowBigDown
                      className={cn(
                        'h-4 w-4',
                        comment.userVoteType === 'downvote' && 'fill-red-500 text-red-500',
                        comment.isRemoved && 'opacity-40',
                      )}
                    />
                  </Button>
                  {depth < maxDepth && !comment.isRemoved && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 gap-1 px-2 cursor-pointer'
                      onClick={handleReplyClick}>
                      <MessageSquare className='h-4 w-4' />
                      <span className='hidden sm:inline text-xs'>Reply</span>
                    </Button>
                  )}
                  {!comment.isRemoved && (
                    <TwitterShareButton comment={comment} tokenMintAddress={tokenMintAddress} />
                  )}
                  {!comment.isRemoved && (
                    <CopyLinkButton comment={comment} tokenMintAddress={tokenMintAddress} />
                  )}
                  {isAdmin && !isCommentOwner && !comment.isRemoved && (
                    <AdminModeration comment={comment} onCommentUpdated={fetchComments} />
                  )}
                  {canRemove && !comment.isRemoved && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm' className='h-8 px-2 cursor-pointer'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {isEditable && (
                          <DropdownMenuItem className='cursor-pointer' onClick={handleEditClick}>
                            <Pencil className='mr-2 h-4 w-4' />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className='text-red-500 hover:text-red-500 data-highlighted:text-red-500 hover:bg-transparent cursor-pointer'
                          onClick={() => handleRemoveComment(comment.id)}>
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
              {isReplying && (
                <div className='mt-4'>
                  <CommentInput
                    variant='reply'
                    onSubmit={handleReply}
                    onCancel={() => setReplyingTo(null)}
                    submitLabel='Reply'
                    onAuthRequired={() => {
                      setPendingAction(null);
                      setShowAuthModal(true);
                    }}
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

  useEffect(() => {
    if (!commentId) return;
    fetchThreadData(commentId);
  }, [commentId, fetchThreadData]);

  if (commentId) {
    if (isLoadingSpecificComment || (!isLoadingSpecificComment && !focusedComment)) {
      return (
        <Card className='p-4 animate-pulse'>
          <div className='flex gap-3'>
            <div className='w-10 h-20 bg-gray-200 rounded'></div>
            <div className='flex-1 space-y-2'>
              <div className='h-5 bg-gray-200 rounded w-1/4'></div>
              <div className='h-4 bg-gray-200 rounded w-3/4'></div>
              <div className='h-4 bg-gray-200 rounded w-1/2'></div>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <Button
            onClick={() => router.push(`/tokens/${tokenMintAddress}`)}
            variant='ghost'
            size='sm'
            className='gap-2 text-muted-foreground hover:text-foreground cursor-pointer'>
            <ArrowLeft className='h-4 w-4' />
            All comments
          </Button>
        </div>

        <div className='space-y-4 w-full'>
          {threadComments.length > 0 ? (
            threadComments.map((comment) => <Comment key={comment.id} comment={comment} />)
          ) : (
            <Comment comment={focusedComment!} />
          )}
        </div>
      </div>
    );
  }

  // Regular view for all comments
  return (
    <div className='space-y-4'>
      <div className='space-y-4 w-full'>
        <CommentInput
          onSubmit={(content) => handleSubmitComment(undefined, content)}
          onCancel={() => setNewComment('')}
          placeholder='Add a comment'
          className='w-full'
          onAuthRequired={() => {
            setPendingAction(null);
            setShowAuthModal(true);
          }}
        />

        <div className='flex items-center pb-2 w-full'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='text-sm gap-1 px-2 py-1 bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/70'>
                <span className='text-muted-foreground mr-1'>Sort:</span>
                <span className='font-medium capitalize'>{sortBy}</span>
                <ChevronDown className='ml-1 h-3.5 w-3.5 opacity-70' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='min-w-[120px]'>
              {(['best', 'new', 'old', 'controversial'] as const).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => handleSortChange(option)}
                  className={cn(
                    'capitalize flex items-center justify-between',
                    sortBy === option ? 'bg-zinc-800 text-white font-medium' : '',
                  )}>
                  {option}
                  {sortBy === option && (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='ml-2 h-3.5 w-3.5'>
                      <polyline points='20 6 9 17 4 12'></polyline>
                    </svg>
                  )}
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
        ) : isLoading ? (
          <Card className='p-6 w-full'>
            <div className='space-y-4'>
              {[...Array(3)].map((_, i) => (
                <div key={i} className='flex gap-3 animate-pulse'>
                  <div className='w-8 h-8 bg-zinc-800/60 rounded-full'></div>
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 bg-zinc-800/60 rounded w-1/4'></div>
                    <div className='h-3 bg-zinc-800/40 rounded w-3/4'></div>
                    <div className='h-3 bg-zinc-800/40 rounded w-1/2'></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className='p-6 text-center text-gray-500 w-full'>
            <MessageSquare className='h-12 w-12 mx-auto mb-3 text-gray-400' />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </Card>
        )}
      </div>

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className='flex items-center justify-center py-4'>
          <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10'>
            <div className='flex space-x-2 mr-3'>
              <div className='h-2 w-2 bg-blue-400 rounded-full animate-pulse'></div>
              <div
                className='h-2 w-2 bg-blue-400 rounded-full animate-pulse'
                style={{ animationDelay: '300ms' }}></div>
              <div
                className='h-2 w-2 bg-blue-400 rounded-full animate-pulse'
                style={{ animationDelay: '600ms' }}></div>
            </div>
            <span className='text-sm font-medium text-zinc-300'>Loading more comments</span>
          </div>
        </div>
      )}

      {/* Observer Target */}
      <div ref={observerTarget} className='h-4' />

      {/* No Comments Message - Only show when not loading and actually have no comments */}
      {!isLoading && !isLoadingMore && commentsList.length === 0 && error === null && (
        <div className='text-center py-8 text-zinc-500'>
          No comments yet. Be the first to share your thoughts!
        </div>
      )}

      {/* Error Message */}
      {error && <div className='text-center py-8 text-red-500'>{error}</div>}

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onAuthSuccess={pendingAction ?? undefined}
      />

      {/* Comment Deletion Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setCommentToDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove your comment. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteLoading} className='cursor-pointer'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteComment}
              disabled={isDeleteLoading}
              className='bg-red-500/90 hover:bg-red-600 focus:ring-red-400 cursor-pointer text-white'>
              {isDeleteLoading ? 'Deleting...' : 'Yes, delete comment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
