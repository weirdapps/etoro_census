/**
 * Census Data Service
 * Loads and provides real eToro census data for market intelligence
 */

import { logger } from '../logger';

// Distribution bucket type (e.g., { "0-10%": 15, "10-20%": 25 })
type DistributionBuckets = Record<string, number>;

// Instrument detail from census data
interface CensusInstrumentDetail {
  instrumentId: number;
  instrumentID: number;
  instrumentDisplayName: string;
  symbolFull: string;
  images?: Array<{
    width: number;
    height: number;
    uri: string;
  }>;
}

// Instrument price data from census
interface CensusInstrumentPrice {
  instrumentId: number;
  currentPrice?: number;
  previousDayPrice?: number;
  weekPrice?: number;
  monthPrice?: number;
}

// Enhanced holding with computed fields
export interface EnhancedHolding {
  instrumentId: number;
  symbol: string;
  instrumentName: string;
  name: string;
  averageAllocation: number;
  holdersCount: number;
  holdersPercentage: number;
  totalAllocation: number;
  imageUrl?: string;
  currentPrice?: number;
  dayChange?: number;
  weekChange?: number;
  monthChange?: number;
  yesterdayReturn?: number;
  weekTDReturn?: number;
  monthTDReturn?: number;
}

// Top performer with portfolio info
export interface EnhancedPerformer {
  username: string;
  gain: number;
  copiers: number;
  riskScore?: number;
  cashPercent?: number;
  tradeInfo?: {
    trades: number;
    winRatio: number;
  };
  portfolio: {
    positions: Array<{
      instrumentId: number;
      symbol?: string;
      percentage: number;
    }>;
    positionsCount?: number;
    totalValue?: number;
  };
  portfolioSize: number;
  topHoldings?: Array<{
    symbol: string;
    allocation: number;
    name: string;
  }>;
}

// Market sentiment type
export type MarketSentiment = 'FEARFUL' | 'GREEDY' | 'BULLISH' | 'BEARISH' | 'NEUTRAL';

// Market statistics
export interface MarketStats {
  totalInvestors: number;
  averageGain: number;
  averageCopiers: number;
  averageRiskScore: number;
  averageCashPercent: number;
  averagePositions: number;
  fearGreedIndex?: {
    value: number;
    status: string;
    components: FearGreedComponents;
  };
  marketSentiment: MarketSentiment;
}

// Smart holding (simplified for smart money analysis)
export interface SmartHolding {
  instrumentId: number;
  symbol: string;
  holdersCount: number;
  averageAllocation: number;
  penetration: number;
}

// Smart money flow result
export interface SmartMoneyFlow {
  groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk';
  groupDescription: string;
  investorCount: number;
  topHoldings: SmartHolding[];
  risingStars: SmartHolding[];
  consensus: SmartHolding[];
  buying?: SmartHolding[];
  selling?: SmartHolding[];
}

// Divergence opportunity (smart money vs mass holdings)
export interface DivergenceOpportunity {
  symbol: string;
  smartMoneyHolding: number;
  massHolding: number;
  divergence: number;
  signal: 'SMART_ACCUMULATING' | 'SMART_DISTRIBUTING';
  opportunity: string;
}

// Fear & Greed components (cash and risk contributions)
interface FearGreedComponents {
  cashComponent?: number;
  riskComponent?: number;
  combinedScore?: number;
}

// Census investor data
interface CensusInvestor {
  username?: string;
  gain: number;
  copiers: number;
  riskScore?: number;
  cashPercent?: number;
  tradeInfo?: {
    trades: number;
    winRatio: number;
  };
  portfolio: {
    positions: Array<{
      instrumentId: number;
      symbol?: string;
      percentage: number;
    }>;
    positionsCount?: number;
    totalValue?: number;
  };
}

