import { UserComment } from './page';

// This would be properly fetched from the API
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const fetchUserComments = async (_userId: string): Promise<UserComment[]> => {
  // Mock data for now
  const comments = Array(10)
    .fill(null)
    .map((_, i) => {
      // Determine activity type - add some upvote and downvote activities
      const activityTypes = ['comment', 'reply', 'upvote', 'downvote'];
      const activityType = activityTypes[i % activityTypes.length];

      return {
        id: `comment-${i}`,
        content:
          i % 2 === 0
            ? 'This token looks promising! I like the team behind it and their roadmap is solid.'
            : 'I appreciate the technical analysis but I think we need to consider market conditions too.',
        tokenMintAddress: `token-${i}`,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 20),
        downvotes: Math.floor(Math.random() * 5),
        tokenSymbol: ['SOL', 'BONK', 'JUP', 'WIF', 'BOME'][i % 5],
        isReply: activityType === 'reply',
        isUpvote: activityType === 'upvote',
        isDownvote: activityType === 'downvote',
        parentCommentId: activityType === 'reply' ? `comment-${i - 1}` : null,
      };
    });

  return comments;
};
