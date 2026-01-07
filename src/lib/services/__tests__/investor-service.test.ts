import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvestorService } from '../investor-service';
import { mockInvestors, mockUserDetails, mockPositions } from '@/__tests__/mocks/etoro-api';

// Mock user-service
vi.mock('../user-service', () => ({
  getUserAvatarUrl: vi.fn((user, hasAvatar, username) => {
    if (hasAvatar && username) {
      return `https://etoro-cdn.etorostatic.com/avatars/${username}/150x150.png`;
    }
    return user?.avatars?.[0]?.url;
  }),
}));

describe('InvestorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRawData = (options: {
    investors?: typeof mockInvestors;
    userDetails?: Record<string, unknown> | Map<string, unknown>;
    instruments?: {
      details?: Record<string, unknown> | Map<number, unknown>;
      priceData?: Record<string, unknown> | Map<number, unknown>;
    };
  } = {}) => ({
    investors: options.investors || mockInvestors.map(inv => ({
      ...inv,
      portfolio: {
        positions: mockPositions,
      },
    })),
    userDetails: options.userDetails || mockUserDetails,
    instruments: options.instruments || {
      details: {
        '1001': { instrumentDisplayName: 'Apple Inc.', symbolFull: 'AAPL', images: [] },
        '1002': { instrumentDisplayName: 'Alphabet Inc.', symbolFull: 'GOOGL', images: [] },
        '1003': { instrumentDisplayName: 'SPDR S&P 500 ETF', symbolFull: 'SPY', images: [] },
      },
      priceData: {},
    },
  });

  describe('getInvestorProfile', () => {
    it('should return investor profile for valid username', () => {
      const rawData = createMockRawData();
      const profile = InvestorService.getInvestorProfile('testinvestor1', rawData);

      expect(profile).not.toBeNull();
      expect(profile?.username).toBe('testinvestor1');
      expect(profile?.fullName).toBe('Test Investor One');
      expect(profile?.copiers).toBe(5000);
      expect(profile?.gain).toBe(25.5);
      expect(profile?.riskScore).toBe(4);
    });

    it('should return null for non-existent username', () => {
      const rawData = createMockRawData();
      const profile = InvestorService.getInvestorProfile('nonexistent', rawData);

      expect(profile).toBeNull();
    });

    it('should return null for null/undefined raw data', () => {
      expect(InvestorService.getInvestorProfile('testinvestor1', null)).toBeNull();
      expect(InvestorService.getInvestorProfile('testinvestor1', undefined)).toBeNull();
    });

    it('should return null when investors array is missing', () => {
      const profile = InvestorService.getInvestorProfile('testinvestor1', { userDetails: {} });
      expect(profile).toBeNull();
    });

    it('should calculate portfolio stats correctly', () => {
      const rawData = createMockRawData();
      const profile = InvestorService.getInvestorProfile('testinvestor1', rawData);

      expect(profile?.portfolio).toBeDefined();
      expect(profile?.portfolio.positionsCount).toBe(3);
      expect(profile?.portfolio.positions).toHaveLength(3);
      // Cash percentage should be 100 - total invested
      expect(profile?.portfolio.cashPercentage).toBeCloseTo(64, 0); // 100 - (15.5 + 12.0 + 8.5)
    });

    it('should sort portfolio positions by allocation descending', () => {
      const rawData = createMockRawData();
      const profile = InvestorService.getInvestorProfile('testinvestor1', rawData);

      expect(profile?.portfolio.positions[0].allocation).toBe(15.5);
      expect(profile?.portfolio.positions[1].allocation).toBe(12.0);
      expect(profile?.portfolio.positions[2].allocation).toBe(8.5);
    });

    it('should get country name from ETORO_COUNTRY_MAPPING', () => {
      const rawData = createMockRawData();
      const profile = InvestorService.getInvestorProfile('testinvestor1', rawData);

      // Country 197 = Switzerland in ETORO_COUNTRY_MAPPING
      expect(profile?.country).toBe('Switzerland');
    });

    it('should handle userDetails as Map', () => {
      const userDetailsMap = new Map(Object.entries(mockUserDetails));
      const rawData = createMockRawData({ userDetails: userDetailsMap });
      const profile = InvestorService.getInvestorProfile('testinvestor1', rawData);

      expect(profile?.country).toBe('Switzerland');
    });
  });

  describe('getTopInvestors', () => {
    it('should return top investors sorted by copiers by default', () => {
      const rawData = createMockRawData();
      const topInvestors = InvestorService.getTopInvestors(rawData, 'copiers', 10);

      expect(topInvestors).toHaveLength(3);
      expect(topInvestors[0].copiers).toBe(5000);
      expect(topInvestors[1].copiers).toBe(3000);
      expect(topInvestors[2].copiers).toBe(1500);
    });

    it('should sort by gain when specified', () => {
      const rawData = createMockRawData();
      const topInvestors = InvestorService.getTopInvestors(rawData, 'gain', 10);

      expect(topInvestors[0].gain).toBe(25.5);
      expect(topInvestors[1].gain).toBe(18.2);
      expect(topInvestors[2].gain).toBe(12.0);
    });

    it('should sort by riskScore ascending when specified', () => {
      const rawData = createMockRawData();
      const topInvestors = InvestorService.getTopInvestors(rawData, 'riskScore', 10);

      // Lower risk score is better, so should be ascending
      expect(topInvestors[0].riskScore).toBe(3);
      expect(topInvestors[1].riskScore).toBe(4);
      expect(topInvestors[2].riskScore).toBe(5);
    });

    it('should respect limit parameter', () => {
      const rawData = createMockRawData();
      const topInvestors = InvestorService.getTopInvestors(rawData, 'copiers', 2);

      expect(topInvestors).toHaveLength(2);
    });

    it('should return empty array for null data', () => {
      expect(InvestorService.getTopInvestors(null, 'copiers', 10)).toEqual([]);
    });

    it('should return empty array when investors array is missing', () => {
      expect(InvestorService.getTopInvestors({}, 'copiers', 10)).toEqual([]);
    });
  });

  describe('searchInvestors', () => {
    it('should filter by minGain', () => {
      const rawData = createMockRawData();
      const results = InvestorService.searchInvestors(rawData, { minGain: 20 });

      expect(results).toHaveLength(1);
      expect(results[0].gain).toBe(25.5);
    });

    it('should filter by maxRiskScore', () => {
      const rawData = createMockRawData();
      const results = InvestorService.searchInvestors(rawData, { maxRiskScore: 4 });

      expect(results).toHaveLength(2);
      expect(results.every(inv => inv.riskScore <= 4)).toBe(true);
    });

    it('should filter by minCopiers', () => {
      const rawData = createMockRawData();
      const results = InvestorService.searchInvestors(rawData, { minCopiers: 3000 });

      expect(results).toHaveLength(2);
      expect(results.every(inv => inv.copiers >= 3000)).toBe(true);
    });

    it('should filter by hasPositionIn (instrument ID)', () => {
      const rawData = createMockRawData();
      const results = InvestorService.searchInvestors(rawData, { hasPositionIn: 1001 });

      expect(results.length).toBeGreaterThan(0);
      // All results should have position in instrument 1001
      results.forEach(inv => {
        const hasPosition = inv.portfolio.positions.some(p => p.instrumentId === 1001);
        expect(hasPosition).toBe(true);
      });
    });

    it('should combine multiple filters', () => {
      const rawData = createMockRawData();
      const results = InvestorService.searchInvestors(rawData, {
        minGain: 10,
        maxRiskScore: 5,
        minCopiers: 2000,
      });

      expect(results.every(inv => inv.gain >= 10)).toBe(true);
      expect(results.every(inv => inv.riskScore <= 5)).toBe(true);
      expect(results.every(inv => inv.copiers >= 2000)).toBe(true);
    });

    it('should return empty array for null data', () => {
      expect(InvestorService.searchInvestors(null, { minGain: 10 })).toEqual([]);
    });

    it('should return all investors when no criteria specified', () => {
      const rawData = createMockRawData();
      const results = InvestorService.searchInvestors(rawData, {});

      expect(results).toHaveLength(3);
    });
  });
});