// Census analysis entry
interface CensusAnalysis {
  investorCount: number;
  averages: {
    gain: number;
    riskScore: number;
    copiers?: number;
    cashPercent?: number;
    positions?: number;
    trades?: number;
    winRatio?: number;
  };
  distributions?: {
    gains: DistributionBuckets;
    risk: DistributionBuckets;
    cash: DistributionBuckets;
  };
  fearGreedIndex?: {
    value: number;
    status: string;
    components: FearGreedComponents;
  };
  topHoldings: Array<{
    instrumentId: number;
    symbol: string;
    instrumentName: string;
    averageAllocation: number;
    holdersCount: number;
    holdersPercentage: number;
    totalAllocation: number;
    imageUrl?: string;
    yesterdayReturn?: number;
    weekTDReturn?: number;
    monthTDReturn?: number;
  }>;
  topPerformers: Array<{
    username?: string;
    gain: number;
    copiers: number;
    riskScore: number;
  }>;
}

interface CensusData {
  analyses: CensusAnalysis[];
  investors: CensusInvestor[];
  instruments: {
    details: CensusInstrumentDetail[];
    priceData: CensusInstrumentPrice[];
  };
  userDetails?: Record<string, {
    username: string;
    avatar?: {
      url: string;
    };
  }>;
  metadata: {
    timestamp: string;
    investorCount: number;
    version: string;
  };
}

class CensusDataService {
  private static instance: CensusDataService;
  private censusData: CensusData | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Memoized instrument maps - built once when census data is loaded
  private instrumentDetailsMap: Map<number, CensusInstrumentDetail> | null = null;
  private instrumentPriceMap: Map<number, CensusInstrumentPrice> | null = null;

  private constructor() {}

  /**
   * Build memoized instrument maps from census data.
   * Called once after data is loaded to avoid recreating maps on every method call.
   */
  private buildInstrumentMaps(): void {
    if (!this.censusData) return;

    // Build instrument details map
    this.instrumentDetailsMap = new Map();
    if (this.censusData.instruments?.details) {
      for (const inst of this.censusData.instruments.details) {
        this.instrumentDetailsMap.set(inst.instrumentId || inst.instrumentID, inst);
      }
    }

    // Build instrument price map
    this.instrumentPriceMap = new Map();
    if (this.censusData.instruments?.priceData) {
      for (const price of this.censusData.instruments.priceData) {
        this.instrumentPriceMap.set(price.instrumentId, price);
      }
    }
  }

  /**
   * Get memoized instrument details map.
   * Returns cached map or empty map if no data loaded.
   */
  private getInstrumentDetailsMap(): Map<number, CensusInstrumentDetail> {
    return this.instrumentDetailsMap || new Map();
  }

  /**
   * Get memoized instrument price map.
   * Returns cached map or empty map if no data loaded.
   */
  private getInstrumentPriceMap(): Map<number, CensusInstrumentPrice> {
    return this.instrumentPriceMap || new Map();
  }

  static getInstance(): CensusDataService {
    if (!CensusDataService.instance) {
      CensusDataService.instance = new CensusDataService();
    }
    return CensusDataService.instance;
  }

