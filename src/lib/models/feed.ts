/**
 * Feed Models - Data structures for PI post collection
 * Used by the feed-service to store and process PI insights
 */

export type PICategory = 'elite' | 'performers' | 'conservative' | 'active' | 'engaging';

/**
 * A single post from a Popular Investor's feed
 */
export interface PIPost {
  /** PI username */
  author: string;
  /** Global Customer ID */
  gcid: number;
  /** Category this PI belongs to */
  category: PICategory;
  /** Post creation timestamp */
  created: string;
  /** Post text content (truncated to 500 chars) */
  text: string;
  /** Language code (e.g., 'en', 'es-es', 'de-de') */
  language: string;
  /** Whether post needs translation (non-English) */
  needsTranslation: boolean;
  /** Number of likes on the post */
  likes: number;
  /** Number of comments on the post */
  comments: number;
  /** Total engagement score (likes + comments) */
  engagement: number;
  /** Stock tickers mentioned ($TICKER format) */
  tickers: string[];
  /** PI copier count at time of fetch */
  copiers: number;
  /** PI YTD gain at time of fetch */
  gain: number;
  /** PI risk score at time of fetch */
  riskScore: number;
}

/**
 * Summary of a PI for category assignment
 */
export interface PICategorySummary {
  username: string;
  gcid: number;
  copiers: number;
  gain: number;
  riskScore: number;
  trades: number;
  winRatio: number;
  /** Activity score = trades * winRatio / 100 */
  activityScore: number;
}

/**
 * Collection of posts grouped by category
 */
export interface CategoryPosts {
  elite: PIPost[];
  performers: PIPost[];
  conservative: PIPost[];
  active: PIPost[];
  engaging: PIPost[];
}

/**
 * Aggregated ticker mention data
 */
export interface TickerMention {
  ticker: string;
  count: number;
  categories: PICategory[];
  authors: string[];
}

/**
 * Complete feed collection result
 */
export interface FeedCollection {
  /** When the feed was collected */
  collectedAt: string;
  /** Total posts fetched */
  totalPosts: number;
  /** Total unique PIs fetched from */
  totalPIs: number;
  /** All posts in flat array */
  posts: PIPost[];
  /** Posts grouped by category */
  byCategory: CategoryPosts;
  /** Aggregated ticker mentions */
  tickerMentions: Record<string, TickerMention>;
  /** Top mentioned tickers sorted by count */
  topTickers: TickerMention[];
  /** Count of non-English posts */
  nonEnglishCount: number;
  /** Processing statistics */
  stats: {
    fetchedPIs: number;
    failedPIs: number;
    totalRequests: number;
    processingTimeMs: number;
  };
}

/**
 * API response structure for user feed endpoint
 */
export interface EtoroFeedResponse {
  discussions: EtoroDiscussion[];
  pagination?: {
    pageNumber: number;
    pageSize: number;
    totalCount: number;
  };
}

export interface EtoroDiscussion {
  post: EtoroPost;
  commentsCount: number;
}

export interface EtoroPost {
  id: string;
  created: string;
  modified?: string;
  message: EtoroMessage;
  likes: number;
  userGcid: number;
  username: string;
}

export interface EtoroMessage {
  text: string;
  languageCode: string;
  type?: string;
}
