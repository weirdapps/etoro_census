/**
 * Feed Service - Fetches posts from Popular Investors via eToro Feed API
 *
 * Provides PI insights across 5 categories:
 * - Elite: Top by copiers
 * - Performers: Top by YTD gain
 * - Conservative: Lowest risk scores
 * - Active: High trades × win ratio
 * - Engaging: Most reactions + comments
 */

import { API_ENDPOINTS, fetchFromEtoroApi } from '../etoro-api-config';
import { logger } from '../logger';
import {
  PIPost,
  PICategory,
  PICategorySummary,
  FeedCollection,
  CategoryPosts,
  TickerMention,
  EtoroFeedResponse,
} from '../models/feed';
import { PopularInvestor, UserDetail } from '../models/user';
import { validateFeedResponse } from '../schemas/feed';

const FEED_RATE_LIMIT_MS = 500; // 0.5s between feed requests
const MAX_POSTS_PER_PI = 3;
const MAX_PIS_PER_CATEGORY = 5;

/**
 * Progress callback for tracking feed collection
 */
export interface FeedProgressCallback {
  (progress: number, message: string): void;
}

/**
 * Configuration for feed collection
 */
export interface FeedCollectionConfig {
  /** Max PIs per category to fetch posts from */
  pisPerCategory?: number;
  /** Max posts per PI */
  postsPerPI?: number;
  /** Include all 5 categories */
  includeEngaging?: boolean;
}

/**
 * Extract $TICKER mentions from post text
 */
function extractTickers(text: string): string[] {
  const matches = text.match(/\$([A-Z]{1,5})/g);
  if (!matches) return [];
  // Remove duplicates and $ prefix
  return [...new Set(matches.map(m => m.slice(1)))];
}

/**
 * Check if language code is English
 */
function isEnglish(lang: string): boolean {
  return ['en', 'en-gb', 'en-us', 'en-au', 'en-ca'].includes(lang.toLowerCase());
}

/**
 * Select top PIs for each category from investor list
 */
export function selectPIsByCategory(
  investors: PopularInvestor[],
  userDetails: Map<string, UserDetail>,
  config: FeedCollectionConfig = {}
): Map<PICategory, PICategorySummary[]> {
  const pisPerCategory = config.pisPerCategory || MAX_PIS_PER_CATEGORY;
  const categories = new Map<PICategory, PICategorySummary[]>();

  // Helper to create summary with gcid lookup
  const createSummary = (inv: PopularInvestor): PICategorySummary | null => {
    const details = userDetails.get(inv.userName);
    if (!details?.gcid) return null;

    return {
      username: inv.userName,
      gcid: details.gcid,
      copiers: inv.copiers || 0,
      gain: inv.gain || 0,
      riskScore: inv.riskScore || 5,
      trades: inv.trades || 0,
      winRatio: inv.winRatio || 0,
      activityScore: ((inv.trades || 0) * (inv.winRatio || 0)) / 100,
    };
  };

  // Elite: Top by copiers
  const bycopiers = [...investors]
    .sort((a, b) => (b.copiers || 0) - (a.copiers || 0))
    .slice(0, pisPerCategory)
    .map(createSummary)
    .filter((s): s is PICategorySummary => s !== null);
  categories.set('elite', bycopiers);

  // Performers: Top by YTD gain
  const byGain = [...investors]
    .sort((a, b) => (b.gain || 0) - (a.gain || 0))
    .slice(0, pisPerCategory)
    .map(createSummary)
    .filter((s): s is PICategorySummary => s !== null);
  categories.set('performers', byGain);

  // Conservative: Lowest risk score (≤ 3)
  const byRisk = [...investors]
    .filter(inv => (inv.riskScore || 10) <= 3)
    .sort((a, b) => (a.riskScore || 10) - (b.riskScore || 10))
    .slice(0, pisPerCategory)
    .map(createSummary)
    .filter((s): s is PICategorySummary => s !== null);
  categories.set('conservative', byRisk);

  // Active: Highest trades × win ratio
  const byActivity = [...investors]
    .map(inv => ({
      ...inv,
      activityScore: ((inv.trades || 0) * (inv.winRatio || 0)) / 100,
    }))
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, pisPerCategory)
    .map(createSummary)
    .filter((s): s is PICategorySummary => s !== null);
  categories.set('active', byActivity);

  // Engaging: Will be populated after fetching posts (based on engagement)
  // Initially select top by copiers as candidates, then re-rank by engagement
  if (config.includeEngaging !== false) {
    const engagingCandidates = [...investors]
      .sort((a, b) => (b.copiers || 0) - (a.copiers || 0))
      .slice(0, pisPerCategory * 4) // Fetch more to get engagement data
      .map(createSummary)
      .filter((s): s is PICategorySummary => s !== null);
    categories.set('engaging', engagingCandidates);
  }

  return categories;
}

