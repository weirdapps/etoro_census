import { NextRequest, NextResponse } from 'next/server';
import { getPopularInvestors } from '@/lib/services/user-service';
import { performCensusAnalysis } from '@/lib/services/census-service';
import { PeriodType } from '@/lib/models/user';

export async function POST(request: NextRequest) {
  try {
    console.log('Census API called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { limit = 25, period = 'CurrMonth' } = body;
    
    console.log(`Fetching ${limit} investors for period ${period}`);
    
    const investors = await getPopularInvestors(period as PeriodType, limit);
    console.log(`Found ${investors.length} investors`);
    
    if (investors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No investors found' },
        { status: 404 }
      );
    }

    console.log('Starting census analysis...');
    const analysis = await performCensusAnalysis(investors);
    console.log('Census analysis completed');

    return NextResponse.json({
      success: true,
      analysis,
      investorCount: investors.length
    });
  } catch (error) {
    console.error('Error performing census analysis:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to perform census analysis' },
      { status: 500 }
    );
  }
}