import { NextRequest, NextResponse } from 'next/server';

export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.API_SECRET_KEY;

  // An unset key used to mean "skip auth", unconditionally. That is fail-open,
  // and it failed open in production: API_SECRET_KEY was never set on Vercel, so
  // every route calling this helper answered anonymously while reading as though
  // it were gated. Development still needs the escape hatch, so it is now keyed
  // on NODE_ENV rather than on the secret's absence.
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Server misconfigured: API_SECRET_KEY is not set' },
        { status: 503 },
      );
    }
    return null;
  }

  const providedKey = request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (providedKey !== apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing API key' },
      { status: 401 }
    );
  }

  return null; // Auth passed
}
