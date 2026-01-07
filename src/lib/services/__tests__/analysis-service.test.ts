import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '../analysis-service';
import { mockCollectedData, mockInvestors } from '@/__tests__/mocks/etoro-api';
import { ComprehensiveDataCollection, CollectedInvestorData } from '../data-collection-service';

describe('AnalysisService', () => {
  let analysisService: AnalysisService;

  beforeEach(() => {
    analysisService = new AnalysisService();
  });

  describe('analyzeInvestorSubset', () => {
    it('should analyze a subset of investors correctly', async () => {
      const testData = createTestCollectedData();

      const result = await analysisService.analyzeInvestorSubset(testData, 2);

      expect(result).toBeDefined();
      expect(result.topPerformers).toBeDefined();
      expect(result.topHoldings).toBeDefined();
      expect(result.fearGreedIndex).toBeGreaterThanOrEqual(0);
      expect(result.fearGreedIndex).toBeLessThanOrEqual(100);
    });

    it('should call progress callback during analysis', async () => {
      const testData = createTestCollectedData();
      const progressCallback = vi.fn();

      await analysisService.analyzeInvestorSubset(testData, 2, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(100, expect.stringContaining('complete'));
    });

    it('should handle empty investor list', async () => {
      const emptyData = createTestCollectedData([]);

      const result = await analysisService.analyzeInvestorSubset(emptyData, 10);

      expect(result).toBeDefined();
      expect(result.topPerformers).toHaveLength(0);
      expect(result.topHoldings).toHaveLength(0);
    });

    it('should limit to actual investor count when requesting more', async () => {
      const testData = createTestCollectedData();
      const progressCallback = vi.fn();

      // Request 100 but only have 3
      await analysisService.analyzeInvestorSubset(testData, 100, progressCallback);

      // Should process all 3 investors without error
      expect(progressCallback).toHaveBeenCalledWith(100, expect.any(String));
    });
  });

  describe('generateMultipleBandAnalyses', () => {
    it('should generate analyses for multiple bands', async () => {
      const testData = createTestCollectedData();
      const bands = [1, 2, 3];

      const results = await analysisService.generateMultipleBandAnalyses(testData, bands);

      expect(results).toHaveLength(3);
      expect(results[0].count).toBe(1);
      expect(results[1].count).toBe(2);
      expect(results[2].count).toBe(3);
    });

    it('should filter out bands larger than investor count', async () => {
      const testData = createTestCollectedData();
      const bands = [1, 2, 100, 500];

      const results = await analysisService.generateMultipleBandAnalyses(testData, bands);

      // Only bands <= 3 should be processed
      expect(results).toHaveLength(2);
      expect(results.map(r => r.count)).toEqual([1, 2]);
    });

    it('should call progress callback for each band', async () => {
      const testData = createTestCollectedData();
      const progressCallback = vi.fn();
      const bands = [1, 2];

      await analysisService.generateMultipleBandAnalyses(testData, bands, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(100, expect.stringContaining('complete'));
    });
  });

  describe('Fear & Greed Index calculation', () => {
    it('should calculate fear greed index from cash percentage', async () => {
      // Create test data with known cash percentages
      // Scale: 20+ = Extreme Fear, 13 = Neutral, 7- = Extreme Greed
      // Higher cash = Fear (higher index), Lower cash = Greed (lower index)
      const lowCashInvestors = createInvestorsWithCash(5); // Low cash = Greed (lower index)
      const lowCashData = createTestCollectedData(lowCashInvestors);

      const highCashInvestors = createInvestorsWithCash(25); // High cash = Fear (higher index)
      const highCashData = createTestCollectedData(highCashInvestors);

      const lowCashResult = await analysisService.analyzeInvestorSubset(lowCashData, 1);
      const highCashResult = await analysisService.analyzeInvestorSubset(highCashData, 1);

      // High cash should result in higher fear/greed index (fear)
      expect(highCashResult.fearGreedIndex).toBeGreaterThan(lowCashResult.fearGreedIndex);
    });
  });

  describe('average calculations', () => {
    it('should calculate correct average gain', async () => {
      const testData = createTestCollectedData();

      const result = await analysisService.analyzeInvestorSubset(testData, 3);

      // Average of 25.5, 18.2, 12.0 = 18.57
      const expectedAvg = (25.5 + 18.2 + 12.0) / 3;
      expect(result.averageGain).toBeCloseTo(expectedAvg, 1);
    });

    it('should calculate correct average risk score', async () => {
      const testData = createTestCollectedData();

      const result = await analysisService.analyzeInvestorSubset(testData, 3);

      // Average of 4, 5, 3 = 4
      expect(result.averageRiskScore).toBeCloseTo(4, 0);
    });

    it('should calculate correct average trades', async () => {
      const testData = createTestCollectedData();

      const result = await analysisService.analyzeInvestorSubset(testData, 3);

      // Average of 150, 200, 80 = 143.33
      const expectedAvg = (150 + 200 + 80) / 3;
      expect(result.averageTrades).toBeCloseTo(expectedAvg, 0);
    });

    it('should calculate correct average win ratio', async () => {
      const testData = createTestCollectedData();

      const result = await analysisService.analyzeInvestorSubset(testData, 3);

      // Average of 68, 55, 72 = 65
      const expectedAvg = (68 + 55 + 72) / 3;
      expect(result.averageWinRatio).toBeCloseTo(expectedAvg, 0);
    });
  });
});

// Helper functions to create test data
function createTestCollectedData(investors?: CollectedInvestorData[]): ComprehensiveDataCollection {
  const testInvestors = investors || mockInvestors.map(inv => ({
    ...inv,
    portfolio: {
      positions: [
        { instrumentId: 1001, investmentPct: 15.5, instrumentName: 'Apple Inc.' },
        { instrumentId: 1002, investmentPct: 12.0, instrumentName: 'Alphabet Inc.' },
      ],
    },
    tradeInfo: { trades: inv.trades, winRatio: inv.winRatio },
  }));

  return {
    investors: testInvestors as CollectedInvestorData[],
    instruments: {
      details: new Map([
        [1001, { instrumentID: 1001, symbolFull: 'AAPL', instrumentDisplayName: 'Apple Inc.', exchangeID: 1, instrumentTypeID: 1, images: [] }],
        [1002, { instrumentID: 1002, symbolFull: 'GOOGL', instrumentDisplayName: 'Alphabet Inc.', exchangeID: 1, instrumentTypeID: 1, images: [] }],
      ]),
      priceData: new Map([
        [1001, { currentPrice: 150, closingPrices: { daily: 148, weekly: 145, monthly: 140 }, returns: { yesterday: 1.5, weekTD: 3.2, monthTD: 5.8 } }],
        [1002, { currentPrice: 120, closingPrices: { daily: 121, weekly: 119, monthly: 123 }, returns: { yesterday: -0.8, weekTD: 1.1, monthTD: -2.3 } }],
      ]),
    },
    userDetails: new Map(),
    metadata: {
      collectedAt: new Date().toISOString(),
      collectedAtUTC: new Date().toISOString(),
      totalInvestors: testInvestors.length,
      period: 'CurrYear',
      dataSource: 'test',
      processingTimeMs: 0,
    },
  };
}

function createInvestorsWithCash(cashPercentage: number): CollectedInvestorData[] {
  const investedPct = 100 - cashPercentage;
  return [{
    customerId: 9999,
    userName: 'testuser',
    fullName: 'Test User',
    hasAvatar: false,
    copiers: 1000,
    gain: 20,
    riskScore: 4,
    trades: 100,
    winRatio: 65,
    portfolio: {
      positions: [
        { instrumentId: 1001, investmentPct: investedPct, instrumentName: 'Apple Inc.' },
      ],
    },
    tradeInfo: { trades: 100, winRatio: 65 },
  }] as CollectedInvestorData[];
}
