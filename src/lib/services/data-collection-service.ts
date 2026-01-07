import { PopularInvestor, PeriodType, UserDetail, UserTradeInfo } from '../models/user';
import { UserPortfolio } from '../models/user-portfolio';
import { getPopularInvestors, getUserPortfolio, getUsersDetailsByUsernames, getUserTradeInfo } from './user-service';
import { getInstrumentDetails, getInstrumentPriceData, InstrumentPriceData, InstrumentDisplayData } from './instrument-service';
import { batchFetch } from './batch-fetcher';

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export interface CollectedInvestorData extends PopularInvestor {
  portfolio: UserPortfolio | null;
  portfolioError?: string;
  tradeInfo: UserTradeInfo | null;
  tradeInfoError?: string;
}

export interface ComprehensiveDataCollection {
  metadata: {
    collectedAt: string;
    collectedAtUTC: string;
    totalInvestors: number;
    period: string;
    dataSource: string;
    processingTimeMs: number;
  };
  investors: CollectedInvestorData[];
  instruments: {
    details: Map<number, InstrumentDisplayData>;
    priceData: Map<number, InstrumentPriceData>;
  };
  userDetails: Map<string, UserDetail>;
}

/**
 * Comprehensive data collection service that fetches ALL required data once
 * and stores it for multiple report generations without repeated API calls
 */
export class DataCollectionService {
  private startTime: number = 0;

  async collectAllData(
    period: PeriodType = 'CurrYear',
    maxInvestors: number = 2000,
    onProgress?: ProgressCallback
  ): Promise<ComprehensiveDataCollection> {
    this.startTime = Date.now();
    
    const updateProgress = (progress: number, message: string) => {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      console.log(`Data Collection [${elapsed}s]: ${progress}% - ${message}`);
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, `Starting comprehensive data collection for ${maxInvestors} investors...`);
    
    // Log dataset size for monitoring
    if (maxInvestors >= 2000) {
      console.warn(`Large dataset requested: ${maxInvestors} investors. This may take 15-30 minutes.`);
    } else if (maxInvestors >= 1500) {
      console.log(`Medium dataset requested: ${maxInvestors} investors. Estimated time: 10-20 minutes.`);
    }

    // Step 1: Fetch all investors (always fetch maximum to ensure consistency)
    updateProgress(5, `Fetching top ${maxInvestors} popular investors...`);
    const investors = await getPopularInvestors(period, maxInvestors);
    
    if (investors.length === 0) {
      throw new Error('No investors found');
    }

    // Check if we hit API limit
    if (investors.length < maxInvestors) {
      console.warn(`API LIMIT: Requested ${maxInvestors} investors but only received ${investors.length}`);
      updateProgress(8, `⚠️ eToro API limit: Only ${investors.length} investors available (requested ${maxInvestors})`);
    }

    // Sort by copiers to ensure consistent ordering
    investors.sort((a, b) => b.copiers - a.copiers);
    updateProgress(10, `Found ${investors.length} investors, sorted by copiers`);

    // Step 2: Fetch all portfolios with comprehensive error handling
    updateProgress(15, 'Fetching all investor portfolios...');
    const investorsWithPortfolios = await this.fetchAllPortfolios(investors, (progress, message) => {
      const scaledProgress = 15 + (progress * 35 / 100); // 15-50% range
      updateProgress(Math.round(scaledProgress), message);
    });

    // Step 2.5: Fetch all trade info with comprehensive error handling
    updateProgress(50, 'Fetching all investor trade info...');
    const investorsWithTradeInfo = await this.fetchAllTradeInfo(investorsWithPortfolios, period, (progress, message) => {
      const scaledProgress = 50 + (progress * 15 / 100); // 50-65% range
      updateProgress(Math.round(scaledProgress), message);
    });

    // Step 3: Extract all unique instruments from portfolios
    updateProgress(65, 'Extracting unique instruments from portfolios...');
    const uniqueInstrumentIds = this.extractUniqueInstruments(investorsWithTradeInfo);
    updateProgress(68, `Found ${uniqueInstrumentIds.length} unique instruments`);

    // Step 4: Fetch all instrument details
    updateProgress(70, 'Fetching instrument details...');
    const instrumentDetails = await getInstrumentDetails(uniqueInstrumentIds, (progress, message) => {
      const scaledProgress = 70 + (progress * 10 / 100); // 70-80% range
      updateProgress(Math.round(scaledProgress), message);
    });

    // Step 5: Fetch all instrument price data
    updateProgress(80, 'Fetching instrument closing prices...');
    const instrumentPriceData = await getInstrumentPriceData(uniqueInstrumentIds, (progress, message) => {
      const scaledProgress = 80 + (progress * 10 / 100); // 80-90% range
      updateProgress(Math.round(scaledProgress), message);
    });

    // Step 6: Fetch user details for avatars
    updateProgress(90, 'Fetching user details and avatars...');
    const usernames = investors.map(inv => inv.userName);
    const userDetails = await getUsersDetailsByUsernames(usernames, (progress, message) => {
      const scaledProgress = 90 + (progress * 8 / 100); // 90-98% range
      updateProgress(Math.round(scaledProgress), message);
    });

    // Step 7: Compile final data structure
    updateProgress(98, 'Finalizing data collection...');
    const processingTime = Date.now() - this.startTime;
    const collectionDate = new Date();

    const result: ComprehensiveDataCollection = {
      metadata: {
        collectedAt: collectionDate.toISOString(),
        collectedAtUTC: this.formatDateTime(collectionDate),
        totalInvestors: investors.length,
        period,
        dataSource: 'eToro API',
        processingTimeMs: processingTime
      },
      investors: investorsWithTradeInfo,
      instruments: {
        details: instrumentDetails,
        priceData: instrumentPriceData
      },
      userDetails
    };

    updateProgress(100, `Data collection complete! Processed ${investors.length} investors and ${uniqueInstrumentIds.length} instruments in ${(processingTime / 1000).toFixed(1)}s`);
    
    return result;
  }

