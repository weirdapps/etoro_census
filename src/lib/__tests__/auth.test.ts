import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateApiKey } from '../auth';

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const request = new Request('http://localhost/api/test', {
    method: 'POST',
    headers,
  });
  return request as unknown as NextRequest;
}

describe('lib/auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('validateApiKey', () => {
    it('refuses with 503 in production when API_SECRET_KEY is unset', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('API_SECRET_KEY', '');

      const response = validateApiKey(createMockRequest());

      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);
      await expect(response!.json()).resolves.toEqual({
        error: 'Server misconfigured: API_SECRET_KEY is not set',
      });
    });

    it('skips auth outside production when API_SECRET_KEY is unset', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('API_SECRET_KEY', '');

      expect(validateApiKey(createMockRequest())).toBeNull();
    });

    it('rejects a missing key with 401 when API_SECRET_KEY is set', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('API_SECRET_KEY', 'correct-horse');

      const response = validateApiKey(createMockRequest());

      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
    });

    it('rejects a wrong key with 401', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('API_SECRET_KEY', 'correct-horse');

      const response = validateApiKey(
        createMockRequest({ 'x-api-key': 'battery-staple' })
      );

      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
    });

    // The daily-census workflow authenticates this way: next start puts the
    // runner's own server in production, so the loopback call needs the header.
    it('accepts the correct key via x-api-key', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('API_SECRET_KEY', 'correct-horse');

      expect(
        validateApiKey(createMockRequest({ 'x-api-key': 'correct-horse' }))
      ).toBeNull();
    });

    it('accepts the correct key via an Authorization bearer header', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('API_SECRET_KEY', 'correct-horse');

      expect(
        validateApiKey(
          createMockRequest({ authorization: 'Bearer correct-horse' })
        )
      ).toBeNull();
    });
  });
});