  /**
   * Load the latest census data
   */
  async loadCensusData(baseUrl?: string): Promise<CensusData | null> {
    try {
      // Check cache
      if (this.censusData && Date.now() - this.lastFetchTime < this.CACHE_DURATION) {
        return this.censusData;
      }

      // Check if we're running in Node.js (server-side) AND not on Vercel
      // On Vercel, static files are served separately, so we use fetch even server-side
      if (typeof window === 'undefined' && !process.env.VERCEL) {
        // Local dev server-side: Load directly from filesystem
        const fs = await import('fs/promises');
        const path = await import('path');

        const dataDir = path.join(process.cwd(), 'public', 'data');
        const dataFiles = [
          'census-data-latest.json',            // Fixed filename for Vercel deployment
          'latest-census.json',                 // Symlink fallback (for local dev)
        ];

        for (const fileName of dataFiles) {
          try {
            const filePath = path.join(dataDir, fileName);
            logger.debug('Attempting to load census data', { source: filePath });
            const fileContent = await fs.readFile(filePath, 'utf-8');
            this.censusData = JSON.parse(fileContent);
            this.lastFetchTime = Date.now();
            this.buildInstrumentMaps();
            logger.info('Successfully loaded census data', { source: fileName });
            return this.censusData;
          } catch (_err) {
            logger.debug('Census data file not found, trying next', { source: fileName });
          }
        }
      } else {
        // Client-side OR Vercel server-side: Use fetch
        // On Vercel serverless, we need absolute URLs, so use baseUrl if provided
        const urlBase = baseUrl || '';
        const dataFiles = [
          '/data/census-data-latest.json',            // Fixed filename for Vercel deployment
          '/data/latest-census.json',                 // Symlink fallback (for local dev)
        ];

        for (const file of dataFiles) {
          try {
            const url = `${urlBase}${file}`;
            logger.debug('Attempting to load census data', { source: url });
            const response = await fetch(url);
            if (response.ok) {
              this.censusData = await response.json();
              this.lastFetchTime = Date.now();
              this.buildInstrumentMaps();
              logger.info('Successfully loaded census data', { source: url });
              return this.censusData;
            }
          } catch (_err) {
            logger.debug('Census data file not found, trying next', { source: file });
          }
        }
      }

      logger.error('Failed to load census data from any source');
    } catch (error) {
      logger.error('Failed to load census data', { error: error instanceof Error ? error.message : String(error) });
    }

    return null;
  }

  /**
   * Get top holdings from census data
   */
  async getTopHoldings(limit: number = 20): Promise<EnhancedHolding[]> {
    const data = await this.loadCensusData();
    if (!data?.analyses?.[0]?.topHoldings) return [];

    // Use memoized maps (built when data was loaded)
    const instrumentDetailsMap = this.getInstrumentDetailsMap();
    const instrumentPriceMap = this.getInstrumentPriceMap();

    return data.analyses[0].topHoldings
      .slice(0, limit)
      .map(holding => {
        const details = instrumentDetailsMap.get(holding.instrumentId);
        const priceData = instrumentPriceMap.get(holding.instrumentId);

        return {
          ...holding,
          name: holding.instrumentName || details?.instrumentDisplayName || holding.symbol,
          imageUrl: holding.imageUrl || details?.images?.[2]?.uri, // 50x50 image
          currentPrice: priceData?.currentPrice,
          dayChange: holding.yesterdayReturn,
          weekChange: holding.weekTDReturn,
          monthChange: holding.monthTDReturn
        };
      });
  }

  /**
   * Get top performers
   */
  async getTopPerformers(limit: number = 100): Promise<EnhancedPerformer[]> {
    const data = await this.loadCensusData();
    if (!data?.investors) return [];

    // Use memoized map (built when data was loaded)
    const instrumentDetailsMap = this.getInstrumentDetailsMap();

    // Get usernames from userDetails if available
    const userDetailsMap = data.userDetails || {};

    return data.investors
      .sort((a, b) => b.gain - a.gain)
      .slice(0, limit)
      .map((investor, index) => {
        const username = investor.username ||
                        userDetailsMap[Object.keys(userDetailsMap)[index]]?.username ||
                        `Investor${index + 1}`;

        return {
          ...investor,
          username,
          portfolioSize: investor.portfolio?.positionsCount || investor.portfolio?.positions?.length || 0,
          topHoldings: investor.portfolio?.positions?.slice(0, 5).map(p => {
            const details = instrumentDetailsMap.get(p.instrumentId);
            return {
              symbol: p.symbol || details?.symbolFull || 'N/A',
              allocation: p.percentage,
              name: details?.instrumentDisplayName || p.symbol || 'Unknown'
            };
          })
        };
      });
  }

  /**
   * Get market statistics
   */
  async getMarketStats(): Promise<MarketStats | null> {
    const data = await this.loadCensusData();
    if (!data?.analyses?.[0]) return null;

    const analysis = data.analyses[0];
    return {
      totalInvestors: analysis.investorCount,
      averageGain: analysis.averages?.gain || 0,
      averageCopiers: analysis.averages?.copiers || 0,
      averageRiskScore: analysis.averages?.riskScore || 5,
      averageCashPercent: analysis.averages?.cashPercent || 15,
      averagePositions: analysis.averages?.positions || 20,
      fearGreedIndex: analysis.fearGreedIndex,
      marketSentiment: this.calculateMarketSentiment(analysis)
    };
  }

