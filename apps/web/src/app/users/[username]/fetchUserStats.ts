// This would be properly fetched from the API in a real implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const fetchUserStats = async (_userId: string) => {
  // Mock data for now
  return {
    comments: 24,
    upvotes: 167,
    downvotes: 8,
    replies: 36,
  };
};
