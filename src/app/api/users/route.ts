import { NextRequest, NextResponse } from 'next/server';
import { getPopularInvestors } from '@/lib/services/user-service';
import { PeriodType } from '@/lib/models/user';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'CurrMonth') as PeriodType;
    const limit = parseInt(searchParams.get('limit') || '50');

    const investors = await getPopularInvestors(period, limit);

    return NextResponse.json({
      success: true,
      investors,
      count: investors.length
    });
  } catch (error) {
    logger.error('Error fetching popular investors', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch popular investors' },
      { status: 500 }
    );
  }
}