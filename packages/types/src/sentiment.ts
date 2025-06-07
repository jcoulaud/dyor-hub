export interface ProjectCredibilityScore {
  overall: number; // 0 to 100 scale
  breakdown: {
    legitimacy: number; // 0-100: How legitimate the project appears
    engagement: number; // 0-100: Quality of community engagement
    communication: number; // 0-100: Professional communication quality
    transparency: number; // 0-100: Transparency and authenticity
    riskLevel: number; // 0-100: Risk of scam/rug (100 = high risk)
  };
}

export interface ProjectAssessment {
  username: string;
  displayName: string;
  profileImageUrl?: string;
  credibilityScore: ProjectCredibilityScore;
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    factors: string[];
  };
  legitimacyIndicators: {
    positive: string[];
    negative: string[];
  };
  communicationQuality: {
    tone: 'professional' | 'casual' | 'unprofessional' | 'suspicious';
    consistency: 'high' | 'medium' | 'low';
    transparency: 'transparent' | 'somewhat_transparent' | 'opaque';
  };
  engagementAnalysis: {
    authenticity: 'genuine' | 'mixed' | 'suspicious';
    botActivity: 'low' | 'medium' | 'high';
    communityHealth: 'healthy' | 'moderate' | 'concerning';
  };
  analysisMetadata: {
    analysisDate: string;
    dataRange: {
      from: string;
      to: string;
    };
  };
}

export interface TweetAnalysis {
  tweetId: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
  };
  credibilitySignals: {
    professional: boolean;
    transparent: boolean;
    educational: boolean;
    promotional: boolean;
    suspicious: boolean;
  };
  redFlags: string[];
  positiveSignals: string[];
}

export interface ProjectAnalysisRequest {
  username: string;
  analysisType: 'full' | 'recent';
  dateRange?: {
    from: string;
    to: string;
  };
  options?: {
    includeReplies?: boolean;
    includeMentions?: boolean;
    maxTweets?: number;
  };
}

export interface ProjectAnalysisResponse {
  username: string;
  profile: ProjectAssessment;
  recentActivity: TweetAnalysis[];
  insights: ProjectInsights;
  verdict: ProjectVerdict;
}

export interface ProjectInsights {
  summary: string;
  keyFindings: string[];
  credibilityFactors: {
    strengths: string[];
    weaknesses: string[];
  };
  riskIndicators: string[];
  communityHealth: {
    summary: string;
    engagementQuality: 'high' | 'medium' | 'low';
    botSuspicion: 'low' | 'medium' | 'high';
    organicInteractions: 'high' | 'medium' | 'low';
  };
}

export interface ProjectVerdict {
  recommendation: 'proceed_with_confidence' | 'proceed_with_caution' | 'high_risk_avoid';
  confidenceLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
  legitimacySignals: string[];
  finalScore: number; // 0-100
}

export interface ScamDetectionMetrics {
  suspiciousPatterns: string[];
  legitimacyPatterns: string[];
  botActivityLevel: 'low' | 'medium' | 'high';
  communicationRedFlags: string[];
  transparencySignals: string[];
}

export interface CommunityEngagementMetrics {
  interactionQuality: 'high' | 'medium' | 'low';
  responsePatterns: 'professional' | 'generic' | 'suspicious';
  communitySupport: 'strong' | 'moderate' | 'weak';
  controversyLevel: 'low' | 'medium' | 'high';
}

// Legacy types for backward compatibility during transition
export type SentimentAnalysisRequest = ProjectAnalysisRequest;

// Legacy interface definitions for frontend compatibility
export interface SentimentScore {
  overall: number; // -1 to 1 (converted from 0-100 scale)
  confidence: number; // 0 to 1
  primaryEmotion: 'joy' | 'anger' | 'sadness' | 'fear' | 'surprise' | 'disgust' | 'neutral';
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
  sentimentTrend: 'improving' | 'declining' | 'stable';
  communicationStyle: {
    tone: 'professional' | 'casual' | 'unprofessional' | 'suspicious';
    authenticity: 'high' | 'medium' | 'low';
    responsiveness: 'engaging' | 'moderate' | 'inactive';
  };
  sentimentConsistency: number;
  engagementQuality: {
    meaningfulRepliesRatio: number;
    controversyIndex: number;
    authenticityScore: number;
  };
  topicSentiments: Record<string, SentimentScore> | null;
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

export interface SentimentInsights {
  summary: string;
  keyFindings: string[];
  sentimentDrivers: {
    positive: string[];
    negative: string[];
  };
  riskFactors: string[];
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
  engagementStrategy: {
    recommended: string[];
    avoid: string[];
  };
  riskMitigation: string[];
}

export interface SentimentAnalysisResponse {
  username: string;
  profile: AccountSentimentProfile;
  recentTweets: TweetSentiment[];
  interactions: InteractionSentiment[];
  insights: SentimentInsights;
  recommendations: SentimentRecommendations;
}

export interface TokenGatedErrorData {
  message: string;
  requiredCredits?: number;
  isTokenGated: boolean;
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
}

export interface EnhancedEngagementMetrics {
  replyToPostRatio: number;
  originalContentRatio: number;
  averageEngagementRate: number;
  viralContentCount: number;
  authenticInteractionRatio: number;
}

export interface AuthenticitySignals {
  verificationStatus: {
    isVerified: boolean;
    isBlueVerified: boolean;
    verifiedType?: string | null;
  };
  accountMetrics: {
    accountAgeMonths: number;
    followerToFollowingRatio: number;
    tweetsPerDay: number;
    profileCompleteness: number;
  };
  growthPattern: 'organic' | 'questionable' | 'suspicious' | 'unknown';
  geographicSignals: {
    timeZoneConsistency: boolean;
    languageConsistency: boolean;
  };
}

export interface RiskIndicators {
  suspiciousPatterns: {
    repetitiveContent: boolean;
    unusualPostingTimes: boolean;
    botLikeLanguage: boolean;
  };
  networkRisks: {
    botInteractionRatio: number;
    unverifiedMentionsRatio: number;
    suspiciousDomains: string[];
  };
  contentRisks: {
    spamKeywords: string[];
    excessivePromotions: boolean;
    misleadingClaims: boolean;
  };
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EnhancedTwitterAnalysis {
  basicMetrics: {
    totalTweets: number;
    totalReplies: number;
    totalRetweets: number;
    averageLikes: number;
    averageRetweets: number;
  };
  engagementQuality: EnhancedEngagementMetrics;
  authenticitySignals: AuthenticitySignals;
  riskIndicators: RiskIndicators;
  networkAnalysis: {
    communityHealth: 'healthy' | 'questionable' | 'suspicious';
    influencerConnections: number;
    verifiedInteractions: number;
  };
}
