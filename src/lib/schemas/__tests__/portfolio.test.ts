import { describe, it, expect } from 'vitest';
import {
  portfolioPositionSchema,
  userPortfolioSchema,
  validatePortfolio,
} from '../portfolio';

describe('Portfolio Schemas', () => {
  describe('portfolioPositionSchema', () => {
    it('should validate complete position', () => {
      const position = {
        instrumentId: 1001,
        instrumentName: 'Apple Inc.',
        instrumentType: 'Stocks',
        investmentPct: 15.5,
        netProfit: 250.00,
        openDate: '2025-01-01',
        currentRate: 196.50,
        openRate: 180.00,
      };

      const result = portfolioPositionSchema.safeParse(position);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instrumentId).toBe(1001);
        expect(result.data.investmentPct).toBe(15.5);
      }
    });

    it('should validate with only instrumentId', () => {
      const position = {
        instrumentId: 1001,
      };

      const result = portfolioPositionSchema.safeParse(position);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.investmentPct).toBe(0); // default
      }
    });

    it('should fail without instrumentId', () => {
      const position = {
        instrumentName: 'Apple Inc.',
        investmentPct: 15.5,
      };

      const result = portfolioPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });

    it('should handle zero investment percentage', () => {
      const position = {
        instrumentId: 1001,
        investmentPct: 0,
      };

      const result = portfolioPositionSchema.safeParse(position);
      expect(result.success).toBe(true);
    });

    it('should handle negative net profit', () => {
      const position = {
        instrumentId: 1001,
        netProfit: -500.00,
      };

      const result = portfolioPositionSchema.safeParse(position);
      expect(result.success).toBe(true);
    });
  });

  describe('userPortfolioSchema', () => {
    it('should validate complete portfolio', () => {
      const portfolio = {
        positions: [
          { instrumentId: 1001, investmentPct: 30 },
          { instrumentId: 1002, investmentPct: 25 },
        ],
        cashEquity: 10000,
        availableCash: 5000,
        totalValue: 50000,
        profitLoss: 5000,
        profitLossPercentage: 10,
      };

      const result = userPortfolioSchema.safeParse(portfolio);
      expect(result.success).toBe(true);
    });

    it('should default to empty positions array', () => {
      const portfolio = {};

      const result = userPortfolioSchema.safeParse(portfolio);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.positions).toEqual([]);
      }
    });

    it('should validate portfolio with empty positions', () => {
      const portfolio = {
        positions: [],
        cashEquity: 10000,
      };

      const result = userPortfolioSchema.safeParse(portfolio);
      expect(result.success).toBe(true);
    });

    it('should validate portfolio with only positions', () => {
      const portfolio = {
        positions: [
          { instrumentId: 1001, investmentPct: 50 },
        ],
      };

      const result = userPortfolioSchema.safeParse(portfolio);
      expect(result.success).toBe(true);
    });
  });

  describe('validatePortfolio', () => {
    it('should return validated portfolio for valid input', () => {
      const input = {
        positions: [
          { instrumentId: 1001, investmentPct: 30 },
        ],
        cashEquity: 10000,
      };

      const result = validatePortfolio(input);
      expect(result.positions).toHaveLength(1);
      expect(result.cashEquity).toBe(10000);
    });

    it('should return empty portfolio for invalid input', () => {
      const input = {
        positions: 'invalid', // should be array
      };

      const result = validatePortfolio(input);
      expect(result.positions).toEqual([]);
    });

    it('should return empty portfolio for null', () => {
      const result = validatePortfolio(null);
      expect(result.positions).toEqual([]);
    });

    it('should return empty portfolio for undefined', () => {
      const result = validatePortfolio(undefined);
      expect(result.positions).toEqual([]);
    });

    it('should validate portfolio with multiple positions', () => {
      const input = {
        positions: [
          { instrumentId: 1001, investmentPct: 25, instrumentName: 'Apple' },
          { instrumentId: 1002, investmentPct: 20, instrumentName: 'Google' },
          { instrumentId: 1003, investmentPct: 15, instrumentName: 'Microsoft' },
        ],
      };

      const result = validatePortfolio(input);
      expect(result.positions).toHaveLength(3);
    });
  });
});