  private async fetchAllPortfolios(
    investors: PopularInvestor[],
    onProgress?: ProgressCallback
  ): Promise<CollectedInvestorData[]> {
    const results = await batchFetch<PopularInvestor, UserPortfolio>(
      investors,
      {
        name: 'portfolios',
        fetchFn: (investor) => getUserPortfolio(investor.userName),
      },
      onProgress
    );

    return results.map(({ item: investor, result: portfolio, error }) => ({
      ...investor,
      portfolio,
      ...(error && { portfolioError: error }),
    }));
  }

  private async fetchAllTradeInfo(
    investors: CollectedInvestorData[],
    period: PeriodType,
    onProgress?: ProgressCallback
  ): Promise<CollectedInvestorData[]> {
    const results = await batchFetch<CollectedInvestorData, UserTradeInfo>(
      investors,
      {
        name: 'trade info',
        fetchFn: (investor) => getUserTradeInfo(investor.userName, period),
      },
      onProgress
    );

    return results.map(({ item: investor, result: tradeInfo, error }) => ({
      ...investor,
      tradeInfo,
      ...(error && { tradeInfoError: error }),
    }));
  }

  private extractUniqueInstruments(investors: CollectedInvestorData[]): number[] {
    const uniqueInstruments = new Set<number>();
    
    investors.forEach(investor => {
      if (investor.portfolio?.positions) {
        investor.portfolio.positions.forEach(position => {
          if (position.instrumentId) {
            uniqueInstruments.add(position.instrumentId);
          }
        });
      }
    });
    
    return Array.from(uniqueInstruments);
  }

  private formatDateTime(date: Date): string {
    // Always use UTC to avoid timezone confusion
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} at ${hours}:${minutes} UTC`;
  }
}

// Export singleton instance
export const dataCollectionService = new DataCollectionService();