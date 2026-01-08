import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // No redirects - let pages handle their own routing
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
