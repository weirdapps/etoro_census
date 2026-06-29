import { CensusAnalysis, PortfolioStats, InstrumentHolding, PerformerStats } from '../models/census';
import { ComprehensiveDataCollection, CollectedInvestorData } from './data-collection-service';
import { getInstrumentDisplayName, getInstrumentSymbol, getInstrumentImageUrl, InstrumentDisplayData, InstrumentPriceData } from './instrument-service';
import { getUserAvatarUrl } from './user-service';
import { UserDetail } from '../models/user';
import { FearGreedStrategy, linearStrategy } from './analysis/fear-greed-strategy';
import { Cache } from '../cache';
import { logger } from '../logger';

export interface ProgressCallback {
  (progress: number, message: string): void;
}

/**
 * Analysis service that works with pre-collected data instead of making API calls.
 * This eliminates redundant API requests and enables faster multi-band analysis.
 *
 * @description
 * Features:
 * - HTML report generation
 * - API endpoints that return JSON data
 * - Batch analysis of multiple investor bands (100/500/1000/1500)
 * - Pluggable Fear & Greed strategy (linear or S-curve)
 * - Automatic Map normalization for session storage data
 *
 * Use the exported singletons:
 * - `analysisService` - Uses linear Fear & Greed strategy
 * - `analysisServiceV2` - Uses S-curve Fear & Greed strategy
 *
 * @example
 * ```typescript
 * // Standard analysis with linear Fear & Greed
 * import { analysisService } from './analysis-service';
 * const analysis = await analysisService.analyzeInvestorSubset(data, 1000);
 *
 * // V2 analysis with S-curve Fear & Greed
 * import { analysisServiceV2 } from './analysis-service';
 * const analysis = await analysisServiceV2.analyzeInvestorSubset(data, 1000);
 * ```
 */
export class AnalysisService {
  private fearGreedStrategy: FearGreedStrategy;
  private analysisCache: Cache<CensusAnalysis>;

  constructor(fearGreedStrategy: FearGreedStrategy = linearStrategy) {
    this.fearGreedStrategy = fearGreedStrategy;
    this.analysisCache = new Cache<CensusAnalysis>({
      maxSize: 20,
      ttlMs: 5 * 60 * 1000, // 5 minutes
    });
  }

  /**
   * Generate a cache key based on data characteristics and investor count.
   * Includes a simple checksum of portfolio data to differentiate datasets.
   */
  private generateCacheKey(data: ComprehensiveDataCollection, investorCount: number): string {
    // Create a simple checksum from the first few investors' portfolio data
    const sampleInvestors = data.investors.slice(0, Math.min(5, investorCount));
    let checksum = 0;
    for (const inv of sampleInvestors) {
      // Sum of position counts and a multiplier for data variation
      const posCount = inv.portfolio?.positions?.length || 0;
      const totalPct = inv.portfolio?.positions?.reduce((sum, p) => sum + (p.investmentPct || 0), 0) || 0;
      checksum += posCount * 100 + Math.round(totalPct * 10);
    }

    const dataId = data.investors.length > 0
      ? `${data.investors.length}-${data.investors[0]?.userName || 'unknown'}-${checksum}`
      : 'empty';
    return `analysis-${dataId}-${investorCount}-${this.fearGreedStrategy.name}`;
  }

  /**
   * Normalize collected data to ensure Maps are properly instantiated.
   * Handles data from JSON.parse (session storage) where Maps become plain objects.
   */
  static normalizeCollectedData(data: ComprehensiveDataCollection): ComprehensiveDataCollection {
    const instrumentDetailsMap: Map<number, InstrumentDisplayData> = data.instruments.details instanceof Map
      ? data.instruments.details
      : new Map(Object.entries(data.instruments.details as Record<string, InstrumentDisplayData>)
          .map(([k, v]) => [parseInt(k), v]));

    const priceDataMap: Map<number, InstrumentPriceData> = data.instruments.priceData instanceof Map
      ? data.instruments.priceData
      : new Map(Object.entries(data.instruments.priceData as Record<string, InstrumentPriceData>)
          .map(([k, v]) => [parseInt(k), v]));

    const userDetailsMap: Map<string, UserDetail> = data.userDetails instanceof Map
      ? data.userDetails
      : new Map(Object.entries(data.userDetails as Record<string, UserDetail>));

    return {
      ...data,
      instruments: {
        details: instrumentDetailsMap,
        priceData: priceDataMap,
      },
      userDetails: userDetailsMap,
    };
  }

