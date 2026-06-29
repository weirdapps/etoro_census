import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ETORO_API_BASE_URL,
  API_ENDPOINTS,
  getDefaultHeaders,
  getApiRequestOptions,
  fetchFromEtoroApi,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from '../etoro-api-config';

describe('etoro-api-config', () => {
  describe('constants', () => {
    it('should have a valid base URL', () => {
      expect(ETORO_API_BASE_URL).toBeDefined();
      expect(ETORO_API_BASE_URL).toContain('etoro.com');
    });

    it('should have all required API endpoints', () => {
      expect(API_ENDPOINTS.PORTFOLIO).toBeDefined();
      expect(API_ENDPOINTS.INSTRUMENTS).toBeDefined();
      expect(API_ENDPOINTS.INSTRUMENT_SEARCH).toBeDefined();
      expect(API_ENDPOINTS.INSTRUMENT_CLOSING_PRICES).toBeDefined();
      expect(API_ENDPOINTS.ASSET_FEED).toBeDefined();
      expect(API_ENDPOINTS.USER_FEED).toBeDefined();
      expect(API_ENDPOINTS.USER_INFO).toBeDefined();
      expect(API_ENDPOINTS.USER_INFO_SEARCH).toBeDefined();
      expect(API_ENDPOINTS.USER_PORTFOLIO_LIVE).toBeDefined();
      expect(API_ENDPOINTS.USER_TRADE_INFO).toBeDefined();
      expect(API_ENDPOINTS.USER_DISCOVERY_INFO).toBeDefined();
    });

    it('should have endpoints containing the base URL', () => {
      expect(API_ENDPOINTS.PORTFOLIO).toContain(ETORO_API_BASE_URL);
      expect(API_ENDPOINTS.INSTRUMENTS).toContain(ETORO_API_BASE_URL);
    });
  });

  describe('getDefaultHeaders', () => {
    it('should return required headers', () => {
      const headers = getDefaultHeaders();

      expect(headers).toHaveProperty('X-USER-KEY');
      expect(headers).toHaveProperty('X-API-KEY');
      expect(headers).toHaveProperty('X-REQUEST-ID');
      expect(headers).toHaveProperty('Accept');
      expect(headers).toHaveProperty('Content-Type');
    });

    it('should generate a valid UUID for X-REQUEST-ID', () => {
      const headers = getDefaultHeaders();
      const requestId = headers['X-REQUEST-ID'];

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidRegex);
    });

    it('should set Accept and Content-Type to application/json', () => {
      const headers = getDefaultHeaders();

      expect(headers['Accept']).toBe('application/json');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should generate unique request IDs', () => {
      const headers1 = getDefaultHeaders();
      const headers2 = getDefaultHeaders();

      expect(headers1['X-REQUEST-ID']).not.toBe(headers2['X-REQUEST-ID']);
    });
  });

  describe('getApiRequestOptions', () => {
    it('should return default GET options', () => {
      const options = getApiRequestOptions();

      expect(options.method).toBe('GET');
      expect(options.headers).toBeDefined();
      expect(options.cache).toBe('no-store');
    });

    it('should accept custom method', () => {
      const options = getApiRequestOptions('POST');

      expect(options.method).toBe('POST');
    });

    it('should include headers from getDefaultHeaders', () => {
      const options = getApiRequestOptions();

      expect(options.headers).toHaveProperty('X-USER-KEY');
      expect(options.headers).toHaveProperty('X-API-KEY');
      expect(options.headers).toHaveProperty('X-REQUEST-ID');
    });
  });

  describe('circuit breaker', () => {
    beforeEach(() => {
      resetCircuitBreaker();
    });

    it('should start in closed state', () => {
      const state = getCircuitBreakerState();

      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
    });

    it('should reset correctly', () => {
      // Simulate some failures would change state, then reset
      resetCircuitBreaker();
      const state = getCircuitBreakerState();

      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
    });
  });

  describe('fetchFromEtoroApi', () => {
    const originalFetch = global.fetch;
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    beforeEach(() => {
      resetCircuitBreaker();
      console.log = vi.fn();
      console.warn = vi.fn();
      console.error = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      vi.restoreAllMocks();
    });

    it('should successfully fetch and parse JSON response', async () => {
      const mockData = { investors: [{ id: 1, name: 'Test' }] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchFromEtoroApi<typeof mockData>(
        'https://www.etoro.com/api/public/v1/test'
      );

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalled();
    }, 10000);

    it('should throw error on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(
        fetchFromEtoroApi('https://www.etoro.com/api/public/v1/test')
      ).rejects.toThrow('eToro API request failed: 500');
    }, 10000);

    it('should handle 429 rate limit response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too Many Requests'),
      });

      await expect(
        fetchFromEtoroApi('https://www.etoro.com/api/public/v1/test')
      ).rejects.toThrow('eToro API request failed: 429');

      // Logger.warn uses console.warn internally
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
    }, 10000);

    it('should merge custom options with default options', async () => {
      const mockData = { success: true };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      await fetchFromEtoroApi('https://www.etoro.com/api/public/v1/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1].headers).toHaveProperty('X-Custom-Header', 'custom-value');
      expect(fetchCall[1].headers).toHaveProperty('X-API-KEY');
    }, 10000); // Increased timeout due to rate limiting

    it('should track circuit breaker failures on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // First failure
      await expect(
        fetchFromEtoroApi('https://www.etoro.com/api/public/v1/test')
      ).rejects.toThrow();

      const state = getCircuitBreakerState();
      expect(state.failures).toBeGreaterThanOrEqual(1);
    }, 10000);

    it('should reset circuit breaker failures on success', async () => {
      const mockData = { success: true };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      await fetchFromEtoroApi('https://www.etoro.com/api/public/v1/test');

      const state = getCircuitBreakerState();
      expect(state.failures).toBe(0);
    }, 10000);

    it('should apply rate limiting between requests', async () => {
      const mockData = { success: true };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const start = Date.now();
      await fetchFromEtoroApi('https://www.etoro.com/api/public/v1/test');
      await fetchFromEtoroApi('https://www.etoro.com/api/public/v1/test');
      const elapsed = Date.now() - start;

      // Should take at least 1000ms due to rate limiting (MIN_REQUEST_INTERVAL)
      expect(elapsed).toBeGreaterThanOrEqual(900); // Allow some tolerance
    }, 15000);
  });
});
