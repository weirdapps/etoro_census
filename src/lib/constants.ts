/**
 * Application-wide constants.
 * Centralizes magic numbers and configuration values.
 */

/**
 * Fear & Greed Index thresholds.
 * Uses 0-100 scale matching CNN Fear & Greed Index convention:
 * - 0 = Extreme Fear (investors holding high cash, taking less risk)
 * - 100 = Extreme Greed (investors fully invested, taking more risk)
 *
 * This is calculated from average cash percentage and risk scores:
 * - High cash + low risk = Fear (low index)
 * - Low cash + high risk = Greed (high index)
 */
export const FEAR_GREED = {
  /** Extreme Fear zone: 0-24 */
  EXTREME_FEAR_MAX: 24,
  /** Fear zone: 25-44 */
  FEAR_MAX: 44,
  /** Neutral zone: 45-55 */
  NEUTRAL_MIN: 45,
  NEUTRAL_MAX: 55,
  /** Greed zone: 56-75 */
  GREED_MAX: 75,
  /** Extreme Greed zone: 76-100 */
  EXTREME_GREED_MIN: 76,
} as const;

/**
 * Fear & Greed Index labels.
 * Returns appropriate label based on 0-100 scale index value.
 */
export const FEAR_GREED_LABELS = {
  EXTREME_FEAR: 'Extreme Fear',
  FEAR: 'Fear',
  NEUTRAL: 'Neutral',
  GREED: 'Greed',
  EXTREME_GREED: 'Extreme Greed',
} as const;

/**
 * Get Fear & Greed label from index value (0-100 scale).
 */
export function getFearGreedLabel(index: number): string {
  if (index <= FEAR_GREED.EXTREME_FEAR_MAX) return FEAR_GREED_LABELS.EXTREME_FEAR;
  if (index <= FEAR_GREED.FEAR_MAX) return FEAR_GREED_LABELS.FEAR;
  if (index <= FEAR_GREED.NEUTRAL_MAX) return FEAR_GREED_LABELS.NEUTRAL;
  if (index <= FEAR_GREED.GREED_MAX) return FEAR_GREED_LABELS.GREED;
  return FEAR_GREED_LABELS.EXTREME_GREED;
}

/**
 * Pagination settings.
 */
export const PAGINATION = {
  /** Default items per page */
  ITEMS_PER_PAGE: 20,
  /** Default maximum investors to fetch */
  MAX_INVESTORS: 1500,
  /** Maximum allowed investors (API limit) */
  MAX_INVESTORS_LIMIT: 2000,
  /** Items per page for top holdings table */
  HOLDINGS_PER_PAGE: 25,
  /** Items per page for top performers table */
  PERFORMERS_PER_PAGE: 20,
} as const;

/**
 * API configuration.
 */
export const API = {
  /** Request timeout in milliseconds */
  TIMEOUT_MS: 15000,
  /** Minimum interval between API requests (rate limiting) */
  RATE_LIMIT_MS: 1000,
  /** Batch size for bulk API requests */
  BATCH_SIZE: 50,
  /** Maximum consecutive errors before circuit breaker activates */
  CIRCUIT_BREAKER_THRESHOLD: 5,
  /** Circuit breaker timeout in milliseconds */
  CIRCUIT_BREAKER_TIMEOUT: 60000,
  /** Maximum retries for failed requests */
  MAX_RETRIES: 3,
  /** Base delay for exponential backoff (ms) */
  RETRY_BASE_DELAY: 1000,
} as const;

/**
 * Data collection configuration.
 */
export const DATA_COLLECTION = {
  /** Base delay between requests in batch fetcher (ms) */
  BASE_DELAY_MS: 75,
  /** Inter-batch delay for user details fetching (ms) */
  INTER_BATCH_DELAY_MS: 200,
  /** Short delay for retry loops (ms) */
  SHORT_DELAY_MS: 100,
  /** Progress update interval (ms) */
  PROGRESS_UPDATE_INTERVAL: 2000,
  /** Fetch timeout per request (ms) */
  FETCH_TIMEOUT_MS: 30000,
  /** Maximum consecutive errors before pausing */
  MAX_CONSECUTIVE_ERRORS: 10,
  /** Maximum page size for eToro API requests */
  MAX_PAGE_SIZE: 500,
} as const;

/**
 * Investor band definitions for census analysis.
 * Bands are based on number of copiers.
 */
export const INVESTOR_BANDS = {
  ELITE: {
    label: 'Elite',
    description: 'Top 50 investors by copiers',
    min: 1,
    max: 50,
  },
  TOP: {
    label: 'Top',
    description: 'Investors ranked 51-200 by copiers',
    min: 51,
    max: 200,
  },
  RISING: {
    label: 'Rising Stars',
    description: 'Investors ranked 201-500 by copiers',
    min: 201,
    max: 500,
  },
  ESTABLISHED: {
    label: 'Established',
    description: 'Investors ranked 501-1000 by copiers',
    min: 501,
    max: 1000,
  },
  ALL: {
    label: 'All',
    description: 'All investors in the census',
    min: 1,
    max: 1500,
  },
} as const;

/**
 * Chart and visualization constants.
 */
export const CHARTS = {
  /** Maximum items in pie/donut charts before grouping others */
  MAX_PIE_ITEMS: 10,
  /** Default colors for charts */
  COLORS: [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ],
} as const;

/**
 * Cache TTL values in seconds.
 */
export const CACHE_TTL = {
  /** Census data cache TTL (1 hour) */
  CENSUS_DATA: 3600,
  /** Instrument details cache TTL (24 hours) */
  INSTRUMENT_DETAILS: 86400,
  /** User details cache TTL (1 hour) */
  USER_DETAILS: 3600,
  /** Static report cache TTL (5 minutes) */
  STATIC_REPORT: 300,
} as const;

/**
 * Date/time formats.
 */
export const DATE_FORMATS = {
  /** ISO date format */
  ISO: 'YYYY-MM-DD',
  /** Display date format */
  DISPLAY: 'MMM D, YYYY',
  /** Full datetime format */
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  /** UTC datetime format */
  UTC: 'YYYY.MM.DD at HH:mm UTC',
} as const;