  /**
   * Find investors holding specific symbols
   */
  async getInvestorsHolding(symbols: string[]): Promise<Map<string, number>> {
    const data = await this.loadCensusData();
    if (!data?.investors) return new Map();

    const holdersMap = new Map<string, number>();

    for (const symbol of symbols) {
      let count = 0;
      for (const investor of data.investors) {
        if (investor.portfolio?.positions?.some(p => p.symbol === symbol)) {
          count++;
        }
      }
      holdersMap.set(symbol, count);
    }

    return holdersMap;
  }

  /**
   * Get smart money flow (what top investors are buying/selling)
   * Can analyze different investor groups
   */
  async getSmartMoneyFlow(groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk' = 'all', baseUrl?: string): Promise<SmartMoneyFlow> {
    const data = await this.loadCensusData(baseUrl);
    if (!data) {
      logger.debug('No census data loaded for smart money flow');
      return {
        groupType,
        groupDescription: 'No data available',
        investorCount: 0,
        topHoldings: [],
        risingStars: [],
        consensus: []
      };
    }
    logger.debug('Census data loaded for smart money flow', { investorCount: data.investors?.length });

    // Use memoized map (built when data was loaded)
    const instrumentDetailsMap = this.getInstrumentDetailsMap();

    // Select investor group based on type
    let topInvestors;
    let groupDescription;

    switch (groupType) {
      case 'topCopiers':
        // Top 100 by copiers (most trusted)
        topInvestors = data.investors
          .sort((a, b) => b.copiers - a.copiers)
          .slice(0, 100);
        groupDescription = 'Top 100 Most Copied (Social Proof)';
        break;

      case 'topPerformers':
        // Top 100 by YTD performance
        topInvestors = data.investors
          .sort((a, b) => b.gain - a.gain)
          .slice(0, 100);
        groupDescription = 'Top 100 YTD Performers';
        break;

      case 'lowRisk':
        // Top 100 by lowest risk score (most conservative)
        topInvestors = data.investors
          .filter(inv => inv.riskScore !== undefined && inv.riskScore > 0)
          .sort((a, b) => (a.riskScore ?? 0) - (b.riskScore ?? 0))
          .slice(0, 100);
        groupDescription = 'Top 100 Conservative (Low Risk)';
        break;

      default:
        // ALL investors (broad market consensus)
        topInvestors = data.investors;
        groupDescription = `All ${data.investors.length} Popular Investors`;
    }

    logger.debug('Smart money flow group selected', { count: topInvestors.length });

    // Aggregate their holdings by instrumentId (more reliable than symbol)
    const holdingsMap = new Map<number, { symbol: string, investors: Set<number>, totalAllocation: number }>();

    for (let investorIndex = 0; investorIndex < topInvestors.length; investorIndex++) {
      const investor = topInvestors[investorIndex];
      // First, aggregate positions by instrument for this investor
      const investorPositionsByInstrument = new Map<number, number>();

      for (const position of investor.portfolio?.positions || []) {
        const currentAllocation = investorPositionsByInstrument.get(position.instrumentId) || 0;
        const positionAllocation = position.percentage || (100 / Math.max(10, investor.portfolio?.positions?.length || 20));
        investorPositionsByInstrument.set(position.instrumentId, currentAllocation + positionAllocation);
      }

      // Now add aggregated positions to the holdings map
      for (const [instrumentId, totalInvestorAllocation] of investorPositionsByInstrument.entries()) {
        const details = instrumentDetailsMap.get(instrumentId);
        const symbol = details?.symbolFull || `ID${instrumentId}`;

        const current = holdingsMap.get(instrumentId) || {
          symbol,
          investors: new Set<number>(),
          totalAllocation: 0
        };

        // Add this investor to the set (ensures unique counting)
        current.investors.add(investorIndex);
        // Add the total allocation for this instrument from this investor
        current.totalAllocation += totalInvestorAllocation;

        holdingsMap.set(instrumentId, current);
      }
    }

    // Convert to array and sort by popularity
    logger.debug('Holdings aggregated', { size: holdingsMap.size });
    const smartHoldings = Array.from(holdingsMap.entries())
      .map(([instrumentId, data]) => {
        const uniqueHolders = data.investors.size;
        return {
          instrumentId,
          symbol: data.symbol,
          holdersCount: uniqueHolders,
          averageAllocation: data.totalAllocation / Math.max(1, uniqueHolders),
          penetration: (uniqueHolders / Math.max(1, topInvestors.length)) * 100
        };
      })
      .sort((a, b) => b.penetration - a.penetration);

    logger.debug('Smart holdings computed', { count: smartHoldings.length });

    return {
      groupType,
      groupDescription,
      investorCount: topInvestors.length,
      topHoldings: smartHoldings.slice(0, 20),
      risingStars: smartHoldings.filter(h => h.penetration > 30 && h.penetration < 60),
      consensus: smartHoldings.filter(h => h.penetration > 60)
    };
  }

