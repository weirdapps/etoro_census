import { NextResponse } from 'next/server';
import { simplifiedIntelligence } from '@/lib/services/simplified-intelligence-service';

// Disable all caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch all simplified intelligence modules in parallel
    const [
      portfolio,
      smartMoney,
      performance,
      holdings,
      risk,
      eliteGroupComparison
    ] = await Promise.all([
      simplifiedIntelligence.getPortfolioSummary(),
      simplifiedIntelligence.getSmartMoneyAnalysis(),
      simplifiedIntelligence.getPerformanceComparison(),
      simplifiedIntelligence.getTopHoldingsInsights(),
      simplifiedIntelligence.getRiskAssessment(),
      simplifiedIntelligence.getEliteGroupComparison()
    ]);

    const response = NextResponse.json({
      success: true,
      data: {
        portfolio,
        smartMoney,
        performance,
        holdings,
        risk,
        eliteGroupComparison
      },
      timestamp: new Date().toISOString()
    });

    // Add cache control headers to prevent any caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Failed to get simplified intelligence:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze portfolio'
      },
      { status: 500 }
    );
  }
}
