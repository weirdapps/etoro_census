import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables for tests
process.env.ETORO_API_KEY = 'test-api-key';
process.env.ETORO_USER_KEY = 'test-user-key';

// Global fetch mock setup helper
export function createFetchMock(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((url: string) => {
    const matchedKey = Object.keys(responses).find(key => url.includes(key));
    if (matchedKey) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses[matchedKey]),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
}
