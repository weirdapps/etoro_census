import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataCollectionService } from '../data-collection-service';
import { mockInvestors, mockPortfolio, mockTradeInfo, mockUserDetails } from '@/__tests__/mocks/etoro-api';

// Mock the user-service module
vi.mock('../user-service', () => ({
  getPopularInvestors: vi.fn(),
  getUserPortfolio: vi.fn(),
  getUsersDetailsByUsernames: vi.fn(),
  getUserTradeInfo: vi.fn(),
}));

// Mock the instrument-service module
vi.mock('../instrument-service', () => ({
  getInstrumentDetails: vi.fn(),
  getInstrumentPriceData: vi.fn(),
}));

import { getPopularInvestors, getUserPortfolio, getUsersDetailsByUsernames, getUserTradeInfo } from '../user-service';
import { getInstrumentDetails, getInstrumentPriceData } from '../instrument-service';

describe('DataCollectionService', () => {
  let dataCollectionService: DataCollectionService;

  beforeEach(() => {
    dataCollectionService = new DataCollectionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('collectAllData', () => {
    it('should collect data for investors', async () => {
      // Setup mocks
      vi.mocked(getPopularInvestors).mockResolvedValue(mockInvestors);
      vi.mocked(getUserPortfolio).mockResolvedValue(mockPortfolio);
      vi.mocked(getUserTradeInfo).mockResolvedValue(mockTradeInfo);
      vi.mocked(getUsersDetailsByUsernames).mockResolvedValue(new Map(Object.entries(mockUserDetails)));
      vi.mocked(getInstrumentDetails).mockResolvedValue(new Map());
      vi.mocked(getInstrumentPriceData).mockResolvedValue(new Map());

      const result = await dataCollectionService.collectAllData('CurrYear', 10);

      expect(result).toBeDefined();
      expect(result.investors).toHaveLength(3);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.period).toBe('CurrYear');
    });

    it('should call progress callback during collection', async () => {
      vi.mocked(getPopularInvestors).mockResolvedValue(mockInvestors);
      vi.mocked(getUserPortfolio).mockResolvedValue(mockPortfolio);
      vi.mocked(getUserTradeInfo).mockResolvedValue(mockTradeInfo);
      vi.mocked(getUsersDetailsByUsernames).mockResolvedValue(new Map());
      vi.mocked(getInstrumentDetails).mockResolvedValue(new Map());
      vi.mocked(getInstrumentPriceData).mockResolvedValue(new Map());

      const progressCallback = vi.fn();

      await dataCollectionService.collectAllData('CurrYear', 10, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Should have multiple progress updates
      expect(progressCallback.mock.calls.length).toBeGreaterThan(3);
    });

    it('should throw error if no investors found', async () => {
      vi.mocked(getPopularInvestors).mockResolvedValue([]);

      await expect(dataCollectionService.collectAllData('CurrYear', 10)).rejects.toThrow('No investors found');
    });

    it('should handle portfolio fetch errors gracefully', async () => {
      vi.mocked(getPopularInvestors).mockResolvedValue(mockInvestors);
      vi.mocked(getUserPortfolio).mockRejectedValue(new Error('Portfolio fetch failed'));
      vi.mocked(getUserTradeInfo).mockResolvedValue(mockTradeInfo);
      vi.mocked(getUsersDetailsByUsernames).mockResolvedValue(new Map());
      vi.mocked(getInstrumentDetails).mockResolvedValue(new Map());
      vi.mocked(getInstrumentPriceData).mockResolvedValue(new Map());

      // Should not throw, should handle gracefully
      // Extended timeout due to retry logic in batch fetcher
      const result = await dataCollectionService.collectAllData('CurrYear', 10);

      expect(result).toBeDefined();
      expect(result.investors).toHaveLength(3);
    }, 30000); // 30 second timeout for retry handling

    it('should sort investors by copiers descending', async () => {
      const unsortedInvestors = [
        { ...mockInvestors[2], copiers: 100 },
        { ...mockInvestors[0], copiers: 5000 },
        { ...mockInvestors[1], copiers: 500 },
      ];

      vi.mocked(getPopularInvestors).mockResolvedValue(unsortedInvestors);
      vi.mocked(getUserPortfolio).mockResolvedValue(mockPortfolio);
      vi.mocked(getUserTradeInfo).mockResolvedValue(mockTradeInfo);
      vi.mocked(getUsersDetailsByUsernames).mockResolvedValue(new Map());
      vi.mocked(getInstrumentDetails).mockResolvedValue(new Map());
      vi.mocked(getInstrumentPriceData).mockResolvedValue(new Map());

      const result = await dataCollectionService.collectAllData('CurrYear', 10);

      expect(result.investors[0].copiers).toBe(5000);
      expect(result.investors[1].copiers).toBe(500);
      expect(result.investors[2].copiers).toBe(100);
    });

    it('should include processing time in metadata', async () => {
      vi.mocked(getPopularInvestors).mockResolvedValue(mockInvestors);
      vi.mocked(getUserPortfolio).mockResolvedValue(mockPortfolio);
      vi.mocked(getUserTradeInfo).mockResolvedValue(mockTradeInfo);
      vi.mocked(getUsersDetailsByUsernames).mockResolvedValue(new Map());
      vi.mocked(getInstrumentDetails).mockResolvedValue(new Map());
      vi.mocked(getInstrumentPriceData).mockResolvedValue(new Map());

      const result = await dataCollectionService.collectAllData('CurrYear', 10);

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.processingTimeMs).toBe('number');
    });
  });
});
