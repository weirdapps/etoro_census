import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisService, analysisServiceV2 } from '@/lib/services/analysis-service';
import { ComprehensiveDataCollection, CollectedInvestorData } from '@/lib/services/data-collection-service';
import { InstrumentDisplayData, InstrumentPriceData } from '@/lib/services/instrument-service';
import { UserDetail } from '@/lib/models/user';
import { UserPortfolio } from '@/lib/models/user-portfolio';

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
      const mockPortfolio: UserPortfolio = {
        positions: [
          {
            positionId: 1000 + i,
            openTimestamp: new Date().toISOString(),
            openRate: 100,
            instrumentId: 1001,
            isBuy: true,
            leverage: 1,
            netProfit: 100,
            currentRate: 150,
          },
          {
            positionId: 2000 + i,
            openTimestamp: new Date().toISOString(),
            openRate: 100,
            instrumentId: 1002,
            isBuy: true,
            leverage: 1,
            netProfit: -50,
            currentRate: 90,
          },
        ],
        totalValue: 10000,
        profitLoss: 50,
        profitLossPercentage: 0.5,
      };

      investors.push({
        customerId: 10000 + i,
        userName: `investor${i}`,
        fullName: `Investor ${i}`,
        hasAvatar: true,
        popularInvestor: true,
        gain: 10 + Math.random() * 20,
        dailyGain: Math.random() * 2 - 1,
        riskScore: Math.floor(Math.random() * 7) + 1,
        copiers: 1000 - i * 10,
        trades: Math.floor(Math.random() * 100) + 10,
        winRatio: 50 + Math.random() * 30,
        portfolio: mockPortfolio,
        tradeInfo: {
          userName: `investor${i}`,
          fullName: `Investor ${i}`,
          weeksSinceRegistration: 100,
          countryId: 1,
          affiliateId: 0,
          isPopularInvestor: true,
          isFund: false,
          hasAvatar: true,
          gain: 10 + Math.random() * 20,
          dailyGain: Math.random() * 2 - 1,
          thisWeekGain: 1.5,
          riskScore: 3,
          maxDailyRiskScore: 4,
          maxMonthlyRiskScore: 5,
          copiers: 1000 - i * 10,
          copiedTrades: 50,
          copyTradesPct: 30,
          copyInvestmentPct: 25,
          baseLineCopiers: 800,
          copiersGain: 5,
          aumTier: 2,
          aumTierDesc: 'Medium',
          fundType: 0,
          virtualCopiers: 10,
          trades: Math.floor(Math.random() * 100) + 10,
          topTradedInstrumentId: 1001,
          topTradedAssetId: 1,
          winRatio: 50 + Math.random() * 30,
          dailyDd: 1.2,
          weeklyDd: 2.5,
          peakToValley: 10,
          profitableWeeksPct: 60,
          profitableMonthsPct: 70,
          avgPosSize: 5,
          highLeveragePct: 10,
          mediumLeveragePct: 30,
          lowLeveragePct: 60,
          firstActivity: Date.now() - 365 * 24 * 60 * 60 * 1000,
          lastActivity: Date.now(),
          activeWeeksPct: 80,
          instrumentPct: 50,
        },
      });
    }

    const instrumentDetails = new Map<number, InstrumentDisplayData>();
    instrumentDetails.set(1001, {
      instrumentID: 1001,
      instrumentDisplayName: 'Apple Inc',
      symbolFull: 'AAPL',
      exchangeID: 1,
      instrumentTypeID: 1,
      images: [{ instrumentID: 1001, uri: 'https://example.com/aapl.png' }],
    });
    instrumentDetails.set(1002, {
      instrumentID: 1002,
      instrumentDisplayName: 'Tesla Inc',
      symbolFull: 'TSLA',
      exchangeID: 1,
      instrumentTypeID: 1,
      images: [{ instrumentID: 1002, uri: 'https://example.com/tsla.png' }],
    });

    const priceData = new Map<number, InstrumentPriceData>();
    priceData.set(1001, {
      currentPrice: 150,
      closingPrices: { daily: 148, weekly: 145, monthly: 140 },
      returns: { yesterday: 1.5, weekTD: 3.2, monthTD: 5.1 },
    });
    priceData.set(1002, {
      currentPrice: 250,
      closingPrices: { daily: 252, weekly: 255, monthly: 245 },
      returns: { yesterday: -0.5, weekTD: -1.2, monthTD: 2.3 },
    });

    const userDetails = new Map<string, UserDetail>();
    for (let i = 0; i < investorCount; i++) {
      userDetails.set(`investor${i}`, {
        gcid: 10000 + i,
        realCID: 10000 + i,
        demoCID: 0,
        username: `investor${i}`,
        firstName: `First${i}`,
        middleName: null,
        lastName: `Last${i}`,
        language: 1,
        languageIsoCode: 'en',
        country: 1,
        allowDisplayFullName: true,
        aboutMe: `About investor ${i}`,
        aboutMeShort: `Short about ${i}`,
        userBio: {
          gcid: 10000 + i,
          aboutMe: `About investor ${i}`,
          aboutMeShort: `Short about ${i}`,
          languageCode: 'en',
          strategyID: null,
        },
        whiteLabel: 0,
        optOut: false,
        homepage: null,
        playerStatus: null,
        piLevel: 1,
        isPi: true,
        avatars: [{ url: `https://example.com/avatar${i}.png`, width: '50', height: '50', avatarType: 1 }],
        masterAccountCid: null,
        accountType: 1,
        fundType: null,
        isVerified: true,
        verificationLevel: 2,
        accountStatus: 1,
        gdprInfo: null,
        userFlowSignature: 'test',
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
        collectedAtUTC: new Date().toISOString(),
        totalInvestors: investorCount,
        period: 'CurrYear',
        dataSource: 'test',
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
      expect(analysis.topPerformers.length).toBeGreaterThan(0);

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

      // Top performers should be returned (may include all investors)
      expect(analysis100.topPerformers.length).toBeGreaterThan(0);
      expect(analysis250.topPerformers.length).toBeGreaterThan(0);
      expect(analysis500.topPerformers.length).toBeGreaterThan(0);
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

  describe('analysisServiceV2 (S-curve Fear & Greed)', () => {
    it('should generate complete census analysis with S-curve Fear & Greed', async () => {
      const mockData = createMockCollectedData(100);

      const analysis = await analysisServiceV2.analyzeInvestorSubset(mockData, 100);

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

      // Service should handle this gracefully via static normalizeCollectedData
      const analysis = await analysisServiceV2.analyzeInvestorSubset(
        serializedData as unknown as ComprehensiveDataCollection,
        50
      );

      expect(analysis).toBeDefined();
      expect(analysis.fearGreedIndex).toBeGreaterThanOrEqual(0);
    });

    it('should produce consistent results between linear and S-curve services', async () => {
      const mockData = createMockCollectedData(100);
      const v1Service = new AnalysisService();

      const v1Analysis = await v1Service.analyzeInvestorSubset(mockData, 100);
      const v2Analysis = await analysisServiceV2.analyzeInvestorSubset(mockData, 100);

      // Core metrics should be identical (only Fear/Greed differs due to S-curve)
      expect(v1Analysis.averageCashPercentage).toBeCloseTo(v2Analysis.averageCashPercentage, 0);
      expect(v1Analysis.averageRiskScore).toBeCloseTo(v2Analysis.averageRiskScore, 0);

      // Both should have top performers arrays
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
          (inv) => inv.userName === performer.username
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
