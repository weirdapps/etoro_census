import { NextResponse } from 'next/server';
import { simplifiedIntelligence } from '@/lib/services/simplified-intelligence-service';

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

    return NextResponse.json({
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