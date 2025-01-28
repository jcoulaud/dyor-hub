'use client';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { comments } from '@/lib/api';
import type { Comment as CommentType } from '@dyor-hub/types';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from '../auth/AuthModal';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';

interface CommentSectionProps {
  tokenMintAddress: string;
}

export function CommentSection({ tokenMintAddress }: CommentSectionProps) {
  const [commentsList, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await comments.list(tokenMintAddress);
      setComments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setIsLoading(false);
    }
  }, [tokenMintAddress]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

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

  const handleVote = async (commentId: string, type: 'upvote' | 'downvote') => {
    await withAuth(async () => {
      try {
        await comments.vote(commentId, type);
        await fetchComments();
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to vote',
          variant: 'destructive',
        });
      }
    });
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    await withAuth(async () => {
      try {
        await comments.create({
          content: newComment,
          tokenMintAddress,
        });

        setNewComment('');
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

  if (isLoading) {
    return <div>Loading comments...</div>;
  }

  if (error) {
    return (
      <div className='text-red-500'>
        Error: {error}
        <Button onClick={fetchComments} className='ml-2'>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Textarea
            placeholder='Write a comment...'
            value={newComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
          />
          <Button onClick={handleSubmitComment}>Post Comment</Button>
        </div>

        <div className='space-y-4'>
          {commentsList.map((comment) => (
            <Card key={comment.id} className='p-4'>
              <div className='flex items-start gap-4'>
                <div className='flex flex-col items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => handleVote(comment.id, 'upvote')}>
                    <ArrowBigUp
                      className={
                        comment.votes?.some((v) => v.type === 'upvote') ? 'text-green-500' : ''
                      }
                    />
                  </Button>
                  <span>{comment.upvotes - comment.downvotes}</span>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => handleVote(comment.id, 'downvote')}>
                    <ArrowBigDown
                      className={
                        comment.votes?.some((v) => v.type === 'downvote') ? 'text-red-500' : ''
                      }
                    />
                  </Button>
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='font-medium'>{comment.user?.displayName || 'Anonymous'}</span>
                    <span className='text-sm text-gray-500'>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className='text-gray-700'>{comment.content}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} />
    </>
  );
}
