import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse,
  unauthorizedResponse,
  rateLimitResponse,
  withTiming,
} from '../api/response';

describe('api/response', () => {
  describe('successResponse', () => {
    it('should create a success response with data', async () => {
      const data = { id: 1, name: 'Test' };
      const response = successResponse(data);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.meta.timestamp).toBeDefined();
    });

    it('should allow custom status code', async () => {
      const response = successResponse({ created: true }, undefined, 201);

      expect(response.status).toBe(201);
    });

    it('should include custom metadata', async () => {
      const response = successResponse(
        { items: [] },
        { count: 0, page: 1 }
      );

      const body = await response.json();
      expect(body.meta.count).toBe(0);
      expect(body.meta.page).toBe(1);
    });
  });

  describe('errorResponse', () => {
    it('should create an error response', async () => {
      const response = errorResponse('Something went wrong');

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Something went wrong');
    });

    it('should allow custom status code', async () => {
      const response = errorResponse('Bad request', 400);

      expect(response.status).toBe(400);
    });

    it('should include metadata', async () => {
      const response = errorResponse('Error', 500, { requestId: '123' });

      const body = await response.json();
      expect(body.meta.requestId).toBe('123');
    });
  });

  describe('notFoundResponse', () => {
    it('should create a 404 response', async () => {
      const response = notFoundResponse('User');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('User not found');
    });

    it('should use default message if no resource specified', async () => {
      const response = notFoundResponse();

      const body = await response.json();
      expect(body.error).toBe('Resource not found');
    });
  });

  describe('badRequestResponse', () => {
    it('should create a 400 response', async () => {
      const response = badRequestResponse('Invalid input');

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid input');
    });
  });

  describe('unauthorizedResponse', () => {
    it('should create a 401 response', async () => {
      const response = unauthorizedResponse();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('should allow custom message', async () => {
      const response = unauthorizedResponse('Invalid token');

      const body = await response.json();
      expect(body.error).toBe('Invalid token');
    });
  });

  describe('rateLimitResponse', () => {
    it('should create a 429 response', async () => {
      const response = rateLimitResponse();

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Rate limit exceeded');
    });

    it('should include retry-after header when specified', () => {
      const response = rateLimitResponse(60);

      expect(response.headers.get('Retry-After')).toBe('60');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('withTiming', () => {
    it('should track duration of successful operations', async () => {
      const { result, duration } = await withTiming(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return 'success';
      });

      expect(result).toBe('success');
      // setTimeout is not exact, especially on CI runners - allow some tolerance
      expect(duration).toBeGreaterThanOrEqual(15);
    });

    it('should track duration of failed operations', async () => {
      await expect(
        withTiming(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          throw new Error('Test error');
        })
      ).rejects.toMatchObject({
        error: expect.any(Error),
        duration: expect.any(Number),
      });
    });
  });
});
