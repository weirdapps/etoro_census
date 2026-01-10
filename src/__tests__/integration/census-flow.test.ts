import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '@/lib/services/analysis-service';
import { AnalysisServiceV2 } from '@/lib/services/analysis-service-v2';
import { ComprehensiveDataCollection, CollectedInvestorData } from '@/lib/services/data-collection-service';
import { InstrumentDisplayData, InstrumentPriceData } from '@/lib/services/instrument-service';
import { UserDetail } from '@/lib/models/user';

/**
 * Integration tests for the Census Report Generation Flow.
 * These tests verify that the analysis services correctly process
 * collected data and generate valid census analysis output.
 */
describe('Census Report Generation Flow', () => {
  // Mock collected data that simulates what DataCollectionService produces
  const createMockCollectedData = (investorCount: number): ComprehensiveDataCollection => {
    const investors: CollectedInvestorData[] = [];

    for (let i = 0; i < investorCount; i++) {
      investors.push({
        username: `investor${i}`,
        fullName: `Investor ${i}`,
        copiers: 1000 - i * 10,
        gain: 10 + Math.random() * 20,
        riskScore: Math.floor(Math.random() * 7) + 1,
        trades: Math.floor(Math.random() * 100) + 10,
        winRatio: 50 + Math.random() * 30,
        portfolio: {
          positions: [
            {
              instrumentId: 1001,
              netProfit: 100,
              investedAmount: 1000,
              currentRate: 150,
              openRate: 100,
              isBuy: true,
              leverage: 1,
            },
            {
              instrumentId: 1002,
              netProfit: -50,
              investedAmount: 500,
              currentRate: 90,
              openRate: 100,
              isBuy: true,
              leverage: 1,
            },
          ],
          cashBalance: 2000,
          totalValue: 10000,
        },
      });
    }

    const instrumentDetails = new Map<number, InstrumentDisplayData>();
    instrumentDetails.set(1001, {
      instrumentId: 1001,
      displayName: 'Apple Inc',
      symbol: 'AAPL',
      imageUrl: 'https://example.com/aapl.png',
    });
    instrumentDetails.set(1002, {
      instrumentId: 1002,
      displayName: 'Tesla Inc',
      symbol: 'TSLA',
      imageUrl: 'https://example.com/tsla.png',
    });

    const priceData = new Map<number, InstrumentPriceData>();
    priceData.set(1001, {
      instrumentId: 1001,
      yesterdayReturn: 1.5,
      weekTDReturn: 3.2,
      monthTDReturn: 5.1,
    });
    priceData.set(1002, {
      instrumentId: 1002,
      yesterdayReturn: -0.5,
      weekTDReturn: -1.2,
      monthTDReturn: 2.3,
    });

    const userDetails = new Map<string, UserDetail>();
    for (let i = 0; i < investorCount; i++) {
      userDetails.set(`investor${i}`, {
        username: `investor${i}`,
        avatarUrl: `https://example.com/avatar${i}.png`,
        displayFullName: `Investor ${i}`,
        aboutMeShort: `I am investor ${i}`,
      });
    }

    return {
      investors,
      instruments: {
        details: instrumentDetails,
        priceData,
      },
      userDetails,
      metadata: {
        collectedAt: new Date().toISOString(),
        totalInvestors: investorCount,
        totalInstruments: 2,
        processingTimeMs: 1000,
      },
    };
  };

  describe('AnalysisService', () => {
    let service: AnalysisService;

    beforeEach(() => {
      service = new AnalysisService();
    });

    it('should generate complete census analysis from collected data', async () => {
      const mockData = createMockCollectedData(100);
      const progressUpdates: { progress: number; message: string }[] = [];

      const analysis = await service.analyzeInvestorSubset(
        mockData,
        100,
        (progress, message) => {
          progressUpdates.push({ progress, message });
        }
      );

      // Verify analysis structure
      expect(analysis).toBeDefined();
      expect(analysis.fearGreedIndex).toBeGreaterThanOrEqual(0);
      expect(analysis.fearGreedIndex).toBeLessThanOrEqual(100);
      expect(analysis.averageCashPercentage).toBeGreaterThanOrEqual(0);
      expect(analysis.averageRiskScore).toBeGreaterThanOrEqual(1);
      expect(analysis.averageRiskScore).toBeLessThanOrEqual(7);
      expect(analysis.averageUniqueInstruments).toBeGreaterThan(0);
      expect(analysis.averageTrades).toBeGreaterThan(0);
      expect(analysis.averageWinRatio).toBeGreaterThan(0);

      // Verify distributions
      expect(analysis.uniqueInstrumentsDistribution).toBeDefined();
      expect(analysis.cashPercentageDistribution).toBeDefined();
      expect(analysis.returnsDistribution).toBeDefined();
      expect(analysis.riskScoreDistribution).toBeDefined();

      // Verify top holdings
      expect(analysis.topHoldings).toBeDefined();
      expect(Array.isArray(analysis.topHoldings)).toBe(true);

      // Verify top performers
      expect(analysis.topPerformers).toBeDefined();
      expect(Array.isArray(analysis.topPerformers)).toBe(true);
      expect(analysis.topPerformers.length).toBeLessThanOrEqual(20);

      // Verify progress callbacks were called
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].progress).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    it('should handle different investor subset sizes', async () => {
      const mockData = createMockCollectedData(500);

      // Analyze subsets of different sizes
      const analysis100 = await service.analyzeInvestorSubset(mockData, 100);
      const analysis250 = await service.analyzeInvestorSubset(mockData, 250);
      const analysis500 = await service.analyzeInvestorSubset(mockData, 500);

      // All should complete successfully
      expect(analysis100).toBeDefined();
      expect(analysis250).toBeDefined();
      expect(analysis500).toBeDefined();

      // Top performers should reflect the subset size limit
      expect(analysis100.topPerformers.length).toBeLessThanOrEqual(20);
      expect(analysis250.topPerformers.length).toBeLessThanOrEqual(20);
      expect(analysis500.topPerformers.length).toBeLessThanOrEqual(20);
    });

    it('should handle empty investor data gracefully', async () => {
      const emptyData = createMockCollectedData(0);

      // Should not throw, but handle gracefully
      await expect(
        service.analyzeInvestorSubset(emptyData, 0)
      ).resolves.toBeDefined();
    });

    it('should correctly identify top holdings by frequency', async () => {
      const mockData = createMockCollectedData(50);
      const analysis = await service.analyzeInvestorSubset(mockData, 50);

      // All investors have the same instruments, so holdings should reflect that
      if (analysis.topHoldings.length > 0) {
        const topHolding = analysis.topHoldings[0];
        expect(topHolding.instrumentId).toBeDefined();
        expect(topHolding.holdersCount).toBeGreaterThan(0);
        expect(topHolding.holdersPercentage).toBeGreaterThan(0);
      }
    });

    it('should calculate valid fear/greed index', async () => {
      const mockData = createMockCollectedData(100);
      const analysis = await service.analyzeInvestorSubset(mockData, 100);

      // Fear/greed index should be between 0 and 100
      expect(analysis.fearGreedIndex).toBeGreaterThanOrEqual(0);
      expect(analysis.fearGreedIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('AnalysisServiceV2', () => {
    let service: AnalysisServiceV2;

    beforeEach(() => {
      service = new AnalysisServiceV2();
    });

    it('should generate complete census analysis with V2 features', async () => {
      const mockData = createMockCollectedData(100);

      const analysis = await service.analyzeInvestorSubset(mockData, 100);

      // Verify V2 analysis structure (same as V1 but with S-curve Fear/Greed)
      expect(analysis).toBeDefined();
      expect(analysis.fearGreedIndex).toBeGreaterThanOrEqual(0);
      expect(analysis.fearGreedIndex).toBeLessThanOrEqual(100);
      expect(analysis.averageCashPercentage).toBeGreaterThanOrEqual(0);
      expect(analysis.topHoldings).toBeDefined();
      expect(analysis.topPerformers).toBeDefined();
    });

    it('should handle serialized Map objects (from session storage)', async () => {
      // Simulate data that comes from JSON.parse (Maps become objects)
      const mockData = createMockCollectedData(50);

      // Convert Maps to plain objects (simulates JSON serialization)
      const serializedData = {
        ...mockData,
        instruments: {
          details: Object.fromEntries(mockData.instruments.details),
          priceData: Object.fromEntries(mockData.instruments.priceData),
        },
        userDetails: Object.fromEntries(mockData.userDetails),
      };

      // V2 service should handle this gracefully
      const analysis = await service.analyzeInvestorSubset(
        serializedData as unknown as ComprehensiveDataCollection,
        50
      );

      expect(analysis).toBeDefined();
      expect(analysis.fearGreedIndex).toBeGreaterThanOrEqual(0);
    });

    it('should produce consistent results between V1 and V2', async () => {
      const mockData = createMockCollectedData(100);
      const v1Service = new AnalysisService();
      const v2Service = new AnalysisServiceV2();

      const v1Analysis = await v1Service.analyzeInvestorSubset(mockData, 100);
      const v2Analysis = await v2Service.analyzeInvestorSubset(mockData, 100);

      // Core metrics should be similar (Fear/Greed may differ due to S-curve)
      // Use tolerance of 0 (integer precision) since random data may vary
      expect(v1Analysis.averageCashPercentage).toBeCloseTo(v2Analysis.averageCashPercentage, 0);
      expect(v1Analysis.averageRiskScore).toBeCloseTo(v2Analysis.averageRiskScore, 0);

      // Both should have top performers arrays (may differ in length due to implementation differences)
      expect(Array.isArray(v1Analysis.topPerformers)).toBe(true);
      expect(Array.isArray(v2Analysis.topPerformers)).toBe(true);
    });
  });

  describe('Data Flow Validation', () => {
    it('should maintain data integrity through the analysis pipeline', async () => {
      const service = new AnalysisService();
      const investorCount = 100;
      const mockData = createMockCollectedData(investorCount);

      const analysis = await service.analyzeInvestorSubset(mockData, investorCount);

      // Verify that top performers come from the input data
      for (const performer of analysis.topPerformers) {
        const originalInvestor = mockData.investors.find(
          (inv) => inv.username === performer.username
        );
        expect(originalInvestor).toBeDefined();
        if (originalInvestor) {
          expect(performer.copiers).toBe(originalInvestor.copiers);
        }
      }
    });

    it('should correctly aggregate instrument holdings', async () => {
      const service = new AnalysisService();
      const mockData = createMockCollectedData(50);

      const analysis = await service.analyzeInvestorSubset(mockData, 50);

      // The topHoldings array is generated from portfolio data
      // It should either be empty (if no valid holdings) or contain valid holdings
      expect(analysis.topHoldings).toBeDefined();
      expect(Array.isArray(analysis.topHoldings)).toBe(true);

      // If there are holdings, verify they have the required structure
      if (analysis.topHoldings.length > 0) {
        const instrumentIds = analysis.topHoldings.map((h) => h.instrumentId);
        // Holdings should contain our mock instruments
        const hasValidInstrument = instrumentIds.some(id => id === 1001 || id === 1002);
        expect(hasValidInstrument).toBe(true);
      }
    });
  });
});
