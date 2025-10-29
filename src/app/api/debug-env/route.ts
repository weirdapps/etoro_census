import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    hasEtoroApiKey: !!process.env.ETORO_API_KEY,
    hasEtoroUserKey: !!process.env.ETORO_USER_KEY,
    hasPersonalApiKey: !!process.env.ETORO_PERSONAL_API_KEY,
    hasPersonalUserKey: !!process.env.ETORO_PERSONAL_USER_KEY,
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || 'not set',
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
}
