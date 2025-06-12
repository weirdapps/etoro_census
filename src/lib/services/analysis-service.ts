import { CensusAnalysis, PortfolioStats, InstrumentHolding, PerformerStats } from '../models/census';
import { ComprehensiveDataCollection, CollectedInvestorData } from './data-collection-service';
import { getInstrumentDisplayName, getInstrumentSymbol, getInstrumentImageUrl, InstrumentDisplayData, InstrumentPriceData } from './instrument-service';
import { getUserAvatarUrl } from './user-service';
import { UserDetail } from '../models/user';

export interface ProgressCallback {
  (progress: number, message: string): void;
}

/**
 * Analysis service that works with pre-collected data instead of making API calls
 * This eliminates redundant API requests and enables faster multi-band analysis
 */
export class AnalysisService {
  
  /**
   * Perform census analysis on a subset of investors using pre-collected data
   */
  async analyzeInvestorSubset(
    collectedData: ComprehensiveDataCollection,
    investorCount: number,
    onProgress?: ProgressCallback
  ): Promise<CensusAnalysis> {
    const updateProgress = (progress: number, message: string) => {
      console.log(`Analysis Progress (${investorCount} investors): ${progress}% - ${message}`);
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, `Starting analysis of top ${investorCount} investors...`);

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
      collectedData.instruments.details,
      collectedData.instruments.priceData,
      investors.length
    );
    updateProgress(80, `Generated ${topHoldings.length} top holdings`);

    // Calculate top performers
    updateProgress(90, 'Calculating top performers...');
    const topPerformers = this.calculateTopPerformers(investors, portfolioStats, collectedData.userDetails);
    updateProgress(95, `Generated ${topPerformers.length} top performers`);

    // Final analysis compilation
    updateProgress(98, 'Finalizing analysis...');
    const result: CensusAnalysis = {
      fearGreedIndex: this.calculateFearGreedIndex(portfolioStats),
      averageUniqueInstruments: this.calculateAverageUniqueInstruments(portfolioStats),
      averageCashPercentage: this.calculateAverageCashPercentage(portfolioStats),
      averageGain: this.calculateAverageGain(investors),
      averageRiskScore: this.calculateAverageRiskScore(investors),
      uniqueInstrumentsDistribution: this.calculateUniqueInstrumentsDistribution(portfolioStats),
      cashPercentageDistribution: this.calculateCashPercentageDistribution(portfolioStats),
      topHoldings,
      returnsDistribution: this.calculateReturnsDistribution(investors),
      riskScoreDistribution: this.calculateRiskScoreDistribution(investors),
      topPerformers
    };

    updateProgress(100, `Analysis complete for ${investorCount} investors!`);
    return result;
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
      console.log(`Multi-band Analysis: ${progress}% - ${message}`);
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, 'Starting multi-band analysis...');
    
    const validBands = bands.filter(count => count <= collectedData.investors.length);
    const results: { count: number; analysis: CensusAnalysis }[] = [];

    for (let i = 0; i < validBands.length; i++) {
      const band = validBands[i];
      const progressOffset = (i / validBands.length) * 100;
      const progressRange = 100 / validBands.length;

      updateProgress(progressOffset, `Analyzing band: top ${band} investors`);

      const analysis = await this.analyzeInvestorSubset(
        collectedData,
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
    console.log(`Calculating top holdings for ${totalInvestors} investors, found ${Object.keys(instrumentData).length} unique instruments`);
    
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
          console.warn(`Instrument ${instrumentName} (${id}) has ${data.holdersCount} holders but only ${totalInvestors} total investors!`);
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

        return {
          username: investor.userName || 'Unknown',
          fullName: investor.fullName || investor.userName || 'Unknown Investor',
          gain: investor.gain || 0,
          riskScore: investor.riskScore || 0,
          copiers: investor.copiers || 0,
          cashPercentage: portfolio?.cashPercentage || 0,
          avatarUrl: userDetail ? getUserAvatarUrl(userDetail) : investor.avatarUrl,
          countryId: userDetail?.country
        };
      })
      .filter(performer => performer.username !== 'Unknown')
      .sort((a, b) => b.copiers - a.copiers);
  }

  // Distribution calculation methods (updated Fear & Greed scale: 20-7)
  private calculateFearGreedIndex(portfolioStats: PortfolioStats[]): number {
    if (portfolioStats.length === 0) return 13; // Neutral on new scale
    
    const avgCashPercentage = portfolioStats.reduce((sum, stats) => sum + stats.cashPercentage, 0) / portfolioStats.length;
    
    // New scale: 20+ = Extreme Fear, 13 = Neutral, 7- = Extreme Greed
    // High cash = Fear (higher numbers), Low cash = Greed (lower numbers)
    let fearGreedIndex: number;
    
    if (avgCashPercentage >= 35) {
      // Very high cash = Extreme Fear (20+)
      fearGreedIndex = Math.min(25, 20 + (avgCashPercentage - 35) * 0.3);
    } else if (avgCashPercentage >= 20) {
      // High cash = Fear (15-19)
      fearGreedIndex = 15 + ((avgCashPercentage - 20) / 15) * 4;
    } else if (avgCashPercentage >= 12) {
      // Medium cash = Neutral (12-14)
      fearGreedIndex = 12 + ((avgCashPercentage - 12) / 8) * 2;
    } else if (avgCashPercentage >= 5) {
      // Low-medium cash = Greed (8-11)
      fearGreedIndex = 8 + ((avgCashPercentage - 5) / 7) * 3;
    } else {
      // Very low cash = Extreme Greed (7-)
      fearGreedIndex = Math.max(4, 7 - (5 - avgCashPercentage) * 0.6);
    }
    
    return Math.round(Math.max(4, Math.min(25, fearGreedIndex)));
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

// Export singleton instance
export const analysisService = new AnalysisService();