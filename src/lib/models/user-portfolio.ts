import { z } from 'zod';

export const UserPositionSchema = z.object({
  positionId: z.number(),
  openTimestamp: z.string(),
  openRate: z.number(),
  instrumentId: z.number(),
  instrumentName: z.string().optional(),
  isBuy: z.boolean(),
  leverage: z.number(),
  takeProfitRate: z.number().optional(),
  stopLossRate: z.number().optional(),
  socialTradeId: z.number().optional(),
  parentPositionId: z.number().optional(),
  investmentPct: z.number().optional(),
  netProfit: z.number().optional(),
  trailingStopLoss: z.boolean().optional(),
  currentValue: z.number().optional(),
  currentRate: z.number().optional(),
});

export type UserPosition = z.infer<typeof UserPositionSchema>;

export const SocialTradeSchema = z.object({
  socialTradeId: z.number(),
  parentUsername: z.string(),
  stopLossPercentage: z.number().optional(),
  openTimestamp: z.string(),
  investmentPct: z.number().optional(),
  openInvestmentPct: z.number().optional(),
  netProfit: z.number().optional(),
  openNetProfit: z.number().optional(),
  closedNetProfit: z.number().optional(),
  realizedPct: z.number().optional(),
  unrealizedPct: z.number().optional(),
  isClosing: z.boolean().optional(),
  positions: z.array(UserPositionSchema).optional(),
});

export type SocialTrade = z.infer<typeof SocialTradeSchema>;

export const UserPortfolioSchema = z.object({
  realizedCreditPct: z.number().optional(),
  unrealizedCreditPct: z.number().optional(),
  positions: z.array(UserPositionSchema),
  socialTrades: z.array(SocialTradeSchema).optional(),
  totalValue: z.number().optional(),
  profitLoss: z.number().optional(),
  profitLossPercentage: z.number().optional(),
});

export type UserPortfolio = z.infer<typeof UserPortfolioSchema>;