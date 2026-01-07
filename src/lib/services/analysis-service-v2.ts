import { CensusAnalysis, PortfolioStats, InstrumentHolding, PerformerStats } from '../models/census';
import { ComprehensiveDataCollection, CollectedInvestorData } from './data-collection-service';
import { getInstrumentDisplayName, getInstrumentSymbol, getInstrumentImageUrl, InstrumentDisplayData, InstrumentPriceData } from './instrument-service';
import { getUserAvatarUrl } from './user-service';
import { UserDetail } from '../models/user';

export interface ProgressCallback {
  (progress: number, message: string): void;
}

/**
 * Enhanced Analysis service with S-curve Fear & Greed Index
 * This V2 version incorporates both cash percentage and risk score
 */
export class AnalysisServiceV2 {

  /**
   * Perform census analysis on a subset of investors using pre-collected data
   */
  async analyzeInvestorSubset(
    collectedData: ComprehensiveDataCollection,
    investorCount: number,
    onProgress?: ProgressCallback
  ): Promise<CensusAnalysis> {
    // Convert serialized objects back to Maps if needed
    const instrumentDetailsMap: Map<number, InstrumentDisplayData> = collectedData.instruments.details instanceof Map
      ? collectedData.instruments.details
      : new Map(Object.entries(collectedData.instruments.details).map(([k, v]) => [parseInt(k), v as InstrumentDisplayData]));

    const priceDataMap: Map<number, InstrumentPriceData> = collectedData.instruments.priceData instanceof Map
      ? collectedData.instruments.priceData
      : new Map(Object.entries(collectedData.instruments.priceData).map(([k, v]) => [parseInt(k), v as InstrumentPriceData]));

    const userDetailsMap: Map<string, UserDetail> = collectedData.userDetails instanceof Map
      ? collectedData.userDetails
      : new Map(Object.entries(collectedData.userDetails));
    const updateProgress = (progress: number, message: string) => {
      console.log(`Analysis Progress V2 (${investorCount} investors): ${progress}% - ${message}`);
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, `Starting V2 analysis of top ${investorCount} investors...`);

    // Take subset of investors (already sorted by copiers)
    const investors = collectedData.investors.slice(0, investorCount);
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
      instrumentDetailsMap,
      priceDataMap,
      investorCount
    );
    updateProgress(80, `Generated ${topHoldings.length} top holdings`);

    // Calculate top performers
    updateProgress(90, 'Calculating top performers...');
    const topPerformers = this.calculateTopPerformers(investors, portfolioStats, userDetailsMap);
    updateProgress(95, `Generated ${topPerformers.length} top performers`);

    // Calculate averages for S-curve
    const averageCashPercentage = this.calculateAverageCashPercentage(portfolioStats);
    const averageRiskScore = this.calculateAverageRiskScore(investors);

    // Final analysis compilation with V2 Fear & Greed Index
    updateProgress(98, 'Finalizing V2 analysis with S-curve Fear & Greed...');
    const result: CensusAnalysis = {
      fearGreedIndex: this.calculateFearGreedIndexV2(averageCashPercentage, averageRiskScore),
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
      topPerformers
    };

