/**
 * Structured logging utility for consistent log formatting.
 * Outputs JSON logs in production, human-readable in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to 'info' in production, 'debug' in development
const MIN_LOG_LEVEL: LogLevel =
  process.env.LOG_LEVEL as LogLevel || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const isProduction = process.env.NODE_ENV === 'production';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatLog(entry: LogEntry): string {
  if (isProduction) {
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const { timestamp, level, message, ...meta } = entry;
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  const color = levelColors[level];

  const metaStr = Object.keys(meta).length > 0
    ? ` ${JSON.stringify(meta)}`
    : '';

  return `${color}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}${metaStr}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * Structured logger instance.
 * Use this for all logging in the application.
 */
export const logger = {
  /**
   * Log debug level message (only in development)
   */
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),

  /**
   * Log info level message
   */
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),

  /**
   * Log warning level message
   */
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),

  /**
   * Log error level message
   */
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),

  /**
   * Create a child logger with additional context
   */
  child: (context: Record<string, unknown>) => ({
    debug: (message: string, meta?: Record<string, unknown>) =>
      log('debug', message, { ...context, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) =>
      log('info', message, { ...context, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      log('warn', message, { ...context, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) =>
      log('error', message, { ...context, ...meta }),
  }),

  /**
   * Log with timing information
   */
  timed: async <T>(
    level: LogLevel,
    message: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> => {
    const startTime = Date.now();
    try {
      const result = await fn();
      log(level, message, { ...meta, durationMs: Date.now() - startTime });
      return result;
    } catch (error) {
      log('error', `${message} - FAILED`, {
        ...meta,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};

export default logger;
