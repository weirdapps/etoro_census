import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirect root path to public portfolio analyzer
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/public', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