  /**
   * Calculate return percentage
   */
  private calculateReturn(current?: number, previous?: number): number {
    if (!current || !previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Calculate market sentiment
   */
  private calculateMarketSentiment(analysis: CensusAnalysis): MarketSentiment {
    const fearGreed = analysis.fearGreedIndex?.value || 50;
    const avgGain = analysis.averages?.gain || 0;
    const avgCash = analysis.averages?.cashPercent || 15;

    if (fearGreed < 30 || avgCash > 25) return 'FEARFUL';
    if (fearGreed > 70 && avgGain > 20) return 'GREEDY';
    if (avgGain > 15 && avgCash < 10) return 'BULLISH';
    if (avgGain < 5 && avgCash > 20) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Get divergence opportunities (what masses do vs smart money)
   */
  async getDivergenceOpportunities(): Promise<DivergenceOpportunity[]> {
    const data = await this.loadCensusData();
    if (!data) return [];

    // Get holdings of top 10% performers
    const topInvestors = data.investors
      .sort((a, b) => b.gain - a.gain)
      .slice(0, Math.floor(data.investors.length * 0.1));

    // Get holdings of bottom 50% performers
    const massInvestors = data.investors
      .sort((a, b) => a.gain - b.gain)
      .slice(0, Math.floor(data.investors.length * 0.5));

    // Calculate holding rates for each group
    const topHoldings = this.calculateHoldingRates(topInvestors);
    const massHoldings = this.calculateHoldingRates(massInvestors);

    // Find divergences
    const opportunities = [];

    for (const [symbol, topRate] of topHoldings.entries()) {
      const massRate = massHoldings.get(symbol) || 0;
      const divergence = topRate - massRate;

      if (Math.abs(divergence) > 20) { // Significant divergence
        const signal: DivergenceOpportunity['signal'] = divergence > 0 ? 'SMART_ACCUMULATING' : 'SMART_DISTRIBUTING';
        opportunities.push({
          symbol,
          smartMoneyHolding: topRate,
          massHolding: massRate,
          divergence,
          signal,
          opportunity: divergence > 0 ? 'Consider following smart money' : 'Consider taking profits'
        });
      }
    }

    return opportunities.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));
  }

  /**
   * Calculate holding rates for a group of investors
   */
  private calculateHoldingRates(investors: CensusInvestor[]): Map<string, number> {
    const holdings = new Map<string, number>();

    for (const investor of investors) {
      const uniqueSymbols = new Set<string>(
        investor.portfolio?.positions?.map((p) => p.symbol).filter((s): s is string => !!s) || []
      );

      for (const symbol of uniqueSymbols) {
        holdings.set(symbol, (holdings.get(symbol) || 0) + 1);
      }
    }

    // Convert to percentages
    const rates = new Map<string, number>();
    for (const [symbol, count] of holdings.entries()) {
      rates.set(symbol, (count / investors.length) * 100);
    }

    return rates;
  }
}

export const censusDataService = CensusDataService.getInstance();