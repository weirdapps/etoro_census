import { z } from 'zod';
import { logger } from '../logger';

/**
 * Zod schemas for PI feed data validation
 */

export const piCategorySchema = z.enum(['elite', 'performers', 'conservative', 'active', 'engaging']);

export const piPostSchema = z.object({
  author: z.string(),
  gcid: z.number(),
  category: piCategorySchema,
  created: z.string(),
  text: z.string(),
  language: z.string().default('en'),
  needsTranslation: z.boolean().default(false),
  likes: z.number().default(0),
  comments: z.number().default(0),
  engagement: z.number().default(0),
  tickers: z.array(z.string()).default([]),
  copiers: z.number().default(0),
  gain: z.number().default(0),
  riskScore: z.number().default(5),
});

export type PIPostInput = z.input<typeof piPostSchema>;
export type PIPostOutput = z.output<typeof piPostSchema>;

export const tickerMentionSchema = z.object({
  ticker: z.string(),
  count: z.number(),
  categories: z.array(piCategorySchema),
  authors: z.array(z.string()),
});

export const categoryPostsSchema = z.object({
  elite: z.array(piPostSchema),
  performers: z.array(piPostSchema),
  conservative: z.array(piPostSchema),
  active: z.array(piPostSchema),
  engaging: z.array(piPostSchema),
});

export const feedCollectionSchema = z.object({
  collectedAt: z.string(),
  totalPosts: z.number(),
  totalPIs: z.number(),
  posts: z.array(piPostSchema),
  byCategory: categoryPostsSchema,
  tickerMentions: z.record(z.string(), tickerMentionSchema),
  topTickers: z.array(tickerMentionSchema),
  nonEnglishCount: z.number(),
  stats: z.object({
    fetchedPIs: z.number(),
    failedPIs: z.number(),
    totalRequests: z.number(),
    processingTimeMs: z.number(),
  }),
});

export type FeedCollectionOutput = z.output<typeof feedCollectionSchema>;

// eToro API response schemas
export const etoroMessageSchema = z.object({
  text: z.string().default(''),
  languageCode: z.string().default('en'),
  type: z.string().optional(),
});

export const etoroPostSchema = z.object({
  id: z.string(),
  created: z.string(),
  modified: z.string().optional(),
  message: etoroMessageSchema,
  likes: z.number().default(0),
  userGcid: z.number(),
  username: z.string(),
});

export const etoroDiscussionSchema = z.object({
  post: etoroPostSchema,
  commentsCount: z.number().default(0),
});

export const etoroFeedResponseSchema = z.object({
  discussions: z.array(etoroDiscussionSchema).default([]),
  pagination: z.object({
    pageNumber: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
  }).optional(),
});

/**
 * Validate eToro feed API response
 */
export function validateFeedResponse(data: unknown) {
  const result = etoroFeedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid feed response', { issues: result.error.issues });
    return null;
  }
  return result.data;
}

/**
 * Validate a collection of PI posts
 */
export function validateFeedCollection(data: unknown) {
  const result = feedCollectionSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid feed collection', { issues: result.error.issues });
    return null;
  }
  return result.data;
}