/**
 * Fetch posts for a single PI
 */
async function fetchPIPosts(
  gcid: number,
  postsPerPI: number = MAX_POSTS_PER_PI
): Promise<EtoroFeedResponse | null> {
  const endpoint = `${API_ENDPOINTS.USER_FEED}/${gcid}?pageNumber=1&pageSize=${postsPerPI}`;

  try {
    const response = await fetchFromEtoroApi<EtoroFeedResponse>(endpoint);
    return validateFeedResponse(response);
  } catch (error) {
    logger.warn('Failed to fetch PI feed', { gcid, error: String(error) });
    return null;
  }
}

/**
 * Process API response into PIPost objects
 */
function processPostResponse(
  response: EtoroFeedResponse,
  pi: PICategorySummary,
  category: PICategory
): PIPost[] {
  const posts: PIPost[] = [];

  for (const discussion of response.discussions || []) {
    const post = discussion.post;
    if (!post) continue;

    const msg = post.message || { text: '', languageCode: 'en' };
    const text = msg.text || '';
    const lang = msg.languageCode || 'en';
    const likes = post.likes || 0;
    const comments = discussion.commentsCount || 0;

    posts.push({
      author: pi.username,
      gcid: pi.gcid,
      category,
      created: post.created || new Date().toISOString(),
      text: text.slice(0, 500),
      language: lang,
      needsTranslation: !isEnglish(lang),
      likes,
      comments,
      engagement: likes + comments,
      tickers: extractTickers(text),
      copiers: pi.copiers,
      gain: pi.gain,
      riskScore: pi.riskScore,
    });
  }

  return posts;
}

/**
 * Aggregate ticker mentions across all posts
 */
function aggregateTickerMentions(posts: PIPost[]): {
  mentions: Record<string, TickerMention>;
  topTickers: TickerMention[];
} {
  const mentions: Record<string, TickerMention> = {};

  for (const post of posts) {
    for (const ticker of post.tickers) {
      if (!mentions[ticker]) {
        mentions[ticker] = {
          ticker,
          count: 0,
          categories: [],
          authors: [],
        };
      }
      mentions[ticker].count++;
      if (!mentions[ticker].categories.includes(post.category)) {
        mentions[ticker].categories.push(post.category);
      }
      if (!mentions[ticker].authors.includes(post.author)) {
        mentions[ticker].authors.push(post.author);
      }
    }
  }

  // Sort by count descending
  const topTickers = Object.values(mentions)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return { mentions, topTickers };
}

/**
 * Fetch and collect posts from top PIs across all 5 categories
 *
 * @param investors - List of popular investors
 * @param userDetails - Map of usernames to user details (contains gcid)
 * @param config - Optional configuration
 * @param onProgress - Optional progress callback
 * @returns FeedCollection with posts grouped by category
 */
