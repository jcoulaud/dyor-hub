export interface SentimentScore {
  overall: number; // -1 to 1
  confidence: number; // 0 to 1
  primaryEmotion: 'joy' | 'anger' | 'sadness' | 'fear' | 'surprise' | 'disgust' | 'neutral';
  sentimentIndicators: string[];
  contextNotes: string;
}

export interface TweetSentiment {
  tweetId: string;
  text: string;
  sentiment: SentimentScore;
  author: {
    username: string;
    displayName: string;
    profileImageUrl?: string;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
  };
  createdAt: string;
}

export interface AccountSentimentProfile {
  username: string;
  displayName: string;
  profileImageUrl?: string;
  overallSentiment: SentimentScore;
  sentimentConsistency: number; // 0 to 1, how stable sentiment is
  sentimentTrend: 'improving' | 'declining' | 'stable';
  topicSentiments: Record<string, SentimentScore>;
  engagementQuality: {
    meaningfulRepliesRatio: number;
    controversyIndex: number;
    authenticityScore: number;
  };
  communicationStyle: {
    tone: 'formal' | 'casual' | 'humorous' | 'professional' | 'mixed';
    authenticity: 'high' | 'medium' | 'low';
    responsiveness: 'responsive' | 'moderate' | 'inactive';
  };
  analysisMetadata: {
    tweetsAnalyzed: number;
    mentionsAnalyzed: number;
    interactionsAnalyzed: number;
    analysisDate: string;
    dataRange: {
      from: string;
      to: string;
    };
  };
}

export interface InteractionSentiment {
  originalTweet: TweetSentiment;
  responses: TweetSentiment[];
  overallResponseSentiment: SentimentScore;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  engagementQuality: 'high' | 'medium' | 'low';
  controversyIndicators: string[];
  sentimentEvolution: {
    early: SentimentScore;
    late: SentimentScore;
    trend: 'escalating' | 'de-escalating' | 'stable';
  };
}

export interface SentimentAnalysisRequest {
  username: string;
  analysisType: 'full' | 'recent' | 'interactions' | 'mentions';
  dateRange?: {
    from: string;
    to: string;
  };
  options?: {
    includeMentions?: boolean;
    includeReplies?: boolean;
    includeRetweets?: boolean;
    maxTweets?: number;
    focusTopics?: string[];
  };
}

export interface SentimentAnalysisResponse {
  username: string;
  profile: AccountSentimentProfile;
  recentTweets: TweetSentiment[];
  interactions: InteractionSentiment[];
  insights: SentimentInsights;
  recommendations: SentimentRecommendations;
}

export interface SentimentInsights {
  summary: string;
  keyFindings: string[];
  sentimentDrivers: {
    positive: string[];
    negative: string[];
  };
  riskFactors: string[];
  opportunities: string[];
  communityPerception: {
    summary: string;
    supportLevel: 'high' | 'medium' | 'low';
    criticismLevel: 'high' | 'medium' | 'low';
    engagementQuality: 'high' | 'medium' | 'low';
  };
}

export interface SentimentRecommendations {
  immediate: string[];
  strategic: string[];
  contentStrategy: {
    recommended: string[];
    avoid: string[];
  };
  engagementStrategy: {
    recommended: string[];
    avoid: string[];
  };
  riskMitigation: string[];
}

export interface SentimentTrendData {
  date: string;
  sentiment: SentimentScore;
  tweetCount: number;
  engagementMetrics: {
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
  };
}

export interface SentimentComparison {
  accounts: string[];
  comparisonData: {
    username: string;
    overallSentiment: SentimentScore;
    communityReception: SentimentScore;
    engagementQuality: number;
    authenticityScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  }[];
  insights: {
    leader: string;
    mostImproved: string;
    riskiest: string;
    recommendations: Record<string, string[]>;
  };
}

export interface SentimentAlert {
  id: string;
  username: string;
  alertType: 'crisis' | 'opportunity' | 'trend_change' | 'engagement_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggerData: {
    currentSentiment: SentimentScore;
    previousSentiment: SentimentScore;
    triggerTweets: string[];
  };
  recommendations: string[];
  createdAt: string;
}
