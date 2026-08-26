import { NextRequest, NextResponse } from 'next/server';

// /personal renders a real, named eToro account: balance, cash, YTD P&L and
// every open position in absolute currency. f1e9852 gated /api/personal, which
// was correct, but the page fetches that endpoint from the browser and so went
// down with it. Moving the fetch server-side would not have helped: the page
// itself is publicly routable, so it would have rendered the same balance sheet
// for anonymous visitors. The gate therefore has to sit in front of both.
//
// It is scoped to those two paths only. The census dashboard stays public.

const COOKIE_NAME = 'personal_access';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const REALM = 'etoro_census personal';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// The cookie holds a digest, not the password, so a leaked cookie does not
// hand over the credential itself.
async function cookieToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`personal_access:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export async function middleware(request: NextRequest) {
  // Local work is unaffected, matching how validateApiKey treats development.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const apiKey = process.env.API_SECRET_KEY;
  const password = process.env.PERSONAL_PASSWORD;
  if (!apiKey || !password) {
    return new NextResponse(
      'Server misconfigured: API_SECRET_KEY and PERSONAL_PASSWORD are not both set.',
      { status: 503 },
    );
  }

  // Presenting the key downstream lets the route's own validateApiKey stay
  // exactly as it is, so this middleware is the only thing that changed.
  const allow = () => {
    const headers = new Headers(request.headers);
    headers.set('x-api-key', apiKey);
    return NextResponse.next({ request: { headers } });
  };

  const authorization = request.headers.get('authorization');

  // 1. Programmatic callers present the API key, as they already do elsewhere.
  const presentedKey =
    request.headers.get('x-api-key') ??
    (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null);
  if (presentedKey && safeEqual(presentedKey, apiKey)) {
    return allow();
  }

  const token = await cookieToken(password);

  // 2. A browser that has already unlocked carries the cookie, which is what
  //    makes the page's own fetch('/api/personal') work without relying on the
  //    browser to re-attach Basic credentials to a subresource request.
  if (request.cookies.get(COOKIE_NAME)?.value === token) {
    return allow();
  }

  // 3. First visit: the native browser prompt, so there is no login page to build.
  if (authorization?.startsWith('Basic ')) {
    let decoded: string;
    try {
      decoded = atob(authorization.slice(6));
    } catch {
      return unauthorized();
    }
    const supplied = decoded.slice(decoded.indexOf(':') + 1);
    if (safeEqual(supplied, password)) {
      const response = allow();
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE_SECONDS,
      });
      return response;
    }
  }

  return unauthorized();
}

export const config = {
  matcher: ['/personal/:path*', '/api/personal'],
};
