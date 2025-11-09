import { NextResponse } from 'next/server';
import { simplifiedIntelligence } from '@/lib/services/simplified-intelligence-service';

// Disable all caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Check if API credentials are configured
    const apiKey = process.env.ETORO_API_KEY;
    const userKey = process.env.ETORO_USER_KEY;

    if (!apiKey || !userKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'API_CREDENTIALS_MISSING',
          message: 'Personal portfolio analysis requires eToro API credentials. Please configure ETORO_API_KEY and ETORO_USER_KEY environment variables in your deployment settings.',
          instructions: {
            vercel: 'Go to Project Settings → Environment Variables and add ETORO_API_KEY and ETORO_USER_KEY',
            local: 'Create a .env.local file with ETORO_API_KEY and ETORO_USER_KEY values'
          }
        },
        { status: 503 } // Service Unavailable
      );
    }

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
