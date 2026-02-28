import { z } from 'zod';
import { logger } from '../logger';

// Portfolio position schema
export const portfolioPositionSchema = z.object({
  instrumentId: z.number(),
  instrumentName: z.string().optional(),
  instrumentType: z.string().optional(),
  investmentPct: z.number().default(0),
  netProfit: z.number().optional(),
  openDate: z.string().optional(),
  currentRate: z.number().optional(),
  openRate: z.number().optional(),
});

export type PortfolioPositionOutput = z.output<typeof portfolioPositionSchema>;

// User portfolio schema
export const userPortfolioSchema = z.object({
  positions: z.array(portfolioPositionSchema).default([]),
  cashEquity: z.number().optional(),
  availableCash: z.number().optional(),
  totalValue: z.number().optional(),
  profitLoss: z.number().optional(),
  profitLossPercentage: z.number().optional(),
});

export type UserPortfolioOutput = z.output<typeof userPortfolioSchema>;

// Validation helper
export function validatePortfolio(data: unknown): UserPortfolioOutput {
  const result = userPortfolioSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid portfolio data', { issues: result.error.issues });
    return { positions: [] };
  }
  return result.data;
}
