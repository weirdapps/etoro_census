import { z } from 'zod';
import { logger } from '../logger';

// Popular investor schema
export const popularInvestorSchema = z.object({
  customerId: z.number(),
  userName: z.string(),
  fullName: z.string().optional(),
  hasAvatar: z.boolean().optional(),
  copiers: z.number().default(0),
  gain: z.number().default(0),
  riskScore: z.number().min(1).max(10).default(5),
  dailyGain: z.number().optional(),
  weeklyGain: z.number().optional(),
  trades: z.number().optional(),
  winRatio: z.number().optional(),
  countryId: z.number().optional(),
});

export type PopularInvestorInput = z.input<typeof popularInvestorSchema>;
export type PopularInvestorOutput = z.output<typeof popularInvestorSchema>;

// Popular investors response schema
export const popularInvestorsResponseSchema = z.object({
  items: z.array(popularInvestorSchema),
  totalRows: z.number().optional(),
});

// User detail schema
export const userDetailSchema = z.object({
  username: z.string(),
  fullName: z.string().optional(),
  gcid: z.number(),
  avatars: z.array(z.object({
    url: z.string(),
    width: z.string(),
    height: z.string(),
    type: z.string(),
  })).optional(),
  country: z.number().optional(),
});

export type UserDetailOutput = z.output<typeof userDetailSchema>;

// Trade info schema
export const userTradeInfoSchema = z.object({
  trades: z.number().default(0),
  profitableTrades: z.number().optional(),
  winRatio: z.number().default(0),
  avgProfitPct: z.number().optional(),
  avgLossPct: z.number().optional(),
});

export type UserTradeInfoOutput = z.output<typeof userTradeInfoSchema>;

// Validation helper
export function validatePopularInvestors(data: unknown): PopularInvestorOutput[] {
  const result = popularInvestorsResponseSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid popular investors data', { issues: result.error.issues });
    return [];
  }
  return result.data.items;
}
