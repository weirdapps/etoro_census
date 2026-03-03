import { NextRequest, NextResponse } from 'next/server';

export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.API_SECRET_KEY;

  // If no API key configured, skip auth (development mode)
  if (!apiKey) {
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
