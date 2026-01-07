/**
 * Type definitions for eToro Census analysis scripts
 */

export interface CensusMetadata {
  generatedAt: string;
  generatedAtUTC: string;
  totalInvestors: number;
  analysisGroups: Array<{ count: number }>;
  dataSource: string;
  period: string;
}

export interface PortfolioPosition {
  positionId: number;
  instrumentId: number;
  instrumentName?: string;
  isBuy: boolean;
  leverage: number;
  investmentPct: number;
  netProfit: number;
  currentValue: number;
  currentRate: number;
  openRate: number;
  openTimestamp: string;
}

export interface Portfolio {
  realizedCreditPct: number;
  unrealizedCreditPct: number;
  totalValue?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
  positionsCount?: number;
  socialTradesCount?: number;
  positions?: PortfolioPosition[];
  socialTrades?: unknown[];
}

export interface TradeInfo {
  trades: number;
  winRatio: number;
}

export interface Investor {
  customerId: number;
  userName: string;
  fullName: string;
  hasAvatar: boolean;
  popularInvestor: boolean;
  gain: number;
  dailyGain: number;
  riskScore: number;
  copiers: number;
  trades?: number;
  winRatio?: number;
  countryId?: number;
  country?: string;
  avatarUrl?: string;
  portfolio?: Portfolio;
  tradeInfo?: TradeInfo;
}

export interface InstrumentImage {
  uri: string;
  width: number;
  height: number;
}

export interface InstrumentDetails {
  instrumentId?: number;
  instrumentDisplayName: string;
  symbolFull: string;
  instrumentTypeID?: number;
  instrumentTypeId?: number;
  images?: InstrumentImage[];
  symbol?: string;
  name?: string;
}

export interface InstrumentsData {
  details: Record<string, InstrumentDetails> | InstrumentDetails[];
  priceData?: Record<string, unknown>;
}

export interface Holding {
  instrumentId: number;
  symbol: string;
  instrumentName?: string;
  name?: string;
  holdersCount: number;
  avgAllocation?: number;
  averageAllocation?: number;
  yesterdayReturn?: number;
  weekTdReturn?: number;
  monthTdReturn?: number;
}

export interface AnalysisMetrics {
  fearGreedIndex?: number;
  averageGain?: number;
  averageRiskScore?: number;
  averageCopiers?: number;
  averageTrades?: number;
  averageWinRatio?: number;
}

export interface Analysis {
  investorCount: number;
  band?: string;
  metrics?: AnalysisMetrics;
  fearGreedIndex?: number;
  averages?: Record<string, number>;
  distributions?: Record<string, unknown>;
  topHoldings?: Holding[];
  topPerformers?: Investor[];
}

export interface CensusData {
  metadata: CensusMetadata;
  investors: Investor[];
  instruments: InstrumentsData;
  analyses: Analysis[];
}

export interface InstrumentInfo {
  name: string;
  symbol: string;
  type: string | number;
}

export interface FearGreedResult {
  value: number;
  status: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  emoji: string;
  cashPercentage: number;
}

export interface CopierChange {
  investor: Investor;
  change: number;
  percentChange: number;
}

export interface HoldingMover {
  symbol: string;
  name?: string;
  change: number;
  percentChange: number;
  currentHolders: number;
}

export interface DataFileInfo {
  filename: string;
  filepath: string;
}

export interface DataFilePair {
  today: string;
  yesterday: string;
  todayPath: string;
  yesterdayPath: string;
}

export interface WeeklyDataFiles {
  latest: string;
  weekAgo: string;
  latestPath: string;
  weekAgoPath: string;
  allFiles: string[];
}

export interface MonthlyDataFiles {
  latest: string;
  monthAgo: string;
  latestPath: string;
  monthAgoPath: string;
  allFiles: string[];
}
