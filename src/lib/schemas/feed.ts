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
    integrity: z.enum(['ok', 'failed']).optional(),
  }),
});

export type FeedCollectionOutput = z.output<typeof feedCollectionSchema>;

// eToro API response schemas
export const etoroMessageSchema = z.object({
  text: z.string().default(''),
  languageCode: z.string().default('en'),
  type: z.string().optional(),
});

// The feed API changed shape (seen 2026-10-24): the author moved to post.owner,
// likes to emotionsData.like.paging.totalCount, comments to
// summary.totalCommentsAndReplies. The legacy flat fields are still accepted, and
// both shapes are normalised to EtoroFeedResponse.
const etoroPostOwnerSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  username: z.string().optional(),
});

export const etoroPostSchema = z.object({
  id: z.string(),
  created: z.string(),
  modified: z.string().optional(),
  message: etoroMessageSchema,
  owner: etoroPostOwnerSchema.optional(),
  likes: z.number().optional(),
  userGcid: z.number().optional(),
  username: z.string().optional(),
});

export const etoroDiscussionSchema = z
  .object({
    post: etoroPostSchema,
    commentsCount: z.number().optional(),
    emotionsData: z.object({
      like: z.object({
        paging: z.object({ totalCount: z.number() }).partial().optional(),
      }).optional(),
    }).optional(),
    summary: z.object({ totalCommentsAndReplies: z.number() }).partial().optional(),
  })
  .transform(({ post, commentsCount, emotionsData, summary }) => {
    const { owner, ...rest } = post;
    const ownerGcid = Number(owner?.id);
    return {
      post: {
        ...rest,
        likes: post.likes ?? emotionsData?.like?.paging?.totalCount ?? 0,
        userGcid: post.userGcid ?? (Number.isFinite(ownerGcid) ? ownerGcid : 0),
        username: post.username ?? owner?.username ?? '',
      },
      commentsCount: commentsCount ?? summary?.totalCommentsAndReplies ?? 0,
    };
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
