export interface CensusAnalysis {
  fearGreedIndex: number;
  averageUniqueInstruments: number;
  averageCashPercentage: number;
  averageGain: number;
  averageRiskScore: number;
  averageTrades: number;
  uniqueInstrumentsDistribution: { [range: string]: number };
  cashPercentageDistribution: { [range: string]: number };
  riskScoreDistribution: { [range: string]: number };
  topHoldings: InstrumentHolding[];
  returnsDistribution: { [range: string]: number };
  topPerformers: PerformerStats[];
}

export interface InstrumentHolding {
  instrumentId: number;
  instrumentName: string;
  symbol: string;
  imageUrl?: string;
  holdersCount: number;
  holdersPercentage: number;
  averageAllocation: number;
  totalAllocation: number;
  ytdReturn?: number;
}

export interface PerformerStats {
  username: string;
  fullName: string;
  gain: number;
  riskScore: number;
  winRatio: number;
  copiers: number;
  cashPercentage: number;
  avatarUrl?: string;
  trades: number;
}

export interface PortfolioStats {
  username: string;
  cashPercentage: number;
  uniqueInstruments: number;
  totalGain: number;
  instruments: { [instrumentId: number]: number };
}