import { describe, it, expect } from 'vitest';
import {
  FEAR_GREED,
  FEAR_GREED_LABELS,
  PAGINATION,
  API,
  DATA_COLLECTION,
  INVESTOR_BANDS,
  CHARTS,
  CACHE_TTL,
  DATE_FORMATS,
} from '../constants';

describe('constants', () => {
  describe('FEAR_GREED', () => {
    it('should have correct threshold values', () => {
      expect(FEAR_GREED.EXTREME_FEAR).toBe(20);
      expect(FEAR_GREED.FEAR).toBe(15);
      expect(FEAR_GREED.NEUTRAL).toBe(12);
      expect(FEAR_GREED.GREED).toBe(8);
      expect(FEAR_GREED.EXTREME_GREED).toBe(7);
    });

    it('should have thresholds in descending order', () => {
      expect(FEAR_GREED.EXTREME_FEAR).toBeGreaterThan(FEAR_GREED.FEAR);
      expect(FEAR_GREED.FEAR).toBeGreaterThan(FEAR_GREED.NEUTRAL);
      expect(FEAR_GREED.NEUTRAL).toBeGreaterThan(FEAR_GREED.GREED);
      expect(FEAR_GREED.GREED).toBeGreaterThan(FEAR_GREED.EXTREME_GREED);
    });
  });

  describe('FEAR_GREED_LABELS', () => {
    it('should have labels for all states', () => {
      expect(FEAR_GREED_LABELS.EXTREME_FEAR).toBe('Extreme Fear');
      expect(FEAR_GREED_LABELS.FEAR).toBe('Fear');
      expect(FEAR_GREED_LABELS.NEUTRAL).toBe('Neutral');
      expect(FEAR_GREED_LABELS.GREED).toBe('Greed');
      expect(FEAR_GREED_LABELS.EXTREME_GREED).toBe('Extreme Greed');
    });
  });

  describe('PAGINATION', () => {
    it('should have valid pagination settings', () => {
      expect(PAGINATION.ITEMS_PER_PAGE).toBeGreaterThan(0);
      expect(PAGINATION.MAX_INVESTORS).toBeGreaterThan(0);
      expect(PAGINATION.MAX_INVESTORS_LIMIT).toBeGreaterThanOrEqual(PAGINATION.MAX_INVESTORS);
      expect(PAGINATION.HOLDINGS_PER_PAGE).toBeGreaterThan(0);
      expect(PAGINATION.PERFORMERS_PER_PAGE).toBeGreaterThan(0);
    });
  });

  describe('API', () => {
    it('should have valid API settings', () => {
      expect(API.TIMEOUT_MS).toBeGreaterThan(0);
      expect(API.RATE_LIMIT_MS).toBeGreaterThan(0);
      expect(API.BATCH_SIZE).toBeGreaterThan(0);
      expect(API.CIRCUIT_BREAKER_THRESHOLD).toBeGreaterThan(0);
      expect(API.CIRCUIT_BREAKER_TIMEOUT).toBeGreaterThan(0);
      expect(API.MAX_RETRIES).toBeGreaterThanOrEqual(0);
      expect(API.RETRY_BASE_DELAY).toBeGreaterThan(0);
    });
  });

  describe('DATA_COLLECTION', () => {
    it('should have valid data collection settings', () => {
      expect(DATA_COLLECTION.BASE_DELAY_MS).toBeGreaterThanOrEqual(0);
      expect(DATA_COLLECTION.PROGRESS_UPDATE_INTERVAL).toBeGreaterThan(0);
      expect(DATA_COLLECTION.FETCH_TIMEOUT_MS).toBeGreaterThan(0);
      expect(DATA_COLLECTION.MAX_CONSECUTIVE_ERRORS).toBeGreaterThan(0);
    });
  });

  describe('INVESTOR_BANDS', () => {
    it('should have valid band definitions', () => {
      expect(INVESTOR_BANDS.ELITE.label).toBe('Elite');
      expect(INVESTOR_BANDS.ELITE.min).toBe(1);
      expect(INVESTOR_BANDS.ELITE.max).toBe(50);

      expect(INVESTOR_BANDS.TOP.label).toBe('Top');
      expect(INVESTOR_BANDS.TOP.min).toBe(51);
      expect(INVESTOR_BANDS.TOP.max).toBe(200);

      expect(INVESTOR_BANDS.RISING.label).toBe('Rising Stars');
      expect(INVESTOR_BANDS.ALL.label).toBe('All');
    });

    it('should have non-overlapping bands', () => {
      expect(INVESTOR_BANDS.ELITE.max).toBeLessThan(INVESTOR_BANDS.TOP.min);
      expect(INVESTOR_BANDS.TOP.max).toBeLessThan(INVESTOR_BANDS.RISING.min);
      expect(INVESTOR_BANDS.RISING.max).toBeLessThan(INVESTOR_BANDS.ESTABLISHED.min);
    });
  });

  describe('CHARTS', () => {
    it('should have valid chart settings', () => {
      expect(CHARTS.MAX_PIE_ITEMS).toBeGreaterThan(0);
      expect(Array.isArray(CHARTS.COLORS)).toBe(true);
      expect(CHARTS.COLORS.length).toBeGreaterThan(0);
    });

    it('should have valid color values', () => {
      CHARTS.COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('CACHE_TTL', () => {
    it('should have valid cache TTL values', () => {
      expect(CACHE_TTL.CENSUS_DATA).toBeGreaterThan(0);
      expect(CACHE_TTL.INSTRUMENT_DETAILS).toBeGreaterThan(0);
      expect(CACHE_TTL.USER_DETAILS).toBeGreaterThan(0);
      expect(CACHE_TTL.STATIC_REPORT).toBeGreaterThan(0);
    });

    it('should have instrument details cached longer than census data', () => {
      expect(CACHE_TTL.INSTRUMENT_DETAILS).toBeGreaterThan(CACHE_TTL.CENSUS_DATA);
    });
  });

  describe('DATE_FORMATS', () => {
    it('should have required date format strings', () => {
      expect(DATE_FORMATS.ISO).toBeDefined();
      expect(DATE_FORMATS.DISPLAY).toBeDefined();
      expect(DATE_FORMATS.DATETIME).toBeDefined();
      expect(DATE_FORMATS.UTC).toBeDefined();
    });
  });
});
