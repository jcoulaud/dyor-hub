'use client';

import { MessageSquare, Sparkles, Users } from 'lucide-react';
import { Card } from '../ui/card';

interface EmptyDiscussionStateProps {
  tokenSymbol?: string;
}

export const EmptyDiscussionState = ({ tokenSymbol }: EmptyDiscussionStateProps) => {
  return (
    <Card className='relative overflow-hidden border-0 bg-zinc-900/40 backdrop-blur-sm border border-zinc-700/50'>
      <div className='absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5' />
      <div className='absolute top-0 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl' />
      <div className='absolute bottom-0 right-1/4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl' />

      <div className='relative p-12 text-center space-y-6'>
        {/* Icon section */}
        <div className='relative flex justify-center'>
          <div className='relative'>
            <div className='absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse' />
            <div className='relative bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 rounded-full border border-zinc-700/50 shadow-xl'>
              <MessageSquare className='h-8 w-8 text-blue-400' />
            </div>
          </div>
          {/* Floating sparkles */}
          <Sparkles
            className='absolute -top-2 -right-2 h-4 w-4 text-yellow-400 animate-bounce'
            style={{ animationDelay: '0.5s' }}
          />
          <Sparkles
            className='absolute -bottom-1 -left-3 h-3 w-3 text-purple-400 animate-bounce'
            style={{ animationDelay: '1s' }}
          />
        </div>

        {/* Main content */}
        <div className='space-y-3'>
          <div className='space-y-2'>
            <p className='text-zinc-300 text-base leading-relaxed max-w-md mx-auto'>
              No comments yet. Be the first to share your thoughts
              {tokenSymbol ? ` about $${tokenSymbol}` : ''}!
            </p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className='flex justify-center items-center gap-6 pt-4'>
          <div className='flex items-center gap-2 text-sm text-zinc-400'>
            <Users className='h-4 w-4 text-green-400' />
            <span>Community driven</span>
          </div>
          <div className='w-px h-4 bg-zinc-700' />
          <div className='flex items-center gap-2 text-sm text-zinc-400'>
            <Sparkles className='h-4 w-4 text-yellow-400' />
            <span>Real insights</span>
          </div>
        </div>

        {/* Subtle hint */}
        <p className='text-xs text-zinc-500 pt-2'>Your voice matters in building this community</p>
      </div>
    </Card>
  );
};
