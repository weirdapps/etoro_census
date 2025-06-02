import { PopularInvestor, PeriodType } from '../models/user';
import { UserPortfolio } from '../models/user-portfolio';
import { getPopularInvestors, getUserPortfolio, getUsersDetailsByUsernames } from './user-service';
import { getInstrumentDetails, getInstrumentPriceData, InstrumentPriceData, InstrumentDisplayData } from './instrument-service';

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export interface CollectedInvestorData extends PopularInvestor {
  portfolio: UserPortfolio | null;
  portfolioError?: string;
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
  userDetails: Map<string, any>;
}

/**
 * Comprehensive data collection service that fetches ALL required data once
 * and stores it for multiple report generations without repeated API calls
 */
export class DataCollectionService {
  private startTime: number = 0;

  async collectAllData(
    period: PeriodType = 'CurrYear',
    maxInvestors: number = 1500,
    onProgress?: ProgressCallback
  ): Promise<ComprehensiveDataCollection> {
    this.startTime = Date.now();
    
    const updateProgress = (progress: number, message: string) => {
      console.log(`Data Collection Progress: ${progress}% - ${message}`);
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    updateProgress(0, 'Starting comprehensive data collection...');

    // Step 1: Fetch all investors (always fetch maximum to ensure consistency)
    updateProgress(5, `Fetching top ${maxInvestors} popular investors...`);
    const investors = await getPopularInvestors(period, maxInvestors);
    
    if (investors.length === 0) {
      throw new Error('No investors found');
    }

    // Sort by copiers to ensure consistent ordering
    investors.sort((a, b) => b.copiers - a.copiers);
    updateProgress(10, `Found ${investors.length} investors, sorted by copiers`);

    // Step 2: Fetch all portfolios with comprehensive error handling
    updateProgress(15, 'Fetching all investor portfolios...');
    const investorsWithPortfolios = await this.fetchAllPortfolios(investors, (progress, message) => {
      const scaledProgress = 15 + (progress * 50 / 100); // 15-65% range
      updateProgress(Math.round(scaledProgress), message);
    });

    // Step 3: Extract all unique instruments from portfolios
    updateProgress(65, 'Extracting unique instruments from portfolios...');
    const uniqueInstrumentIds = this.extractUniqueInstruments(investorsWithPortfolios);
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
      investors: investorsWithPortfolios,
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
    const results: CollectedInvestorData[] = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let consecutiveErrors = 0;
    let lastProgressUpdate = Date.now();
    const PROGRESS_UPDATE_INTERVAL = 2000; // Update every 2 seconds
    const MAX_CONSECUTIVE_ERRORS = 10; // Circuit breaker threshold
    const TIMEOUT_MS = 30000; // 30 second timeout per request

    const updateProgress = (progress: number, message: string) => {
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    for (const investor of investors) {
      // Circuit breaker: if too many consecutive errors, increase delays
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(`Circuit breaker activated: ${consecutiveErrors} consecutive errors. Increasing delays.`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        consecutiveErrors = 0; // Reset after pause
      }

      try {
        // Add timeout wrapper around portfolio fetch
        const portfolio = await Promise.race([
          getUserPortfolio(investor.userName),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Portfolio fetch timeout')), TIMEOUT_MS)
          )
        ]);
        
        results.push({
          ...investor,
          portfolio
        });
        successCount++;
        consecutiveErrors = 0; // Reset consecutive error count on success
        
      } catch (error) {
        consecutiveErrors++;
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch portfolio';
        console.error(`Error fetching portfolio for ${investor.userName} (consecutive errors: ${consecutiveErrors}):`, errorMessage);
        
        results.push({
          ...investor,
          portfolio: null,
          portfolioError: errorMessage
        });
        errorCount++;

        // If it's a timeout or rate limit error, increase delays
        if (errorMessage.includes('timeout') || errorMessage.includes('rate') || errorMessage.includes('429')) {
          console.warn('Detected timeout/rate limit. Increasing delays...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      processedCount++;
      
      // Update progress with time-based throttling
      const now = Date.now();
      const shouldUpdate = (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) || 
                          (processedCount % 25 === 0) || 
                          (processedCount === investors.length);
      
      if (shouldUpdate) {
        const progress = Math.round((processedCount / investors.length) * 100);
        const errorRate = (errorCount / processedCount * 100).toFixed(1);
        const message = `Processed ${processedCount}/${investors.length} portfolios (${successCount} success, ${errorCount} errors, ${errorRate}% error rate)`;
        updateProgress(progress, message);
        lastProgressUpdate = now;
      }
      
      // Adaptive delay based on error rate and progress
      const errorRate = errorCount / processedCount;
      let delay = 50; // Base delay
      
      if (errorRate > 0.2) { // If error rate > 20%, significantly slow down
        delay = 1000;
      } else if (errorRate > 0.1) { // If error rate > 10%, slow down
        delay = 500;
      } else if (processedCount > 100) { // After 100 requests, be more conservative
        delay = 150;
      }
      
      // Add extra delay every 50 requests to avoid rate limiting
      if (processedCount % 50 === 0 && processedCount > 0) {
        console.log(`Batch checkpoint: ${processedCount} processed. Taking extended break...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Emergency brake: if error rate is too high, pause and warn
      if (processedCount > 50 && errorRate > 0.3) {
        console.warn(`High error rate detected (${(errorRate * 100).toFixed(1)}%). Pausing for recovery...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        consecutiveErrors = 0; // Reset after pause
      }
    }

    const finalErrorRate = (errorCount / processedCount * 100).toFixed(1);
    console.log(`Portfolio collection complete: ${successCount} success, ${errorCount} errors out of ${processedCount} total (${finalErrorRate}% error rate)`);
    
    // Log warning if error rate is high
    if (errorCount / processedCount > 0.1) {
      console.warn(`High error rate detected (${finalErrorRate}%). Consider investigating API issues or rate limits.`);
    }
    
    return results;
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