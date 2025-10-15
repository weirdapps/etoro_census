import { NextResponse } from 'next/server';
import { publicPortfolioService } from '@/lib/services/public-portfolio-service';
import { censusDataService } from '@/lib/services/census-data-service';
import { portfolioComparison } from '@/lib/services/portfolio-comparison';

// Disable all caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username is required'
        },
        { status: 400 }
      );
    }

    console.log(`Fetching public portfolio insights for: ${username}`);

    // Validate username exists
    const isValid = await publicPortfolioService.validateUsername(username);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username not found or not a valid eToro investor'
        },
        { status: 404 }
      );
    }

    // Fetch portfolio and elite group data in parallel
    const [
      portfolio,
      broadMarket,
      topCopiers,
      topPerformers,
      lowRisk
    ] = await Promise.all([
      publicPortfolioService.getNormalizedData(username),
      censusDataService.getSmartMoneyFlow('all'),
      censusDataService.getSmartMoneyFlow('topCopiers'),
      censusDataService.getSmartMoneyFlow('topPerformers'),
      censusDataService.getSmartMoneyFlow('lowRisk')
    ]);

    console.log(`Portfolio data loaded for ${username}:`, {
      positions: portfolio.positions?.length || 0,
      totalValue: portfolio.totalValue,
      riskScore: portfolio.riskScore
    });

    // Use shared comparison service to build elite group comparison
    const eliteComparison = portfolioComparison.buildEliteComparison(
      portfolio.positions || [],
      portfolio.totalValue || 0,
      portfolio.cashBalance || 0,
      broadMarket,
      topCopiers,
      topPerformers,
      lowRisk
    );

    // Build portfolio summary
    const portfolioSummary = {
      username,
      totalValue: portfolio.totalValue,
      cashBalance: portfolio.cashBalance,
      cashPercent: portfolio.cashPercent,
      positionCount: portfolio.positions?.length || 0,
      ytdReturn: portfolio.totalReturn,
      riskScore: portfolio.riskScore,
      trades: portfolio.trades,
      winRatio: portfolio.winRatio,
      topPositions: portfolio.positions?.slice(0, 5).map((p: any) => ({
        symbol: p.symbol,
        instrumentName: p.instrumentName,
        marketValue: p.marketValue
      })) || []
    };

    const response = NextResponse.json({
      success: true,
      data: {
        portfolio: portfolioSummary,
        eliteGroupComparison: eliteComparison,
        timestamp: new Date().toISOString()
      }
    });

    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Failed to get public portfolio insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze portfolio'
      },
      { status: 500 }
    );
  }
}