  /**
   * Perform census analysis on a subset of investors using pre-collected data.
   * Results are cached for 5 minutes to avoid redundant computation.
   */
  async analyzeInvestorSubset(
    collectedData: ComprehensiveDataCollection,
    investorCount: number,
    onProgress?: ProgressCallback
  ): Promise<CensusAnalysis> {
    // Normalize data to ensure Maps are properly instantiated
    const normalizedData = AnalysisService.normalizeCollectedData(collectedData);

    // Check cache first
    const cacheKey = this.generateCacheKey(normalizedData, investorCount);
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      logger.debug('Analysis cache hit', { investorCount });
      if (onProgress) {
        onProgress(100, `Analysis complete (cached) for ${investorCount} investors!`);
      }
      return cached;
    }

    const updateProgress = (progress: number, message: string) => {
      logger.debug('Analysis progress', { investorCount, progress, message });
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, `Starting analysis of top ${investorCount} investors...`);

    // Take subset of investors (already sorted by copiers)
    const investors = normalizedData.investors.slice(0, investorCount);
    updateProgress(10, `Selected top ${investors.length} investors`);

    // Calculate portfolio statistics
    updateProgress(20, 'Calculating portfolio statistics...');
    const portfolioStats = this.calculatePortfolioStats(investors);
    updateProgress(40, `Processed ${portfolioStats.length} portfolio statistics`);

    // Aggregate instrument data
    updateProgress(50, 'Aggregating instrument holdings...');
    const instrumentData = this.aggregateInstrumentData(investors);
    updateProgress(60, `Processed ${Object.keys(instrumentData).length} unique instruments`);

    // Calculate top holdings with price data
    updateProgress(70, 'Calculating top holdings...');
    const topHoldings = this.calculateTopHoldings(
      instrumentData,
      normalizedData.instruments.details,
      normalizedData.instruments.priceData,
      investors.length
    );
    updateProgress(80, `Generated ${topHoldings.length} top holdings`);

    // Calculate top performers
    updateProgress(90, 'Calculating top performers...');
    const topPerformers = this.calculateTopPerformers(investors, portfolioStats, normalizedData.userDetails);
    updateProgress(95, `Generated ${topPerformers.length} top performers`);

    // Final analysis compilation
    updateProgress(98, 'Finalizing analysis...');

    // Calculate averages needed for Fear & Greed Index
    const averageCashPercentage = this.calculateAverageCashPercentage(portfolioStats);
    const averageRiskScore = this.calculateAverageRiskScore(investors);

    const result: CensusAnalysis = {
      fearGreedIndex: this.calculateFearGreedIndex(averageCashPercentage, averageRiskScore),
      averageUniqueInstruments: this.calculateAverageUniqueInstruments(portfolioStats),
      averageCashPercentage,
      averageGain: this.calculateAverageGain(investors),
      averageRiskScore,
      averageTrades: this.calculateAverageTrades(investors),
      averageWinRatio: this.calculateAverageWinRatio(investors),
      uniqueInstrumentsDistribution: this.calculateUniqueInstrumentsDistribution(portfolioStats),
      cashPercentageDistribution: this.calculateCashPercentageDistribution(portfolioStats),
      topHoldings,
      returnsDistribution: this.calculateReturnsDistribution(investors),
      riskScoreDistribution: this.calculateRiskScoreDistribution(investors),
      topPerformers,
      _disclaimer: {
        selectionBias: `Analysis based on top ${investorCount} Popular Investors ranked by copier count`,
        survivorshipBias: 'Excludes failed, unpopular, or delisted investors; average returns likely biased upward',
        dataLimitations: 'Volatility and Sharpe ratios estimated from risk scores, not historical price data'
      }
    };

    // Cache the result
    this.analysisCache.set(cacheKey, result);

