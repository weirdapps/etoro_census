import { describe, it, expect } from 'vitest';
import {
  instrumentDetailsSchema,
  instrumentPriceDataSchema,
  closingPriceResponseSchema,
  validateInstrumentDetails,
  validateInstrumentPriceData,
} from '../instrument';

describe('Instrument Schemas', () => {
  describe('instrumentDetailsSchema', () => {
    it('should validate complete instrument details', () => {
      const instrument = {
        instrumentId: 1001,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        imageUrl: 'https://example.com/aapl.png',
        instrumentType: 'Stocks',
      };

      const result = instrumentDetailsSchema.safeParse(instrument);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.symbol).toBe('AAPL');
      }
    });

    it('should validate with only instrumentId', () => {
      const instrument = {
        instrumentId: 1001,
      };

      const result = instrumentDetailsSchema.safeParse(instrument);
      expect(result.success).toBe(true);
    });

    it('should fail without instrumentId', () => {
      const instrument = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
      };

      const result = instrumentDetailsSchema.safeParse(instrument);
      expect(result.success).toBe(false);
    });

    it('should fail with non-numeric instrumentId', () => {
      const instrument = {
        instrumentId: 'AAPL',
      };

      const result = instrumentDetailsSchema.safeParse(instrument);
      expect(result.success).toBe(false);
    });
  });

  describe('instrumentPriceDataSchema', () => {
    it('should validate complete price data', () => {
      const priceData = {
        yesterdayReturn: 1.5,
        weekTdReturn: 3.2,
        monthTdReturn: -2.1,
        ytdReturn: 15.8,
      };

      const result = instrumentPriceDataSchema.safeParse(priceData);
      expect(result.success).toBe(true);
    });

    it('should validate empty object', () => {
      const result = instrumentPriceDataSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate partial price data', () => {
      const priceData = {
        yesterdayReturn: 1.5,
      };

      const result = instrumentPriceDataSchema.safeParse(priceData);
      expect(result.success).toBe(true);
    });

    it('should handle negative returns', () => {
      const priceData = {
        yesterdayReturn: -5.5,
        weekTdReturn: -10.2,
        monthTdReturn: -15.8,
        ytdReturn: -25.0,
      };

      const result = instrumentPriceDataSchema.safeParse(priceData);
      expect(result.success).toBe(true);
    });
  });

  describe('closingPriceResponseSchema', () => {
    it('should validate closing price response', () => {
      const response = {
        instrumentID: 1001,
        closingPrices: [
          { dateTime: '2025-01-01', price: 195.50 },
          { dateTime: '2025-01-02', price: 196.25 },
        ],
      };

      const result = closingPriceResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate without closingPrices', () => {
      const response = {
        instrumentID: 1001,
      };

      const result = closingPriceResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate with empty closingPrices array', () => {
      const response = {
        instrumentID: 1001,
        closingPrices: [],
      };

      const result = closingPriceResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('validateInstrumentDetails', () => {
    it('should return validated details for valid input', () => {
      const input = {
        instrumentId: 1001,
        symbol: 'AAPL',
        name: 'Apple Inc.',
      };

      const result = validateInstrumentDetails(input);
      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('AAPL');
    });

    it('should return null for invalid input', () => {
      const input = {
        symbol: 'AAPL', // missing instrumentId
      };

      const result = validateInstrumentDetails(input);
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = validateInstrumentDetails(null);
      expect(result).toBeNull();
    });
  });

  describe('validateInstrumentPriceData', () => {
    it('should return validated price data for valid input', () => {
      const input = {
        yesterdayReturn: 2.5,
        weekTdReturn: 5.0,
      };

      const result = validateInstrumentPriceData(input);
      expect(result).not.toBeNull();
      expect(result?.yesterdayReturn).toBe(2.5);
    });

    it('should return empty object data for empty input', () => {
      const result = validateInstrumentPriceData({});
      expect(result).not.toBeNull();
    });

    it('should return null for invalid types', () => {
      const input = {
        yesterdayReturn: 'invalid',
      };

      const result = validateInstrumentPriceData(input);
      expect(result).toBeNull();
    });
  });
});
