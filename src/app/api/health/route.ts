import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      api: checkApiKeys(),
    },
  };

  return NextResponse.json(health, {
    status: health.checks.api ? 200 : 503,
  });
}

function checkApiKeys(): boolean {
  return !!(process.env.ETORO_API_KEY && process.env.ETORO_USER_KEY);
}
