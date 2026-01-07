import { describe, it, expect, beforeEach } from 'vitest';
import { AssetService } from '../asset-service';
import { mockInvestors, mockPositions } from '@/__tests__/mocks/etoro-api';

describe('AssetService', () => {
  const createMockRawData = (options: {
    instruments?: {
      details?: Record<string, unknown> | Map<number, unknown>;
      priceData?: Record<string, unknown> | Map<number, unknown>;
    };
    investors?: typeof mockInvestors;
  } = {}) => {
    const defaultInstrumentDetails = {
      '1001': {
        instrumentDisplayName: 'Apple Inc.',
        symbolFull: 'AAPL',
        exchangeID: 10,
        priceSource: 'NASDAQ',
        images: [{ uri: 'https://example.com/aapl.png', width: 150 }],
      },
      '1002': {
        instrumentDisplayName: 'Alphabet Inc.',
        symbolFull: 'GOOGL',
        exchangeID: 10,
        priceSource: 'NASDAQ',
        images: [{ uri: 'https://example.com/googl.png', width: 150 }],
      },
      '1003': {
        instrumentDisplayName: 'SPDR S&P 500 ETF',
        symbolFull: 'SPY',
        exchangeID: 11,
        priceSource: 'NYSE',
        images: [],
      },
    };

    const defaultPriceData = {
      '1001': {
        currentPrice: 185.50,
        returns: { yesterday: 1.5, weekTD: 3.2, monthTD: 5.8 },
      },
      '1002': {
        currentPrice: 145.00,
        returns: { yesterday: -0.8, weekTD: 1.1, monthTD: -2.3 },
      },
      '1003': {
        currentPrice: 450.00,
        returns: { yesterday: 0.3, weekTD: 1.8, monthTD: 4.2 },
      },
    };

    const defaultInvestors = mockInvestors.map(inv => ({
      ...inv,
      portfolio: {
        positions: mockPositions,
      },
    }));

    return {
      instruments: options.instruments || {
        details: defaultInstrumentDetails,
        priceData: defaultPriceData,
      },
      investors: options.investors || defaultInvestors,
    };
  };

  beforeEach(() => {
    // Reset any state if needed
  });

  describe('getAssetDetails', () => {
    it('should return asset details for valid instrument ID', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      expect(details).not.toBeNull();
      expect(details?.instrumentId).toBe(1001);
      expect(details?.displayName).toBe('Apple Inc.');
      expect(details?.symbol).toBe('AAPL');
      expect(details?.currentPrice).toBe(185.50);
    });

    it('should return null for non-existent instrument ID', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(9999, rawData);

      expect(details).toBeNull();
    });

    it('should return null for null/undefined raw data', () => {
      expect(AssetService.getAssetDetails(1001, null)).toBeNull();
      expect(AssetService.getAssetDetails(1001, undefined)).toBeNull();
    });

    it('should return null when instruments data is missing', () => {
      const details = AssetService.getAssetDetails(1001, { investors: [] });
      expect(details).toBeNull();
    });

    it('should calculate holders correctly', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      expect(details?.totalHolders).toBe(3); // All 3 mock investors hold this asset
      expect(details?.holders.length).toBe(3);
    });

    it('should sort holders by allocation descending', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      if (details && details.holders.length > 1) {
        for (let i = 0; i < details.holders.length - 1; i++) {
          expect(details.holders[i].allocation).toBeGreaterThanOrEqual(
            details.holders[i + 1].allocation
          );
        }
      }
    });

    it('should calculate average allocation correctly', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      expect(details?.averageAllocation).toBeGreaterThan(0);
      // Average should be total allocation / number of holders
      const totalAllocation = details?.holders.reduce((sum, h) => sum + h.allocation, 0) || 0;
      const expectedAverage = totalAllocation / (details?.totalHolders || 1);
      expect(details?.averageAllocation).toBeCloseTo(expectedAverage, 2);
    });

    it('should include returns data', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      expect(details?.returns).toBeDefined();
      expect(details?.returns.yesterday).toBe(1.5);
      expect(details?.returns.weekTD).toBe(3.2);
      expect(details?.returns.monthTD).toBe(5.8);
    });

    it('should calculate allocation distribution', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      expect(details?.allocationDistribution).toBeDefined();
      expect(details?.allocationDistribution.length).toBe(5); // 5 ranges
      expect(details?.allocationDistribution[0].range).toBe('0-1%');
    });

    it('should handle instruments as Map', () => {
      const detailsMap = new Map([
        [1001, {
          instrumentDisplayName: 'Apple Inc.',
          symbolFull: 'AAPL',
          images: [],
        }],
      ]);
      const priceMap = new Map([
        [1001, {
          currentPrice: 185.50,
          returns: { yesterday: 1.5, weekTD: 3.2, monthTD: 5.8 },
        }],
      ]);

      const rawData = createMockRawData({
        instruments: {
          details: detailsMap,
          priceData: priceMap,
        },
      });

      const details = AssetService.getAssetDetails(1001, rawData);

      expect(details).not.toBeNull();
      expect(details?.displayName).toBe('Apple Inc.');
    });

    it('should include holder details with avatar URL', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      const holderWithAvatar = details?.holders.find(h => h.avatarUrl);
      expect(holderWithAvatar).toBeDefined();
      expect(holderWithAvatar?.avatarUrl).toContain('etoro-cdn.etorostatic.com');
    });

    it('should include position details for each holder', () => {
      const rawData = createMockRawData();
      const details = AssetService.getAssetDetails(1001, rawData);

      details?.holders.forEach(holder => {
        expect(holder.position).toBeDefined();
        expect(holder.position.openDate).toBeDefined();
        expect(typeof holder.position.netProfit).toBe('number');
        expect(typeof holder.position.leverage).toBe('number');
      });
    });
  });

  describe('getTopAssets', () => {
    it('should return top assets by holder count', () => {
      const rawData = createMockRawData();
      const topAssets = AssetService.getTopAssets(rawData, 10);

      expect(topAssets.length).toBeGreaterThan(0);
    });

    it('should sort by holder count descending', () => {
      const rawData = createMockRawData();
      const topAssets = AssetService.getTopAssets(rawData, 10) as Array<{ holderCount: number }>;

      if (topAssets.length > 1) {
        for (let i = 0; i < topAssets.length - 1; i++) {
          expect(topAssets[i].holderCount).toBeGreaterThanOrEqual(
            topAssets[i + 1].holderCount
          );
        }
      }
    });

    it('should respect limit parameter', () => {
      const rawData = createMockRawData();
      const topAssets = AssetService.getTopAssets(rawData, 2);

      expect(topAssets.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for null data', () => {
      expect(AssetService.getTopAssets(null, 10)).toEqual([]);
    });

    it('should return empty array when instruments missing', () => {
      expect(AssetService.getTopAssets({ investors: [] }, 10)).toEqual([]);
    });

    it('should return empty array when investors missing', () => {
      expect(AssetService.getTopAssets({ instruments: {} }, 10)).toEqual([]);
    });

    it('should count unique holders correctly', () => {
      const rawData = createMockRawData();
      const topAssets = AssetService.getTopAssets(rawData, 10) as Array<{ instrumentId: number; holderCount: number }>;

      // Instrument 1001 (AAPL) should have 3 holders (all investors have it)
      const aaplAsset = topAssets.find(a => a.instrumentId === 1001);
      expect(aaplAsset?.holderCount).toBe(3);
    });

    it('should include instrument details and price data', () => {
      const rawData = createMockRawData();
      const topAssets = AssetService.getTopAssets(rawData, 10) as Array<{
        instrumentId: number;
        holderCount: number;
        details: unknown;
        priceData: unknown;
      }>;

      expect(topAssets[0]).toHaveProperty('instrumentId');
      expect(topAssets[0]).toHaveProperty('holderCount');
      expect(topAssets[0]).toHaveProperty('details');
      expect(topAssets[0]).toHaveProperty('priceData');
    });
  });
});
