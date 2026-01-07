import { describe, it, expect } from 'vitest';
import {
  popularInvestorSchema,
  popularInvestorsResponseSchema,
  userDetailSchema,
  userTradeInfoSchema,
  validatePopularInvestors,
} from '../investor';

describe('Investor Schemas', () => {
  describe('popularInvestorSchema', () => {
    it('should validate a complete investor object', () => {
      const investor = {
        customerId: 12345,
        userName: 'testuser',
        fullName: 'Test User',
        hasAvatar: true,
        copiers: 1000,
        gain: 25.5,
        riskScore: 5,
        trades: 150,
        winRatio: 68,
        countryId: 218,
      };

      const result = popularInvestorSchema.safeParse(investor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerId).toBe(12345);
        expect(result.data.userName).toBe('testuser');
      }
    });

    it('should validate with minimal required fields', () => {
      const investor = {
        customerId: 12345,
        userName: 'testuser',
      };

      const result = popularInvestorSchema.safeParse(investor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.copiers).toBe(0); // default
        expect(result.data.gain).toBe(0); // default
        expect(result.data.riskScore).toBe(5); // default
      }
    });

    it('should fail without customerId', () => {
      const investor = {
        userName: 'testuser',
      };

      const result = popularInvestorSchema.safeParse(investor);
      expect(result.success).toBe(false);
    });

    it('should fail without userName', () => {
      const investor = {
        customerId: 12345,
      };

      const result = popularInvestorSchema.safeParse(investor);
      expect(result.success).toBe(false);
    });

    it('should enforce riskScore range 1-10', () => {
      const lowRisk = popularInvestorSchema.safeParse({
        customerId: 1,
        userName: 'test',
        riskScore: 0,
      });
      expect(lowRisk.success).toBe(false);

      const highRisk = popularInvestorSchema.safeParse({
        customerId: 1,
        userName: 'test',
        riskScore: 11,
      });
      expect(highRisk.success).toBe(false);

      const validRisk = popularInvestorSchema.safeParse({
        customerId: 1,
        userName: 'test',
        riskScore: 5,
      });
      expect(validRisk.success).toBe(true);
    });
  });

  describe('popularInvestorsResponseSchema', () => {
    it('should validate a response with items', () => {
      const response = {
        items: [
          { customerId: 1, userName: 'user1' },
          { customerId: 2, userName: 'user2' },
        ],
        totalRows: 100,
      };

      const result = popularInvestorsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
        expect(result.data.totalRows).toBe(100);
      }
    });

    it('should validate response without totalRows', () => {
      const response = {
        items: [{ customerId: 1, userName: 'user1' }],
      };

      const result = popularInvestorsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate empty items array', () => {
      const response = {
        items: [],
      };

      const result = popularInvestorsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('userDetailSchema', () => {
    it('should validate complete user details', () => {
      const userDetail = {
        username: 'testuser',
        fullName: 'Test User',
        gcid: 12345,
        avatars: [
          { url: 'https://example.com/avatar.jpg', width: '100', height: '100', type: 'small' },
        ],
        country: 218,
      };

      const result = userDetailSchema.safeParse(userDetail);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal fields', () => {
      const userDetail = {
        username: 'testuser',
        gcid: 12345,
      };

      const result = userDetailSchema.safeParse(userDetail);
      expect(result.success).toBe(true);
    });

    it('should fail without username', () => {
      const userDetail = {
        gcid: 12345,
      };

      const result = userDetailSchema.safeParse(userDetail);
      expect(result.success).toBe(false);
    });
  });

  describe('userTradeInfoSchema', () => {
    it('should validate complete trade info', () => {
      const tradeInfo = {
        trades: 150,
        profitableTrades: 100,
        winRatio: 66.7,
        avgProfitPct: 5.5,
        avgLossPct: -2.3,
      };

      const result = userTradeInfoSchema.safeParse(tradeInfo);
      expect(result.success).toBe(true);
    });

    it('should provide defaults for missing fields', () => {
      const tradeInfo = {};

      const result = userTradeInfoSchema.safeParse(tradeInfo);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trades).toBe(0);
        expect(result.data.winRatio).toBe(0);
      }
    });
  });

  describe('validatePopularInvestors', () => {
    it('should return validated investors array', () => {
      const data = {
        items: [
          { customerId: 1, userName: 'user1', copiers: 100 },
          { customerId: 2, userName: 'user2', copiers: 200 },
        ],
      };

      const result = validatePopularInvestors(data);
      expect(result).toHaveLength(2);
      expect(result[0].userName).toBe('user1');
    });

    it('should return empty array for invalid data', () => {
      const data = { invalid: 'data' };

      const result = validatePopularInvestors(data);
      expect(result).toEqual([]);
    });

    it('should return empty array for null', () => {
      const result = validatePopularInvestors(null);
      expect(result).toEqual([]);
    });
  });
});
