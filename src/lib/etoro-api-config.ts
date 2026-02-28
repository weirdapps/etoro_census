import { logger } from './logger';
import { API } from './constants';
import { randomUUID } from 'crypto';

export const ETORO_API_BASE_URL = process.env.ETORO_API_BASE_URL || 'https://www.etoro.com/api/public';

// Use functions to get these values at runtime instead of build time
const getApiUserKey = () => process.env.ETORO_USER_KEY || '';
const getApiKey = () => process.env.ETORO_API_KEY || '';

export const API_ENDPOINTS = {
  PORTFOLIO: `${ETORO_API_BASE_URL}/v1/trading/info/portfolio`,
  INSTRUMENTS: `${ETORO_API_BASE_URL}/v1/market-data/instruments`,
  INSTRUMENT_SEARCH: `${ETORO_API_BASE_URL}/v1/market-data/search`,
  INSTRUMENT_CLOSING_PRICES: `${ETORO_API_BASE_URL}/v1/market-data/instruments/history/closing-price`,
  ASSET_FEED: `${ETORO_API_BASE_URL}/v1/feeds/instrument`,
  USER_FEED: `${ETORO_API_BASE_URL}/v1/feeds/user`,
  USER_INFO: `${ETORO_API_BASE_URL}/v1/user-info/people`,
  USER_INFO_SEARCH: `${ETORO_API_BASE_URL}/v1/user-info/people/search`,
  USER_PORTFOLIO_LIVE: `${ETORO_API_BASE_URL}/v1/user-info/people/{username}/portfolio/live`,
  USER_TRADE_INFO: `${ETORO_API_BASE_URL}/v1/user-info/people/{username}/tradeinfo`,
  USER_DISCOVERY_INFO: `${ETORO_API_BASE_URL}/sapi/portfolio/discover/user-discovery-info`,
};

// Generate a UUID v4 using cryptographically secure random
export function generateUUID(): string {
  return randomUUID();
}

export const getDefaultHeaders = () => {
  const headers: { [key: string]: string } = {
    'X-USER-KEY': getApiUserKey(),
    'X-API-KEY': getApiKey(),
    'X-REQUEST-ID': generateUUID(),
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  // Log warning if keys are missing (only in development)
  if (process.env.NODE_ENV !== 'production') {
    if (!headers['X-USER-KEY'] || !headers['X-API-KEY']) {
      logger.warn('eToro API keys are not configured');
    }
  }
  
  return headers;
};

export const getApiRequestOptions = (method = 'GET') => {
  return {
    method,
    headers: getDefaultHeaders(),
    cache: 'no-store' as RequestCache
  };
};

/**
 * Rate limiter that enforces minimum intervals between API requests.
 * Encapsulates state to avoid global mutability and improve testability.
 */
class RateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;

  constructor(minIntervalMs = 1000) {
    this.minInterval = minIntervalMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      logger.debug('Rate limiting', { waitTimeMs: waitTime });
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  penalize(extraDelayMs: number): void {
    this.lastRequestTime = Date.now() + extraDelayMs;
  }

  reset(): void {
    this.lastRequestTime = 0;
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Circuit breaker state for the eToro API.
 * Prevents cascading failures by temporarily stopping requests when errors exceed threshold.
 */
type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'closed';
  private successesInHalfOpen = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;

  constructor(
    failureThreshold = 5,
    resetTimeout = 60000, // 1 minute
    successThreshold = 2
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.successThreshold = successThreshold;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        logger.debug('Circuit breaker transitioning', { from: 'OPEN', to: 'HALF-OPEN' });
        this.state = 'half-open';
        this.successesInHalfOpen = 0;
      } else {
        const remainingTime = Math.ceil(
          (this.resetTimeout - (Date.now() - this.lastFailureTime)) / 1000
        );
        throw new Error(
          `Circuit breaker is open. Retry in ${remainingTime} seconds.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successesInHalfOpen++;
      if (this.successesInHalfOpen >= this.successThreshold) {
        logger.debug('Circuit breaker transitioning', { from: 'HALF-OPEN', to: 'CLOSED' });
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      logger.debug('Circuit breaker transitioning', { from: 'HALF-OPEN', to: 'OPEN', reason: 'failure' });
      this.state = 'open';
    } else if (this.failures >= this.failureThreshold) {
      logger.warn('Circuit breaker threshold reached', {
        failures: this.failures,
        threshold: this.failureThreshold,
        newState: 'OPEN',
      });
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successesInHalfOpen = 0;
  }
}

// Global circuit breaker instance for eToro API
const circuitBreaker = new CircuitBreaker();

export async function fetchFromEtoroApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Use circuit breaker to prevent cascading failures
  return circuitBreaker.call(async () => {
    // Enforce rate limiting
    await rateLimiter.waitIfNeeded();
    
    const requestOptions = {
      ...getApiRequestOptions(),
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...(options.headers || {})
      }
    };
    
    // Log request details for debugging
    logger.debug('API request', { endpoint });
    
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API.TIMEOUT_MS);
    requestOptions.signal = controller.signal;
    
    const startTime = Date.now();
    const response = await fetch(endpoint, requestOptions);
    const responseTime = Date.now() - startTime;
    
    clearTimeout(timeoutId);
    
    logger.debug('API response', { status: response.status, responseTimeMs: responseTime });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('API request failed', { status: response.status, errorText });

      // If we get 429, wait longer before next request
      if (response.status === 429) {
        logger.warn('Rate limited by API, forcing 5s delay');
        rateLimiter.penalize(5000);
      }

      throw new Error(`eToro API request failed: ${response.status}`);
    }

    const data = await response.json() as T;

    return data;
  });
}

/**
 * Get the current circuit breaker state.
 * Useful for monitoring and health checks.
 */
export function getCircuitBreakerState(): {
  state: CircuitState;
  failures: number;
} {
  return {
    state: circuitBreaker.getState(),
    failures: circuitBreaker.getFailureCount(),
  };
}

/**
 * Reset the circuit breaker state.
 * Use with caution - typically only needed for testing or manual recovery.
 */
export function resetCircuitBreaker(): void {
  circuitBreaker.reset();
}