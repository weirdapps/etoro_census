import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import {
  withBodyValidation,
  withQueryValidation,
  validateEnvVars,
} from '../middleware/validate-request';

// Mock NextRequest
function createMockRequest(
  body: unknown,
  url = 'http://localhost/api/test'
): NextRequest {
  const request = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return request as unknown as NextRequest;
}

function createMockGetRequest(url: string): NextRequest {
  const request = new Request(url, {
    method: 'GET',
  });
  return request as unknown as NextRequest;
}

describe('middleware/validate-request', () => {
  describe('withBodyValidation', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    });

    it('should pass valid data to handler', async () => {
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const wrappedHandler = withBodyValidation(testSchema, handler);
      const req = createMockRequest({ name: 'John', age: 25 });

      await wrappedHandler(req);

      expect(handler).toHaveBeenCalledWith(req, { name: 'John', age: 25 });
    });

    it('should return 400 for invalid data', async () => {
      const handler = vi.fn();
      const wrappedHandler = withBodyValidation(testSchema, handler);
      const req = createMockRequest({ name: '', age: -5 });

      const response = await wrappedHandler(req);

      expect(response.status).toBe(400);
      expect(handler).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
    });

    it('should return 400 for invalid JSON', async () => {
      const handler = vi.fn();
      const wrappedHandler = withBodyValidation(testSchema, handler);

      // Create a request with invalid JSON
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await wrappedHandler(request as unknown as NextRequest);

      expect(response.status).toBe(400);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('withQueryValidation', () => {
    const querySchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it('should pass valid query params to handler', async () => {
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const wrappedHandler = withQueryValidation(querySchema, handler);
      const req = createMockGetRequest('http://localhost/api/test?page=1&limit=10');

      await wrappedHandler(req);

      expect(handler).toHaveBeenCalledWith(req, { page: '1', limit: '10' });
    });

    it('should return 400 for invalid query params', async () => {
      const strictSchema = z.object({
        page: z.string().regex(/^\d+$/),
      });

      const handler = vi.fn();
      const wrappedHandler = withQueryValidation(strictSchema, handler);
      const req = createMockGetRequest('http://localhost/api/test?page=abc');

      const response = await wrappedHandler(req);

      expect(response.status).toBe(400);
      expect(handler).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid query parameters');
    });
  });

  describe('validateEnvVars', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return null if all env vars are present', () => {
      process.env.TEST_VAR_1 = 'value1';
      process.env.TEST_VAR_2 = 'value2';

      const result = validateEnvVars(['TEST_VAR_1', 'TEST_VAR_2']);

      expect(result).toBeNull();
    });

    it('should return error response if env vars are missing', async () => {
      delete process.env.MISSING_VAR;

      const result = validateEnvVars(['MISSING_VAR']);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);

      const body = await result?.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server configuration error');
    });

    it('should handle empty required vars array', () => {
      const result = validateEnvVars([]);

      expect(result).toBeNull();
    });
  });
});
