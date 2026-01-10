import { ProgressCallback } from './data-collection-service';

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
        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Generic batch fetcher with circuit breaker, adaptive delays, and error handling.
 * Designed to handle large-scale API fetching with rate limiting protection.
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
  } = config;

  const results: BatchFetchResult<TItem, TResult>[] = [];
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let retryCount = 0;
  let consecutiveErrors = 0;
  let lastProgressUpdate = Date.now();

  const updateProgress = (progress: number, message: string) => {
    if (onProgress) {
      onProgress(progress, message);
    }
  };

  for (const item of items) {
    // Circuit breaker: if too many consecutive errors, increase delays
    if (consecutiveErrors >= maxConsecutiveErrors) {
      console.warn(`${name} circuit breaker activated: ${consecutiveErrors} consecutive errors. Increasing delays.`);
      await sleep(2000);
      consecutiveErrors = 0; // Reset after pause
    }

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

      results.push({ item, result, retryCount: itemRetries });
      successCount++;
      retryCount += itemRetries;
      consecutiveErrors = 0; // Reset consecutive error count on success

    } catch (error) {
      consecutiveErrors++;
      const errorMessage = error instanceof Error ? error.message : `Failed to fetch ${name}`;
      console.error(`Error in ${name} fetch after ${maxRetries} retries (consecutive errors: ${consecutiveErrors}):`, errorMessage);

      results.push({
        item,
        result: null,
        error: errorMessage,
        retryCount: maxRetries,
      });
      errorCount++;
      retryCount += maxRetries;

      // If it's a timeout or rate limit error, increase delays
      if (errorMessage.includes('timeout') || errorMessage.includes('rate') || errorMessage.includes('429')) {
        console.warn(`Detected timeout/rate limit in ${name}. Increasing delays...`);
        await sleep(1000);
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

    // Adaptive delay based on error rate and progress
    const errorRate = errorCount / processedCount;
    let delay = baseDelayMs;

    if (errorRate > 0.2) { // If error rate > 20%, significantly slow down
      delay = 1500;
    } else if (errorRate > 0.1) { // If error rate > 10%, slow down
      delay = 750;
    } else if (processedCount > 500) { // After 500 requests, be very conservative
      delay = 300;
    } else if (processedCount > 100) { // After 100 requests, be more conservative
      delay = 200;
    }

    // Add extra delay every 50 requests to avoid rate limiting
    if (processedCount % 50 === 0 && processedCount > 0) {
      const batchDelay = items.length > 1000 ? 2000 : 1500;
      console.log(`${name} batch checkpoint: ${processedCount} processed. Taking ${batchDelay}ms break...`);
      await sleep(batchDelay);
    } else {
      await sleep(delay);
    }

    // Emergency brake: if error rate is too high, pause and warn
    if (processedCount > 50 && errorRate > 0.3) {
      console.warn(`High ${name} error rate detected (${(errorRate * 100).toFixed(1)}%). Pausing for recovery...`);
      await sleep(5000);
      consecutiveErrors = 0; // Reset after pause
    }
  }

  const finalErrorRate = (errorCount / processedCount * 100).toFixed(1);
  console.log(`${name} collection complete: ${successCount} success, ${errorCount} errors, ${retryCount} retries out of ${processedCount} total (${finalErrorRate}% error rate)`);

  // Log warning if error rate is high
  if (errorCount / processedCount > 0.1) {
    console.warn(`High ${name} error rate detected (${finalErrorRate}%). Consider investigating API issues or rate limits.`);
  }

  return results;
}