export async function collectPIFeeds(
  investors: PopularInvestor[],
  userDetails: Map<string, UserDetail>,
  config: FeedCollectionConfig = {},
  onProgress?: FeedProgressCallback
): Promise<FeedCollection> {
  const startTime = Date.now();
  const postsPerPI = config.postsPerPI || MAX_POSTS_PER_PI;

  const updateProgress = (progress: number, message: string) => {
    logger.debug('Feed collection progress', { progress, message });
    if (onProgress) {
      onProgress(progress, message);
    }
  };

  updateProgress(0, 'Selecting PIs by category...');

  // Select PIs for each category
  const categoryPIs = selectPIsByCategory(investors, userDetails, config);

  // Deduplicate PIs across categories (except engaging which needs all)
  const seenGcids = new Set<number>();
  const pisToFetch: Array<{ pi: PICategorySummary; category: PICategory }> = [];

  const standardCategories: PICategory[] = ['elite', 'performers', 'conservative', 'active'];
  for (const category of standardCategories) {
    const pis = categoryPIs.get(category) || [];
    for (const pi of pis) {
      if (!seenGcids.has(pi.gcid)) {
        seenGcids.add(pi.gcid);
        pisToFetch.push({ pi, category });
      }
    }
  }

  // Add engaging candidates (we'll re-rank after fetching)
  const engagingCandidates = categoryPIs.get('engaging') || [];
  for (const pi of engagingCandidates) {
    if (!seenGcids.has(pi.gcid)) {
      seenGcids.add(pi.gcid);
      pisToFetch.push({ pi, category: 'engaging' });
    }
  }

  updateProgress(5, `Fetching posts from ${pisToFetch.length} PIs...`);

  // Fetch posts for each PI
  const allPosts: PIPost[] = [];
  let fetchedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < pisToFetch.length; i++) {
    const { pi, category } = pisToFetch[i];

    const response = await fetchPIPosts(pi.gcid, postsPerPI);

    if (response) {
      const posts = processPostResponse(response, pi, category);
      allPosts.push(...posts);
      fetchedCount++;
    } else {
      failedCount++;
    }

    // Update progress
    const progress = 5 + Math.round((i / pisToFetch.length) * 85);
    updateProgress(progress, `Fetched ${i + 1}/${pisToFetch.length} PIs...`);

    // Rate limiting between requests
    if (i < pisToFetch.length - 1) {
      await new Promise(resolve => setTimeout(resolve, FEED_RATE_LIMIT_MS));
    }
  }

  updateProgress(90, 'Processing and aggregating posts...');

  // Group posts by category
  const byCategory: CategoryPosts = {
    elite: allPosts.filter(p => p.category === 'elite'),
    performers: allPosts.filter(p => p.category === 'performers'),
    conservative: allPosts.filter(p => p.category === 'conservative'),
    active: allPosts.filter(p => p.category === 'active'),
    engaging: [],
  };

  // For engaging category, take top posts by engagement score
  const engagingPosts = allPosts
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, (config.pisPerCategory || MAX_PIS_PER_CATEGORY) * postsPerPI);
  byCategory.engaging = engagingPosts;

  // Aggregate ticker mentions
  const { mentions, topTickers } = aggregateTickerMentions(allPosts);

  // Count non-English posts
  const nonEnglishCount = allPosts.filter(p => p.needsTranslation).length;

  const processingTime = Date.now() - startTime;
  updateProgress(100, `Feed collection complete in ${(processingTime / 1000).toFixed(1)}s`);

  return {
    collectedAt: new Date().toISOString(),
    totalPosts: allPosts.length,
    totalPIs: fetchedCount,
    posts: allPosts,
    byCategory,
    tickerMentions: mentions,
    topTickers,
    nonEnglishCount,
    stats: {
      fetchedPIs: fetchedCount,
      failedPIs: failedCount,
      totalRequests: pisToFetch.length,
      processingTimeMs: processingTime,
    },
  };
}

/**
 * Fetch posts for a specific list of gcids (for testing or targeted fetches)
 */
export async function fetchPostsByGcids(
  gcids: number[],
  postsPerPI: number = MAX_POSTS_PER_PI
): Promise<EtoroFeedResponse[]> {
  const results: EtoroFeedResponse[] = [];

  for (let i = 0; i < gcids.length; i++) {
    const response = await fetchPIPosts(gcids[i], postsPerPI);
    if (response) {
      results.push(response);
    }

    // Rate limiting
    if (i < gcids.length - 1) {
      await new Promise(resolve => setTimeout(resolve, FEED_RATE_LIMIT_MS));
    }
  }

  return results;
}
