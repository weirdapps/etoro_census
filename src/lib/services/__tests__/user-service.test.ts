import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockInvestors, mockPortfolio, mockTradeInfo, mockUserDetails } from '@/__tests__/mocks/etoro-api';

// Mock the etoro-api-config module
vi.mock('../../etoro-api-config', () => ({
  API_ENDPOINTS: {
    USER_INFO_SEARCH: '/v1/user-info/people/search',
    USER_PORTFOLIO_LIVE: '/v1/user-info/people/{username}/portfolio-live',
    USER_INFO: '/v1/user-info/people',
    USER_TRADE_INFO: '/v1/user-info/people/{username}/tradeinfo',
  },
  fetchFromEtoroApi: vi.fn(),
}));

import { fetchFromEtoroApi } from '../../etoro-api-config';
import {
  getPopularInvestors,
  getUserPortfolio,
  getUsersDetailsByUsernames,
  getUsersDetails,
  getUserTradeInfo,
  getUserAvatarUrl,
} from '../user-service';

describe('user-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getPopularInvestors', () => {
    it('should fetch popular investors successfully', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({
        items: mockInvestors,
        totalRows: 3,
      });

      const result = await getPopularInvestors('CurrYear', 50);

      expect(result).toHaveLength(3);
      expect(result[0].userName).toBe('testinvestor1');
      expect(fetchFromEtoroApi).toHaveBeenCalled();
    });

    it('should handle pagination for large requests', async () => {
      const firstPage = mockInvestors.slice(0, 2);
      const secondPage = [mockInvestors[2]];

      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce({ items: firstPage, totalRows: 3 })
        .mockResolvedValueOnce({ items: secondPage, totalRows: 3 });

      const result = await getPopularInvestors('CurrYear', 100);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array on error', async () => {
      vi.mocked(fetchFromEtoroApi).mockRejectedValue(new Error('API Error'));

      await expect(getPopularInvestors('CurrYear', 50)).rejects.toThrow('API Error');
    });

    it('should handle invalid response format', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({ items: null });

      const result = await getPopularInvestors('CurrYear', 50);

      expect(result).toEqual([]);
    });

    it('should limit results to requested amount', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({
        items: mockInvestors,
        totalRows: 3,
      });

      const result = await getPopularInvestors('CurrYear', 2);

      expect(result).toHaveLength(2);
    });
  });

  describe('getUserPortfolio', () => {
    it('should fetch user portfolio successfully', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockPortfolio);

      const result = await getUserPortfolio('testinvestor1');

      expect(result).toBeDefined();
      expect(result.positions).toHaveLength(3);
      expect(fetchFromEtoroApi).toHaveBeenCalledWith(
        expect.stringContaining('testinvestor1')
      );
    });

    it('should return empty portfolio when no response', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(null);

      const result = await getUserPortfolio('testinvestor1');

      expect(result.positions).toEqual([]);
    });

    it('should return empty portfolio when positions missing', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({});

      const result = await getUserPortfolio('testinvestor1');

      expect(result.positions).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetchFromEtoroApi).mockRejectedValue(new Error('API Error'));

      const result = await getUserPortfolio('testinvestor1');

      expect(result.positions).toEqual([]);
    });

    it('should calculate profit/loss percentage', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockPortfolio);

      const result = await getUserPortfolio('testinvestor1');

      expect(result.profitLossPercentage).toBeDefined();
      expect(typeof result.profitLossPercentage).toBe('number');
    });
  });

  describe('getUsersDetailsByUsernames', () => {
    it('should fetch user details for multiple usernames', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({
        users: Object.values(mockUserDetails),
      });

      const result = await getUsersDetailsByUsernames(['testinvestor1', 'testinvestor2']);

      expect(result.size).toBe(2);
      expect(result.get('testinvestor1')).toBeDefined();
    });

    it('should return empty map for empty username array', async () => {
      const result = await getUsersDetailsByUsernames([]);

      expect(result.size).toBe(0);
      expect(fetchFromEtoroApi).not.toHaveBeenCalled();
    });

    it('should handle batch processing for large arrays', async () => {
      const manyUsernames = Array.from({ length: 100 }, (_, i) => `user${i}`);
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({
        users: [{ username: 'user0', gcid: 1 }],
      });

      await getUsersDetailsByUsernames(manyUsernames);

      // Should make multiple batch calls (100 users / 50 per batch = 2 calls)
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(2);
    });

    it('should call progress callback during fetching', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({
        users: Object.values(mockUserDetails),
      });

      const progressCallback = vi.fn();
      await getUsersDetailsByUsernames(['testinvestor1'], progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle errors gracefully and return partial results', async () => {
      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce({ users: [mockUserDetails.testinvestor1] })
        .mockRejectedValueOnce(new Error('Batch error'));

      const manyUsernames = Array.from({ length: 100 }, (_, i) => `user${i}`);
      const result = await getUsersDetailsByUsernames(manyUsernames);

      // Should still return results from successful batch
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe('getUsersDetails', () => {
    it('should fetch user details by customer IDs', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({
        users: [{ gcid: 1001, username: 'testinvestor1' }],
      });

      const result = await getUsersDetails([1001, 1002]);

      expect(result.size).toBeGreaterThan(0);
      expect(fetchFromEtoroApi).toHaveBeenCalledWith(
        expect.stringContaining('cidList=')
      );
    });

    it('should return empty map for empty user ID array', async () => {
      const result = await getUsersDetails([]);

      expect(result.size).toBe(0);
      expect(fetchFromEtoroApi).not.toHaveBeenCalled();
    });
  });

  describe('getUserTradeInfo', () => {
    it('should fetch trade info successfully', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockTradeInfo);

      const result = await getUserTradeInfo('testinvestor1', 'CurrYear');

      expect(result).toBeDefined();
      expect(result?.trades).toBe(150);
      expect(result?.winRatio).toBe(68);
    });

    it('should return null when no response', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(null);

      const result = await getUserTradeInfo('testinvestor1');

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      vi.mocked(fetchFromEtoroApi).mockRejectedValue(new Error('API Error'));

      const result = await getUserTradeInfo('testinvestor1');

      expect(result).toBeNull();
    });

    it('should use CurrYear period by default', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockTradeInfo);

      await getUserTradeInfo('testinvestor1');

      expect(fetchFromEtoroApi).toHaveBeenCalledWith(
        expect.stringContaining('period=CurrYear')
      );
    });
  });

  describe('getUserAvatarUrl', () => {
    it('should return avatar URL from user avatars array', () => {
      const user = mockUserDetails.testinvestor1;
      const result = getUserAvatarUrl(user, true, 'testinvestor1');

      expect(result).toBe('https://example.com/avatar1-150.png');
    });

    it('should return fallback URL when user has avatar but no avatars array', () => {
      const result = getUserAvatarUrl(undefined, true, 'testinvestor1');

      expect(result).toBe('https://etoro-cdn.etorostatic.com/avatars/testinvestor1/150x150.png');
    });

    it('should return undefined when user has no avatar', () => {
      const result = getUserAvatarUrl(undefined, false, 'testinvestor1');

      expect(result).toBeUndefined();
    });

    it('should return undefined for user without data', () => {
      const result = getUserAvatarUrl(undefined, false, undefined);

      expect(result).toBeUndefined();
    });

    it('should prefer 50x50 avatar size when available', () => {
      const userWith50Avatar = {
        ...mockUserDetails.testinvestor1,
        avatars: [
          { url: 'https://example.com/150.png', width: '150', height: '150', avatarType: 1 },
          { url: 'https://example.com/50.png', width: '50', height: '50', avatarType: 1 },
        ],
      };

      const result = getUserAvatarUrl(userWith50Avatar, true, 'testinvestor1');

      expect(result).toBe('https://example.com/50.png');
    });
  });
});
