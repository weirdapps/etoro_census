/**
 * Census Data Service
 * Loads and provides real eToro census data for market intelligence
 */

// Distribution bucket type (e.g., { "0-10%": 15, "10-20%": 25 })
type DistributionBuckets = Record<string, number>;

// Fear & Greed components (cash and risk contributions)
interface FearGreedComponents {
  cashComponent?: number;
  riskComponent?: number;
  combinedScore?: number;
}

interface CensusData {
  analyses: Array<{
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
  }>;
  investors: Array<{
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
  }>;
  instruments: {
    details: Array<{
      instrumentId: number;
      instrumentID: number;
      instrumentDisplayName: string;
      symbolFull: string;
      images?: Array<{
        width: number;
        height: number;
        uri: string;
      }>;
    }>;
    priceData: Array<{
      instrumentId: number;
      currentPrice?: number;
      previousDayPrice?: number;
      weekPrice?: number;
      monthPrice?: number;
    }>;
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

  private constructor() {}

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
            console.log(`Attempting to load census data from ${filePath}`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            this.censusData = JSON.parse(fileContent);
            this.lastFetchTime = Date.now();
            console.log(`Successfully loaded census data from ${fileName}`);
            return this.censusData;
          } catch (err) {
            console.log(`Failed to load ${fileName}, trying next...`);
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
            console.log(`Attempting to load census data from ${url}`);
            const response = await fetch(url);
            if (response.ok) {
              this.censusData = await response.json();
              this.lastFetchTime = Date.now();
              console.log(`Successfully loaded census data from ${url}`);
              return this.censusData;
            }
          } catch (err) {
            console.log(`Failed to load ${urlBase}${file}, trying next...`);
          }
        }
      }

      console.error('Failed to load census data from any source');
    } catch (error) {
      console.error('Failed to load census data:', error);
    }

    return null;
  }

  /**
   * Get top holdings from census data
   */
  async getTopHoldings(limit: number = 20): Promise<Array<any>> {
    const data = await this.loadCensusData();
    if (!data?.analyses?.[0]?.topHoldings) return [];

    // Create lookup maps for instruments
    const instrumentDetailsMap = new Map<number, any>();
    const instrumentPriceMap = new Map<number, any>();

    if (data.instruments?.details) {
      data.instruments.details.forEach((inst: any) => {
        instrumentDetailsMap.set(inst.instrumentId || inst.instrumentID, inst);
      });
    }

    if (data.instruments?.priceData) {
      data.instruments.priceData.forEach((price: any) => {
        instrumentPriceMap.set(price.instrumentId, price);
      });
    }

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
  async getTopPerformers(limit: number = 100): Promise<Array<any>> {
    const data = await this.loadCensusData();
    if (!data?.investors) return [];

    // Create lookup map for instruments
    const instrumentDetailsMap = new Map<number, any>();
    if (data.instruments?.details) {
      data.instruments.details.forEach((inst: any) => {
        instrumentDetailsMap.set(inst.instrumentId || inst.instrumentID, inst);
      });
    }

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
  async getMarketStats(): Promise<any> {
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
  async getSmartMoneyFlow(groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk' = 'all', baseUrl?: string): Promise<any> {
    const data = await this.loadCensusData(baseUrl);
    if (!data) {
      console.log('No census data loaded for smart money flow');
      return { buying: [], selling: [], topHoldings: [], risingStars: [], consensus: [] };
    }
    console.log('Census data loaded, investors count:', data.investors?.length);

    // Create lookup map for instruments
    const instrumentDetailsMap = new Map<number, any>();
    if (data.instruments?.details) {
      data.instruments.details.forEach((inst: any) => {
        instrumentDetailsMap.set(inst.instrumentId || inst.instrumentID, inst);
      });
    }

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

    console.log('Top investors count:', topInvestors.length);

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
    console.log('Holdings map size:', holdingsMap.size);
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

    console.log('Smart holdings count:', smartHoldings.length, 'First holding:', smartHoldings[0]);

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
  private calculateMarketSentiment(analysis: any): string {
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
  async getDivergenceOpportunities(): Promise<any> {
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
        opportunities.push({
          symbol,
          smartMoneyHolding: topRate,
          massHolding: massRate,
          divergence,
          signal: divergence > 0 ? 'SMART_ACCUMULATING' : 'SMART_DISTRIBUTING',
          opportunity: divergence > 0 ? 'Consider following smart money' : 'Consider taking profits'
        });
      }
    }

    return opportunities.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));
  }

  /**
   * Calculate holding rates for a group of investors
   */
  private calculateHoldingRates(investors: any[]): Map<string, number> {
    const holdings = new Map<string, number>();

    for (const investor of investors) {
      const uniqueSymbols = new Set<string>(
        investor.portfolio?.positions?.map((p: any) => p.symbol as string) || []
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