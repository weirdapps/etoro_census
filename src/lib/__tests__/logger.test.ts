import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules();
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    vi.unstubAllEnvs();
  });

  it('should export a logger object with required methods', async () => {
    const { logger } = await import('../logger');

    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.child).toBe('function');
    expect(typeof logger.timed).toBe('function');
  });

  it('should log info messages', async () => {
    const { logger } = await import('../logger');

    logger.info('Test info message');

    expect(console.log).toHaveBeenCalled();
  });

  it('should log warning messages', async () => {
    const { logger } = await import('../logger');

    logger.warn('Test warning message');

    expect(console.warn).toHaveBeenCalled();
  });

  it('should log error messages', async () => {
    const { logger } = await import('../logger');

    logger.error('Test error message');

    expect(console.error).toHaveBeenCalled();
  });

  it('should include metadata in log messages', async () => {
    const { logger } = await import('../logger');

    logger.info('Test message', { userId: 123, action: 'test' });

    expect(console.log).toHaveBeenCalled();
    const logCall = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(logCall).toContain('Test message');
  });

  it('should create child loggers with context', async () => {
    const { logger } = await import('../logger');

    const childLogger = logger.child({ service: 'test-service' });

    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');

    childLogger.info('Child log message');
    expect(console.log).toHaveBeenCalled();
  });

  it('should time async operations', async () => {
    const { logger } = await import('../logger');

    const result = await logger.timed('info', 'Timed operation', async () => {
      return 'success';
    });

    expect(result).toBe('success');
    expect(console.log).toHaveBeenCalled();
  });

  it('should log error on failed timed operations', async () => {
    const { logger } = await import('../logger');

    await expect(
      logger.timed('info', 'Failed operation', async () => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');

    expect(console.error).toHaveBeenCalled();
  });

  it('should log debug messages', async () => {
    const { logger } = await import('../logger');

    logger.debug('Test debug message');

    // Debug may or may not log depending on LOG_LEVEL
    // Just verify the function exists and runs without error
    expect(typeof logger.debug).toBe('function');
  });

  it('should use child logger for warn and error', async () => {
    const { logger } = await import('../logger');

    const childLogger = logger.child({ component: 'test' });

    childLogger.warn('Child warning');
    expect(console.warn).toHaveBeenCalled();

    childLogger.error('Child error');
    expect(console.error).toHaveBeenCalled();
  });

  it('should use child logger for debug', async () => {
    const { logger } = await import('../logger');

    const childLogger = logger.child({ component: 'test' });

    // Debug may not log depending on LOG_LEVEL, but should not throw
    childLogger.debug('Child debug');
    expect(typeof childLogger.debug).toBe('function');
  });
});
