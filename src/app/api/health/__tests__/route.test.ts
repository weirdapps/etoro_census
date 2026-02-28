import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import { GET } from '../route';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: { api: boolean };
}

// Mock NextResponse.json
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: HealthResponse, options?: { status: number }) => ({
      json: async () => data,
      status: options?.status || 200,
      data,
      options,
    })),
  },
}));

describe('Health Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function getResponseData(): [HealthResponse, { status: number } | undefined] {
    const mockCall = vi.mocked(NextResponse.json).mock.calls[0];
    return [mockCall[0] as HealthResponse, mockCall[1] as { status: number } | undefined];
  }

  it('should return 200 when API keys are present', async () => {
    process.env.ETORO_API_KEY = 'test-api-key';
    process.env.ETORO_USER_KEY = 'test-user-key';

    await GET();

    expect(NextResponse.json).toHaveBeenCalled();
    const [data, options] = getResponseData();
    expect(options?.status).toBe(200);
    expect(data.checks.api).toBe(true);
  });

  it('should return 503 when API keys are missing', async () => {
    delete process.env.ETORO_API_KEY;
    delete process.env.ETORO_USER_KEY;

    await GET();

    const [data, options] = getResponseData();
    expect(options?.status).toBe(503);
    expect(data.checks.api).toBe(false);
  });

  it('should return 503 when only ETORO_API_KEY is missing', async () => {
    delete process.env.ETORO_API_KEY;
    process.env.ETORO_USER_KEY = 'test-user-key';

    await GET();

    const [data, options] = getResponseData();
    expect(options?.status).toBe(503);
    expect(data.checks.api).toBe(false);
  });

  it('should return 503 when only ETORO_USER_KEY is missing', async () => {
    process.env.ETORO_API_KEY = 'test-api-key';
    delete process.env.ETORO_USER_KEY;

    await GET();

    const [data, options] = getResponseData();
    expect(options?.status).toBe(503);
    expect(data.checks.api).toBe(false);
  });

  it('should include all expected fields in response', async () => {
    process.env.ETORO_API_KEY = 'test-api-key';
    process.env.ETORO_USER_KEY = 'test-user-key';

    await GET();

    const [data] = getResponseData();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('checks');
    expect(data.checks).toHaveProperty('api');
  });

  it('should have status "healthy" always', async () => {
    process.env.ETORO_API_KEY = 'test-api-key';
    process.env.ETORO_USER_KEY = 'test-user-key';

    await GET();

    const [data] = getResponseData();
    expect(data.status).toBe('healthy');
  });

  it('should have status "healthy" even when API keys are missing', async () => {
    delete process.env.ETORO_API_KEY;
    delete process.env.ETORO_USER_KEY;

    await GET();

    const [data] = getResponseData();
    expect(data.status).toBe('healthy');
  });

  it('should include valid ISO timestamp', async () => {
    process.env.ETORO_API_KEY = 'test-api-key';
    process.env.ETORO_USER_KEY = 'test-user-key';

    await GET();

    const [data] = getResponseData();
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  it('should include numeric uptime', async () => {
    process.env.ETORO_API_KEY = 'test-api-key';
    process.env.ETORO_USER_KEY = 'test-user-key';

    await GET();

    const [data] = getResponseData();
    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should use npm_package_version when available', async () => {
    process.env.ETORO_API_KEY = 'test-api-key';
    process.env.ETORO_USER_KEY = 'test-user-key';
    process.env.npm_package_version = '2.5.7';

    await GET();

    const [data] = getResponseData();
    expect(data.version).toBe('2.5.7');
  });
});