    updateProgress(100, `Analysis complete for ${investorCount} investors!`);
    return result;
  }

  /**
   * Clear the analysis cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Generate multiple analyses for different investor counts from the same collected data
   */
  async generateMultipleBandAnalyses(
    collectedData: ComprehensiveDataCollection,
    bands: number[] = [100, 500, 1000, 1500, 2000],
    onProgress?: ProgressCallback
  ): Promise<{ count: number; analysis: CensusAnalysis }[]> {
    // Normalize data once for all band analyses
    const normalizedData = AnalysisService.normalizeCollectedData(collectedData);

    const updateProgress = (progress: number, message: string) => {
      logger.debug('Multi-band analysis progress', { progress, message });
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, 'Starting multi-band analysis...');

    const validBands = bands.filter(count => count <= normalizedData.investors.length);
    const results: { count: number; analysis: CensusAnalysis }[] = [];

    for (let i = 0; i < validBands.length; i++) {
      const band = validBands[i];
      const progressOffset = (i / validBands.length) * 100;
      const progressRange = 100 / validBands.length;

      updateProgress(progressOffset, `Analyzing band: top ${band} investors`);

      const analysis = await this.analyzeInvestorSubset(
        normalizedData,
        band,
        (subProgress, subMessage) => {
          const scaledProgress = progressOffset + (subProgress * progressRange / 100);
          updateProgress(Math.round(scaledProgress), `Band ${band}: ${subMessage}`);
        }
      );

      results.push({ count: band, analysis });
      
      const completedProgress = ((i + 1) / validBands.length) * 100;
      updateProgress(completedProgress, `Completed analysis for top ${band} investors`);
    }

    updateProgress(100, `Multi-band analysis complete! Generated ${results.length} analyses`);
    return results;
  }

  private calculatePortfolioStats(investors: CollectedInvestorData[]): PortfolioStats[] {
    return investors
      .filter(investor => investor.portfolio?.positions && investor.portfolio.positions.length > 0)
      .map(investor => {
      const instruments: { [instrumentId: number]: number } = {};
      let totalInvested = 0;
      let cashPercentage = 0;

      investor.portfolio!.positions!.forEach(position => {
        const percentage = position.investmentPct || 0;
        totalInvested += percentage;

        if (position.instrumentId) {
          instruments[position.instrumentId] = (instruments[position.instrumentId] || 0) + percentage;
        }
      });

      cashPercentage = Math.max(0, 100 - totalInvested);

      return {
        username: investor.userName,
        cashPercentage,
        uniqueInstruments: Object.keys(instruments).length,
        totalGain: investor.gain || 0,
        instruments
      };
    });
  }

  private aggregateInstrumentData(investors: CollectedInvestorData[]): {
    [instrumentId: number]: {
      holdersCount: number;
      name: string;
      totalAllocation: number;
      allocations: number[];
    }
  } {
    const instrumentData: {
      [instrumentId: number]: {
        holdersCount: number;
        name: string;
        totalAllocation: number;
        allocations: number[];
      }
    } = {};

    // Track which investors hold which instruments to avoid double counting
    const instrumentHolders = new Map<number, Set<string>>();

    investors.forEach(investor => {
      if (investor.portfolio?.positions) {
        // Group positions by instrument ID to aggregate multiple positions of same instrument
        const investorInstruments = new Map<number, number>();
        
        investor.portfolio.positions.forEach(position => {
          if (position.instrumentId && position.investmentPct) {
            const id = position.instrumentId;
            const percentage = position.investmentPct;
            
            // Aggregate multiple positions of same instrument for this investor
            const currentAllocation = investorInstruments.get(id) || 0;
            investorInstruments.set(id, currentAllocation + percentage);
            
            // Initialize instrument data if not exists
            if (!instrumentData[id]) {
              instrumentData[id] = {
                holdersCount: 0,
                name: position.instrumentName || `Instrument ${id}`,
                totalAllocation: 0,
                allocations: []
              };
              instrumentHolders.set(id, new Set());
            }
          }
        });

        // Now process aggregated instruments for this investor
        investorInstruments.forEach((totalAllocation, instrumentId) => {
          const holders = instrumentHolders.get(instrumentId)!;
          
          // Only count each investor once per instrument
          if (!holders.has(investor.userName)) {
            holders.add(investor.userName);
            instrumentData[instrumentId].holdersCount++;
            instrumentData[instrumentId].totalAllocation += totalAllocation;
            instrumentData[instrumentId].allocations.push(totalAllocation);
          }
        });
      }
    });

    return instrumentData;
  }

  private calculateTopHoldings(
    instrumentData: { [instrumentId: number]: { holdersCount: number; name: string; totalAllocation: number; allocations: number[] } },
    instrumentDetails: Map<number, InstrumentDisplayData>,
    instrumentPriceData: Map<number, InstrumentPriceData>,
    totalInvestors: number
  ): InstrumentHolding[] {
    logger.debug('Calculating top holdings', {
      totalInvestors,
      uniqueInstruments: Object.keys(instrumentData).length
    });
    
    return Object.entries(instrumentData)
      .map(([instrumentId, data]) => {
        const id = parseInt(instrumentId);
        const details = instrumentDetails.get(id);
        const priceData = instrumentPriceData.get(id);
        
        const averageAllocation = data.allocations.length > 0 
          ? data.totalAllocation / data.allocations.length 
          : 0;

        const instrumentName = details ? getInstrumentDisplayName(details) : data.name;
        const symbol = details ? getInstrumentSymbol(details) : `ID-${id}`;
        const imageUrl = details ? getInstrumentImageUrl(details) : undefined;

        // Ensure holders count never exceeds total investors
        const validHoldersCount = Math.min(data.holdersCount, totalInvestors);
        const holdersPercentage = Math.round((validHoldersCount / totalInvestors) * 100 * 10) / 10;

        // Validation logging for top instruments
        if (data.holdersCount > totalInvestors) {
          logger.warn('Instrument holders exceed total investors', {
            instrumentName,
            instrumentId: id,
            holdersCount: data.holdersCount,
            totalInvestors
          });
        }

        return {
          instrumentId: id,
          instrumentName,
          symbol,
          imageUrl,
          holdersCount: validHoldersCount,
          holdersPercentage,
          averageAllocation: Math.round(averageAllocation * 10) / 10,
          totalAllocation: Math.round(data.totalAllocation * 10) / 10,
          ytdReturn: undefined, // Legacy field
          yesterdayReturn: priceData?.returns?.yesterday,
          weekTDReturn: priceData?.returns?.weekTD,
          monthTDReturn: priceData?.returns?.monthTD
        };
      })
      .sort((a, b) => b.holdersCount - a.holdersCount);
  }

  private calculateTopPerformers(
    investors: CollectedInvestorData[],
    portfolioStats: PortfolioStats[],
    userDetails: Map<string, UserDetail>
  ): PerformerStats[] {
    return investors
      .map(investor => {
        const portfolio = portfolioStats.find(p => p.username === investor.userName);
        const userDetail = userDetails.get(investor.userName);

        // Get avatar URL from userDetails first, then fallback to constructed URL
        // Popular Investors typically have avatars even when hasAvatar flag is false
        const avatarFromDetails = userDetail ? getUserAvatarUrl(userDetail) : undefined;
        const fallbackAvatarUrl = investor.userName
          ? `https://etoro-cdn.etorostatic.com/avatars/${investor.userName.toLowerCase()}/150x150.png`
          : undefined;

        return {
          username: investor.userName || 'Unknown',
          fullName: investor.fullName || investor.userName || 'Unknown Investor',
          gain: investor.gain || 0,
          riskScore: investor.riskScore || 0,
          copiers: investor.copiers || 0,
          cashPercentage: portfolio?.cashPercentage || 0,
          trades: investor.tradeInfo?.trades || investor.trades || 0,
          winRatio: investor.tradeInfo?.winRatio || investor.winRatio || 0,
          avatarUrl: avatarFromDetails || investor.avatarUrl || fallbackAvatarUrl,
          countryId: userDetail?.country || investor.tradeInfo?.countryId
        };
      })
      .filter(performer => performer.username !== 'Unknown')
      .sort((a, b) => b.copiers - a.copiers);
  }

  /**
   * Calculate Fear & Greed Index using the configured strategy.
   * Uses 0-100 scale matching CNN convention:
   * - 0 = Extreme Fear
   * - 50 = Neutral
   * - 100 = Extreme Greed
   */
  private calculateFearGreedIndex(avgCashPercentage: number, avgRiskScore: number): number {
    return Math.round(this.fearGreedStrategy.calculate(avgCashPercentage, avgRiskScore));
  }

  private calculateAverageUniqueInstruments(portfolioStats: PortfolioStats[]): number {
    if (portfolioStats.length === 0) return 0;
    const total = portfolioStats.reduce((sum, stats) => sum + stats.uniqueInstruments, 0);
    return Math.round((total / portfolioStats.length) * 10) / 10;
  }

  private calculateAverageCashPercentage(portfolioStats: PortfolioStats[]): number {
    if (portfolioStats.length === 0) return 0;
    const total = portfolioStats.reduce((sum, stats) => sum + stats.cashPercentage, 0);
    return Math.round((total / portfolioStats.length) * 10) / 10;
  }

  private calculateAverageGain(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    
    const gains = investors
      .map(inv => inv.gain)
      .filter(gain => 
        gain !== null && 
        gain !== undefined && 
        !isNaN(gain) && 
        gain > -100 && 
        gain < 1000
      );
    
    if (gains.length === 0) return 0;
    
    const totalGain = gains.reduce((sum, gain) => sum + gain, 0);
    return Math.round((totalGain / gains.length) * 10) / 10;
  }

  private calculateAverageRiskScore(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    const totalRiskScore = investors.reduce((sum, investor) => sum + (investor.riskScore || 0), 0);
    return Math.round((totalRiskScore / investors.length) * 10) / 10;
  }

  private calculateAverageTrades(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    
    const validTrades = investors
      .map(inv => inv.tradeInfo?.trades || inv.trades || 0)
      .filter(trades => 
        trades !== null && 
        trades !== undefined && 
        !isNaN(trades) && 
        trades >= 0
      );
    
    if (validTrades.length === 0) return 0;
    
    const totalTrades = validTrades.reduce((sum, trades) => sum + trades, 0);
    return Math.round((totalTrades / validTrades.length) * 10) / 10;
  }

  private calculateAverageWinRatio(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    
    const validWinRatios = investors
      .map(inv => inv.tradeInfo?.winRatio || inv.winRatio || 0)
      .filter(winRatio => 
        winRatio !== null && 
        winRatio !== undefined && 
        !isNaN(winRatio) && 
        winRatio >= 0 && 
        winRatio <= 100
      );
    
    if (validWinRatios.length === 0) return 0;
    
    const totalWinRatio = validWinRatios.reduce((sum, winRatio) => sum + winRatio, 0);
    return Math.round((totalWinRatio / validWinRatios.length) * 10) / 10;
  }


  private calculateUniqueInstrumentsDistribution(portfolioStats: PortfolioStats[]): { [range: string]: number } {
    const distribution = { '1-5': 0, '6-10': 0, '11-20': 0, '21-50': 0, '50+': 0 };
    
    portfolioStats.forEach(stats => {
      const count = stats.uniqueInstruments;
      if (count <= 5) distribution['1-5']++;
      else if (count <= 10) distribution['6-10']++;
      else if (count <= 20) distribution['11-20']++;
      else if (count <= 50) distribution['21-50']++;
      else distribution['50+']++;
    });
    
    return distribution;
  }

  private calculateCashPercentageDistribution(portfolioStats: PortfolioStats[]): { [range: string]: number } {
    const distribution = {
      'Less than 1%': 0, '1-5%': 0, '> 5-10%': 0, '> 10-25%': 0, 
      '> 25-50%': 0, '> 50-75%': 0, '> 75-100%': 0
    };
    
    portfolioStats.forEach(stats => {
      const percentage = stats.cashPercentage;
      if (percentage < 1) distribution['Less than 1%']++;
      else if (percentage <= 5) distribution['1-5%']++;
      else if (percentage <= 10) distribution['> 5-10%']++;
      else if (percentage <= 25) distribution['> 10-25%']++;
      else if (percentage <= 50) distribution['> 25-50%']++;
      else if (percentage <= 75) distribution['> 50-75%']++;
      else distribution['> 75-100%']++;
    });
    
    return distribution;
  }

  private calculateReturnsDistribution(investors: CollectedInvestorData[]): { [range: string]: number } {
    const distribution = {
      'Negative': 0, '0-5%': 0, '> 5-10%': 0, '> 10-25%': 0, 
      '> 25-50%': 0, '> 50-100%': 0, '> 100%': 0
    };
    
    investors.forEach(investor => {
      const gain = investor.gain;
      if (gain < 0) distribution['Negative']++;
      else if (gain <= 5) distribution['0-5%']++;
      else if (gain <= 10) distribution['> 5-10%']++;
      else if (gain <= 25) distribution['> 10-25%']++;
      else if (gain <= 50) distribution['> 25-50%']++;
      else if (gain <= 100) distribution['> 50-100%']++;
      else distribution['> 100%']++;
    });
    
    return distribution;
  }

  private calculateRiskScoreDistribution(investors: CollectedInvestorData[]): { [range: string]: number } {
    const distribution = {
      'Conservative (1-3)': 0, 'Moderate (4)': 0, 'Moderate (5)': 0,
      'Aggressive (6)': 0, 'Aggressive (7)': 0, 'Very High Risk (8-10)': 0
    };
    
    investors.forEach(investor => {
      const riskScore = investor.riskScore || 0;
      if (riskScore >= 1 && riskScore <= 3) distribution['Conservative (1-3)']++;
      else if (riskScore === 4) distribution['Moderate (4)']++;
      else if (riskScore === 5) distribution['Moderate (5)']++;
      else if (riskScore === 6) distribution['Aggressive (6)']++;
      else if (riskScore === 7) distribution['Aggressive (7)']++;
      else if (riskScore >= 8 && riskScore <= 10) distribution['Very High Risk (8-10)']++;
    });
    
    return distribution;
  }
}

import { sCurveStrategy } from './analysis/fear-greed-strategy';

// Export singleton instances
export const analysisService = new AnalysisService(linearStrategy);
export const analysisServiceV2 = new AnalysisService(sCurveStrategy);