    updateProgress(100, `V2 Analysis complete for ${investorCount} investors!`);
    return result;
  }

  /**
   * Enhanced Fear & Greed Index using S-curve (sigmoid) function
   * Combines cash percentage and risk score
   */
  private calculateFearGreedIndexV2(avgCashPercentage: number, avgRiskScore: number): number {
    // Normalize inputs
    // Cash: 0% = max greed (0), 30% = max fear (30)
    const cashComponent = Math.min(30, Math.max(0, avgCashPercentage));

    // Risk: 1 = max fear (10), 10 = max greed (0)
    // Invert risk score so high risk = greed, low risk = fear
    const riskComponent = Math.max(0, Math.min(10, 10 - avgRiskScore));

    // Weight combination: 70% cash, 30% risk (multiplied by 5 as requested)
    const combinedScore = (cashComponent * 0.7) + (riskComponent * 5 * 0.3);

    // Apply sigmoid (S-curve) transformation
    // Center around 15 (midpoint), with steepness factor of 0.15
    const sigmoid = 1 / (1 + Math.exp(-0.15 * (combinedScore - 15)));

    // Map sigmoid output (0-1) to Fear & Greed scale (0-100)
    // Invert so high combined score = fear (low index), low score = greed (high index)
    const fearGreedIndex = Math.round(100 - (sigmoid * 100));

    // Ensure bounds
    return Math.max(0, Math.min(100, fearGreedIndex));
  }

  private calculatePortfolioStats(investors: CollectedInvestorData[]): PortfolioStats[] {
    return investors.map(investor => {
      const instruments: { [instrumentId: number]: number } = {};
      let totalInvested = 0;
      let cashPercentage = 0;

      if (!investor.portfolio?.positions || investor.portfolio.positions.length === 0) {
        return {
          username: investor.userName,
          cashPercentage: 100,
          uniqueInstruments: 0,
          totalGain: investor.gain || 0,
          instruments: {}
        };
      }

      investor.portfolio.positions.forEach(position => {
        const percentage = position.investmentPct || 0;
        totalInvested += percentage;

        if (instruments[position.instrumentId]) {
          instruments[position.instrumentId] += percentage;
        } else {
          instruments[position.instrumentId] = percentage;
        }
      });

      // Cash is what's not invested
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

  private aggregateInstrumentData(investors: CollectedInvestorData[]): { [instrumentId: number]: { totalAllocation: number; holders: number } } {
    const instrumentData: { [instrumentId: number]: { totalAllocation: number; holders: number } } = {};

    investors.forEach(investor => {
      if (!investor.portfolio?.positions) return;

      const investorInstruments = new Set<number>();

      investor.portfolio.positions.forEach(position => {
        const instrumentId = position.instrumentId;
        const allocation = position.investmentPct || 0;

        if (!instrumentData[instrumentId]) {
          instrumentData[instrumentId] = { totalAllocation: 0, holders: 0 };
        }

        instrumentData[instrumentId].totalAllocation += allocation;
        investorInstruments.add(instrumentId);
      });

      // Count unique holders
      investorInstruments.forEach(instrumentId => {
        instrumentData[instrumentId].holders++;
      });
    });

    return instrumentData;
  }

  private calculateTopHoldings(
    instrumentData: { [instrumentId: number]: { totalAllocation: number; holders: number } },
    instrumentDetails: Map<number, InstrumentDisplayData>,
    priceData: Map<number, InstrumentPriceData>,
    totalInvestors: number = 1500
  ): InstrumentHolding[] {
    const holdings = Object.entries(instrumentData)
      .map(([instrumentId, data]) => {
        const id = parseInt(instrumentId);
        const details = instrumentDetails.get(id);
        const price = priceData.get(id);
        const returns = price?.returns || { yesterday: 0, weekTD: 0, monthTD: 0 };

        return {
          instrumentId: id,
          instrumentName: getInstrumentDisplayName(details),
          symbol: getInstrumentSymbol(details),
          imageUrl: getInstrumentImageUrl(details),
          holdersCount: data.holders,
          holdersPercentage: (data.holders / totalInvestors) * 100,
          averageAllocation: data.totalAllocation / data.holders,
          totalAllocation: data.totalAllocation,
          yesterdayReturn: returns.yesterday,
          weekTDReturn: returns.weekTD,
          monthTDReturn: returns.monthTD
        };
      })
      .sort((a, b) => b.holdersCount - a.holdersCount)
      .slice(0, 20);

    return holdings;
  }

  private calculateTopPerformers(
    investors: CollectedInvestorData[],
    portfolioStats: PortfolioStats[],
    userDetails: Map<string, UserDetail>
  ): PerformerStats[] {
    // Create a map for quick lookup
    const statsMap = new Map(portfolioStats.map(stat => [stat.username, stat]));

    return investors
      .sort((a, b) => (b.copiers || 0) - (a.copiers || 0))
      .slice(0, 20)
      .map(investor => {
        const stats = statsMap.get(investor.userName);
        const userDetail = userDetails.get(investor.userName);

        return {
          username: investor.userName,
          fullName: investor.fullName || investor.userName,
          avatarUrl: getUserAvatarUrl(userDetail, investor.hasAvatar, investor.userName),
          copiers: investor.copiers || 0,
          gain: investor.gain || 0,
          riskScore: investor.riskScore || 0,
          cashPercentage: stats?.cashPercentage || 0,
          trades: investor.trades || 0,
          winRatio: investor.winRatio || 0,
          countryId: userDetail?.country
        };
      });
  }

  private calculateAverageCashPercentage(portfolioStats: PortfolioStats[]): number {
    if (portfolioStats.length === 0) return 0;
    const total = portfolioStats.reduce((sum, stats) => sum + stats.cashPercentage, 0);
    return Math.round((total / portfolioStats.length) * 10) / 10;
  }

  private calculateAverageRiskScore(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    const total = investors.reduce((sum, inv) => sum + (inv.riskScore || 0), 0);
    return Math.round(total / investors.length);
  }

  private calculateAverageUniqueInstruments(portfolioStats: PortfolioStats[]): number {
    if (portfolioStats.length === 0) return 0;
    const total = portfolioStats.reduce((sum, stats) => sum + stats.uniqueInstruments, 0);
    return Math.round(total / portfolioStats.length);
  }

  private calculateAverageGain(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    const total = investors.reduce((sum, inv) => sum + (inv.gain || 0), 0);
    return Math.round((total / investors.length) * 10) / 10;
  }

  private calculateAverageTrades(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    const total = investors.reduce((sum, inv) => sum + (inv.trades || 0), 0);
    return Math.round(total / investors.length);
  }

  private calculateAverageWinRatio(investors: CollectedInvestorData[]): number {
    if (investors.length === 0) return 0;
    const validInvestors = investors.filter(inv => inv.winRatio !== undefined && inv.winRatio !== null);
    if (validInvestors.length === 0) return 0;
    const total = validInvestors.reduce((sum, inv) => sum + (inv.winRatio || 0), 0);
    return Math.round((total / validInvestors.length) * 10) / 10;
  }

  private calculateUniqueInstrumentsDistribution(portfolioStats: PortfolioStats[]): { [range: string]: number } {
    const distribution: { [range: string]: number } = {
      '1-5': 0,
      '6-10': 0,
      '11-15': 0,
      '16-20': 0,
      '21+': 0
    };

    portfolioStats.forEach(stats => {
      const instruments = stats.uniqueInstruments;
      if (instruments <= 5) distribution['1-5']++;
      else if (instruments <= 10) distribution['6-10']++;
      else if (instruments <= 15) distribution['11-15']++;
      else if (instruments <= 20) distribution['16-20']++;
      else distribution['21+']++;
    });

    return distribution;
  }

  private calculateCashPercentageDistribution(portfolioStats: PortfolioStats[]): { [range: string]: number } {
    const distribution: { [range: string]: number } = {
      'Less than 1%': 0,
      '1-5%': 0,
      '> 5-10%': 0,
      '> 10-25%': 0,
      '> 25-50%': 0,
      '> 50-75%': 0,
      '> 75-100%': 0
    };

    portfolioStats.forEach(stats => {
      const cash = stats.cashPercentage;
      if (cash < 1) distribution['Less than 1%']++;
      else if (cash <= 5) distribution['1-5%']++;
      else if (cash <= 10) distribution['> 5-10%']++;
      else if (cash <= 25) distribution['> 10-25%']++;
      else if (cash <= 50) distribution['> 25-50%']++;
      else if (cash <= 75) distribution['> 50-75%']++;
      else distribution['> 75-100%']++;
    });

    return distribution;
  }

  private calculateReturnsDistribution(investors: CollectedInvestorData[]): { [range: string]: number } {
    const distribution: { [range: string]: number } = {
      '<-20%': 0,
      '-20% to -10%': 0,
      '-10% to 0%': 0,
      '0% to 10%': 0,
      '10% to 20%': 0,
      '20% to 50%': 0,
      '>50%': 0
    };

    investors.forEach(investor => {
      const gain = investor.gain || 0;
      if (gain < -20) distribution['<-20%']++;
      else if (gain < -10) distribution['-20% to -10%']++;
      else if (gain < 0) distribution['-10% to 0%']++;
      else if (gain < 10) distribution['0% to 10%']++;
      else if (gain < 20) distribution['10% to 20%']++;
      else if (gain < 50) distribution['20% to 50%']++;
      else distribution['>50%']++;
    });

    return distribution;
  }

  private calculateRiskScoreDistribution(investors: CollectedInvestorData[]): { [range: string]: number } {
    const distribution: { [range: string]: number } = {
      '1-2': 0,
      '3-4': 0,
      '5-6': 0,
      '7-8': 0,
      '9-10': 0
    };

    investors.forEach(investor => {
      const risk = investor.riskScore || 0;
      if (risk <= 2) distribution['1-2']++;
      else if (risk <= 4) distribution['3-4']++;
      else if (risk <= 6) distribution['5-6']++;
      else if (risk <= 8) distribution['7-8']++;
      else distribution['9-10']++;
    });

    return distribution;
  }

  /**
   * Generate multiple analyses for different investor counts from the same collected data
   */
  async generateMultipleBandAnalyses(
    collectedData: ComprehensiveDataCollection,
    bands: number[] = [100, 500, 1000, 1500, 2000],
    onProgress?: ProgressCallback
  ): Promise<{ count: number; analysis: CensusAnalysis }[]> {
    const updateProgress = (progress: number, message: string) => {
      console.log(`V2 Multi-band Analysis: ${progress}% - ${message}`);
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, 'Starting V2 multi-band analysis with S-curve Fear & Greed...');

    const validBands = bands.filter(count => count <= collectedData.investors.length);
    const results: { count: number; analysis: CensusAnalysis }[] = [];

    for (let i = 0; i < validBands.length; i++) {
      const band = validBands[i];
      const progressOffset = (i / validBands.length) * 100;
      const progressRange = 100 / validBands.length;

      updateProgress(progressOffset, `Analyzing band: top ${band} investors with V2 algorithm`);

      const analysis = await this.analyzeInvestorSubset(
        collectedData,
        band,
        (subProgress, subMessage) => {
          const scaledProgress = progressOffset + (subProgress * progressRange / 100);
          updateProgress(Math.round(scaledProgress), `V2 Band ${band}: ${subMessage}`);
        }
      );

      results.push({ count: band, analysis });

      const completedProgress = ((i + 1) / validBands.length) * 100;
      updateProgress(completedProgress, `Completed V2 analysis for top ${band} investors`);
    }

    updateProgress(100, `V2 Multi-band analysis complete! Generated ${results.length} analyses with S-curve Fear & Greed`);
    return results;
  }
}