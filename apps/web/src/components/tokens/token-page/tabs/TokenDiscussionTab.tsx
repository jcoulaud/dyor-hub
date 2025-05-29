'use client';

import { CommentSection, type CommentSectionHandle } from '@/components/comments/CommentSection';
import { Card, CardContent } from '@/components/ui/card';
import { Token } from '@dyor-hub/types';
import { memo, RefObject } from 'react';

interface TokenDiscussionTabProps {
  tokenData: Token | null;
  commentSectionRef: RefObject<CommentSectionHandle | null>;
  commentIdFromProps?: string;
}

export const TokenDiscussionTab = memo(function TokenDiscussionTab({
  tokenData,
  commentSectionRef,
  commentIdFromProps,
}: TokenDiscussionTabProps) {
  return (
    <div className='w-full'>
      {/* Comments Section */}
      <Card className='!bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl'>
        <CardContent className='p-8'>
          <div className='flex items-center mb-6'>
            <div className='h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mr-3 shadow-lg'>
              <svg className='w-5 h-5 text-white' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <h3 className='text-xl font-bold text-white'>Community Discussion</h3>
          </div>

          {tokenData && (
            <CommentSection
              ref={commentSectionRef}
              tokenMintAddress={tokenData.mintAddress}
              commentId={commentIdFromProps}
              verifiedCreatorUserId={tokenData.verifiedCreatorUserId}
              tokenSymbol={tokenData.symbol}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
});
