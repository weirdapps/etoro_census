import { ProgressCallback } from './data-collection-service';
import { logger } from '../logger';

export interface BatchFetcherConfig<TItem, TResult> {
  /** Name for logging purposes */
  name: string;
  /** Function to fetch data for a single item */
  fetchFn: (item: TItem) => Promise<TResult | null>;
  /** Timeout per request in milliseconds */
  timeoutMs?: number;
  /** Maximum consecutive errors before circuit breaker activates */
  maxConsecutiveErrors?: number;
  /** Interval between progress updates in milliseconds */
  progressUpdateInterval?: number;
  /** Base delay between requests in milliseconds */
  baseDelayMs?: number;
  /** Maximum retry attempts per request */
  maxRetries?: number;
  /** Base delay for exponential backoff in milliseconds */
  retryBaseDelayMs?: number;
  /** Number of concurrent requests (default: 1 for sequential processing) */
  concurrency?: number;
  /**
   * After the main pass, retry failed items with conservative settings
   * (concurrency=1, longer timeouts, more retries, longer backoff).
   * Skipped if 0 items failed or if more than 70% failed (genuine outage,
   * recovery won't help). Default: true.
   */
  enableRecovery?: boolean;
}

export interface BatchFetchResult<TItem, TResult> {
  item: TItem;
  result: TResult | null;
  error?: string;
  retryCount?: number;
}

const DEFAULT_CONFIG = {
  timeoutMs: 30000,
  maxConsecutiveErrors: 10,
  progressUpdateInterval: 2000,
  baseDelayMs: 75,
  maxRetries: 3,
  retryBaseDelayMs: 1000,
  concurrency: 3,
};

/**
 * Sleep utility for delays.
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with exponential backoff retry.
 * Retries failed requests with increasing delays.
 *
 * @param fn - Function to execute
 * @param maxRetries - Maximum retry attempts
 * @param baseDelay - Base delay in ms (doubles with each retry)
 * @returns Result of the function
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number
): Promise<{ result: T; retryCount: number }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retryCount: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        logger.debug('Retry attempt', {
          attempt: attempt + 1,
          maxRetries,
          delayMs: Math.round(delay),
        });
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Generic batch fetcher with circuit breaker, adaptive delays, and error handling.
 * Designed to handle large-scale API fetching with rate limiting protection.
 * Supports parallel processing with configurable concurrency.
 */
