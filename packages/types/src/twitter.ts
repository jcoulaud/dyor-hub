export interface TwitterUsernameHistory {
  last_checked: string;
  username: string;
}

export interface TwitterUsernameHistoryEntity {
  id: string;
  tokenMintAddress: string;
  twitterUsername: string;
  history: TwitterUsernameHistory[] | null;
  createdAt: Date;
}

export interface TwitterFeedTweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImageUrl?: string;
  createdAt: string;
  publicMetrics: {
    retweetCount: number;
    likeCount: number;
    replyCount: number;
    quoteCount: number;
  };
  referencedTweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  attachments?: {
    mediaKeys?: string[];
  };
  media?: Array<{
    mediaKey: string;
    type: 'photo' | 'video' | 'animated_gif';
    url?: string;
    previewImageUrl?: string;
    width?: number;
    height?: number;
  }>;
}

export interface TwitterFeedResponse {
  tweets: TwitterFeedTweet[];
  meta: {
    resultCount: number;
    newestId?: string;
    oldestId?: string;
    nextToken?: string;
  };
}

export interface TwitterUserInfo {
  id: string;
  name: string;
  userName: string;
  location?: string;
  url?: string;
  description: string;
  protected: boolean;
  isVerified: boolean;
  isBlueVerified: boolean;
  verifiedType?: string | null;
  followers: number;
  following: number;
  favouritesCount: number;
  statusesCount: number;
  mediaCount: number;
  createdAt: string;
  coverPicture?: string;
  profilePicture?: string;
  canDm: boolean;
  isAutomated: boolean;
  automatedBy?: string | null;
}

export interface TwitterCommunityInfo {
  id: string;
  name: string;
  description: string;
  question?: string | null;
  member_count: number;
  moderator_count: number;
  created_at: string;
  join_policy: string;
  invites_policy: string;
  is_nsfw: boolean;
  is_pinned: boolean;
  role: string;
  primary_topic?: {
    id?: string | null;
    name?: string | null;
  };
  banner_url?: string;
  search_tags: string[];
  rules: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  creator: {
    id: string;
    name: string;
    screen_name: string;
    location?: string;
    url?: string;
    description: string;
    email?: string | null;
    protected: boolean;
    verified: boolean;
    followers_count: number;
    following_count: number;
    friends_count: number;
    favourites_count: number;
    statuses_count: number;
    media_tweets_count: number;
    created_at: string;
    profile_banner_url?: string;
    profile_image_url_https?: string;
    can_dm: boolean;
    isBlueVerified: boolean;
  };
}

export interface TwitterTweetInfo {
  id: string;
  text: string;
  url: string;
  twitterUrl: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  author: {
    userName: string;
    name: string;
    id: string;
    isVerified: boolean;
    isBlueVerified: boolean;
    profilePicture?: string;
    coverPicture?: string;
    description: string;
    location?: string;
    followers: number;
    following: number;
    createdAt: string;
  };
  extendedEntities?: {
    media?: Array<{
      media_url_https: string;
      type: string;
    }>;
  };
}
