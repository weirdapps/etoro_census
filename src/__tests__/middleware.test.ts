import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, config } from '../middleware';

const API_KEY = 'ci-key-value';
const PASSWORD = 'browser-password';

function request(headers: Record<string, string> = {}, path = '/personal'): NextRequest {
  return new NextRequest(`https://census.example.com${path}`, { headers });
}

function basic(password: string, user = 'plessas'): Record<string, string> {
  return { authorization: `Basic ${btoa(`${user}:${password}`)}` };
}

async function expectedToken(password: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`personal_access:${password}`)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function inProduction() {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('API_SECRET_KEY', API_KEY);
  vi.stubEnv('PERSONAL_PASSWORD', PASSWORD);
}

describe('middleware (personal access gate)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('guards /personal and /api/personal, and nothing else', () => {
    expect(config.matcher).toEqual(['/personal/:path*', '/api/personal']);
    // The census workflow's own endpoint must stay outside the gate.
    expect(config.matcher).not.toContain('/api/optimized-report');
  });

  it('passes through outside production so local work is unaffected', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('API_SECRET_KEY', '');
    vi.stubEnv('PERSONAL_PASSWORD', '');

    expect((await middleware(request())).status).toBe(200);
  });

  it('refuses with 503 in production when the secrets are not both set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('API_SECRET_KEY', API_KEY);
    vi.stubEnv('PERSONAL_PASSWORD', '');

    expect((await middleware(request())).status).toBe(503);
  });

  it('challenges an anonymous visitor with Basic auth', async () => {
    inProduction();

    const response = await middleware(request());

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('Basic realm=');
  });

  it('rejects a wrong password', async () => {
    inProduction();

    expect((await middleware(request(basic('not-the-password')))).status).toBe(401);
  });

  it('rejects a malformed Basic header without throwing', async () => {
    inProduction();

    const response = await middleware(request({ authorization: 'Basic !!!not-base64!!!' }));

    expect(response.status).toBe(401);
  });

  it('accepts the correct password and sets the unlock cookie', async () => {
    inProduction();

    const response = await middleware(request(basic(PASSWORD)));

    expect(response.status).toBe(200);
    const cookie = response.cookies.get('personal_access');
    expect(cookie?.value).toBe(await expectedToken(PASSWORD));
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    // The digest is stored, never the password itself.
    expect(cookie?.value).not.toContain(PASSWORD);
  });

  it('accepts a browser that already holds the unlock cookie', async () => {
    inProduction();
    const token = await expectedToken(PASSWORD);

    const response = await middleware(request({ cookie: `personal_access=${token}` }));

    expect(response.status).toBe(200);
  });

  it('rejects a forged cookie', async () => {
    inProduction();

    const response = await middleware(request({ cookie: 'personal_access=forged' }));

    expect(response.status).toBe(401);
  });

  // This is the path the page's own fetch('/api/personal') takes once unlocked.
  it('guards /api/personal on the same terms as the page', async () => {
    inProduction();
    const token = await expectedToken(PASSWORD);

    expect((await middleware(request({}, '/api/personal'))).status).toBe(401);
    expect(
      (await middleware(request({ cookie: `personal_access=${token}` }, '/api/personal'))).status
    ).toBe(200);
  });

  it('accepts the API key so programmatic callers are unaffected', async () => {
    inProduction();

    expect((await middleware(request({ 'x-api-key': API_KEY }))).status).toBe(200);
    expect(
      (await middleware(request({ authorization: `Bearer ${API_KEY}` }))).status
    ).toBe(200);
    expect((await middleware(request({ 'x-api-key': 'wrong' }))).status).toBe(401);
  });
});