export async function batchFetch<TItem, TResult>(
  items: TItem[],
  config: BatchFetcherConfig<TItem, TResult>,
  onProgress?: ProgressCallback
): Promise<BatchFetchResult<TItem, TResult>[]> {
  const {
    name,
    fetchFn,
    timeoutMs = DEFAULT_CONFIG.timeoutMs,
    maxConsecutiveErrors = DEFAULT_CONFIG.maxConsecutiveErrors,
    progressUpdateInterval = DEFAULT_CONFIG.progressUpdateInterval,
    baseDelayMs = DEFAULT_CONFIG.baseDelayMs,
    maxRetries = DEFAULT_CONFIG.maxRetries,
    retryBaseDelayMs = DEFAULT_CONFIG.retryBaseDelayMs,
    concurrency = DEFAULT_CONFIG.concurrency,
    enableRecovery = true,
  } = config;

  const results: BatchFetchResult<TItem, TResult>[] = new Array(items.length);
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let retryCount = 0;
  let consecutiveErrors = 0;
  let lastProgressUpdate = Date.now();
  let currentDelay = baseDelayMs;

  const updateProgress = (progress: number, message: string) => {
    if (onProgress) {
      onProgress(progress, message);
    }
  };

  // Process a single item and return result with index
  const processItem = async (item: TItem, index: number): Promise<void> => {
    try {
      // Fetch with retry and timeout
      const fetchWithTimeout = async () => {
        return Promise.race([
          fetchFn(item),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${name} fetch timeout`)), timeoutMs)
          ),
        ]);
      };

      const { result, retryCount: itemRetries } = await fetchWithRetry(
        fetchWithTimeout,
        maxRetries,
        retryBaseDelayMs
      );

      results[index] = { item, result, retryCount: itemRetries };
      successCount++;
      retryCount += itemRetries;
      consecutiveErrors = 0;

    } catch (error) {
      consecutiveErrors++;
      const errorMessage = error instanceof Error ? error.message : `Failed to fetch ${name}`;

      results[index] = {
        item,
        result: null,
        error: errorMessage,
        retryCount: maxRetries,
      };
      errorCount++;
      retryCount += maxRetries;

      // If it's a rate limit error, signal to slow down
      if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        currentDelay = Math.min(currentDelay * 2, 2000);
      }
    }

    processedCount++;

    // Update progress with time-based throttling
    const now = Date.now();
    const shouldUpdate = (now - lastProgressUpdate >= progressUpdateInterval) ||
      (processedCount % 25 === 0) ||
      (processedCount === items.length);

    if (shouldUpdate) {
      const progress = Math.round((processedCount / items.length) * 100);
      const errorRate = (errorCount / processedCount * 100).toFixed(1);
      const message = `Processed ${processedCount}/${items.length} ${name} (${successCount} success, ${errorCount} errors, ${errorRate}% error rate)`;
      updateProgress(progress, message);
      lastProgressUpdate = now;
    }
  };

  // Process items in batches with concurrency limit
  for (let i = 0; i < items.length; i += concurrency) {
    // Circuit breaker: if too many consecutive errors, pause
    if (consecutiveErrors >= maxConsecutiveErrors) {
      logger.warn('Circuit breaker activated', {
        name,
        consecutiveErrors,
        action: 'pausing',
      });
      await sleep(2000);
      consecutiveErrors = 0;
    }

    // Get batch of items to process concurrently
    const batch = items.slice(i, Math.min(i + concurrency, items.length));
    const batchPromises = batch.map((item, batchIndex) =>
      processItem(item, i + batchIndex)
    );

    // Wait for all items in batch to complete
    await Promise.all(batchPromises);

    // Adaptive delay based on error rate
    const errorRate = processedCount > 0 ? errorCount / processedCount : 0;

    if (errorRate > 0.2) {
      currentDelay = 1500;
    } else if (errorRate > 0.1) {
      currentDelay = 750;
    } else if (processedCount > 500) {
      currentDelay = 300;
    } else if (processedCount > 100) {
      currentDelay = 200;
    } else {
      currentDelay = baseDelayMs;
    }

    // Add extra delay every 50 requests to avoid rate limiting
    if (processedCount % 50 === 0 && processedCount > 0 && processedCount < items.length) {
      const batchDelay = items.length > 1000 ? 2000 : 1500;
      logger.debug('Batch checkpoint', {
        name,
        processedCount,
        batchDelay,
      });
      await sleep(batchDelay);
    } else if (i + concurrency < items.length) {
      // Delay between batches
      await sleep(currentDelay);
    }

    // Emergency brake: if error rate is too high, pause and warn
    if (processedCount > 50 && errorRate > 0.3) {
      logger.warn('High error rate detected, pausing for recovery', {
        name,
        errorRate: (errorRate * 100).toFixed(1) + '%',
      });
      await sleep(5000);
      consecutiveErrors = 0;
    }
  }

  const mainErrorRate = processedCount > 0 ? errorCount / processedCount : 0;

  // Recovery pass: re-attempt failed items with conservative settings.
  // Skipped on full outage (>70% failed — recovery won't help) or no failures.
  if (enableRecovery && errorCount > 0 && mainErrorRate < 0.7) {
    const failedIndices: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].result === null) failedIndices.push(i);
    }

    logger.info('Starting recovery pass', { name, toRecover: failedIndices.length });
    updateProgress(99, `Recovery pass: retrying ${failedIndices.length} failed ${name}`);

    let recovered = 0;
    for (const idx of failedIndices) {
      const item = results[idx].item;
      try {
        const fetchWithLongerTimeout = () =>
          Promise.race([
            fetchFn(item),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`${name} fetch timeout (recovery)`)), 60000)
            ),
          ]);
        const { result, retryCount: recoveryRetries } = await fetchWithRetry(
          fetchWithLongerTimeout,
          5,
          2000
        );
        if (result !== null) {
          results[idx] = { item, result, retryCount: maxRetries + recoveryRetries };
          recovered++;
          successCount++;
          errorCount--;
        }
      } catch {
        // Stays failed; original error already recorded.
      }
      // Sequential pacing for recovery — 500ms between items.
      await sleep(500);
    }

    logger.info('Recovery pass complete', {
      name,
      attempted: failedIndices.length,
      recovered,
      stillFailed: failedIndices.length - recovered,
    });
  }

  const finalErrorRate = processedCount > 0 ? (errorCount / processedCount * 100).toFixed(1) : '0';
  logger.info('Collection complete', {
    name,
    successCount,
    errorCount,
    retryCount,
    processedCount,
    errorRate: finalErrorRate + '%',
  });

  if (processedCount > 0 && errorCount / processedCount > 0.1) {
    logger.warn('High error rate detected, consider investigating', {
      name,
      errorRate: finalErrorRate + '%',
    });
  }

  return results;
}
