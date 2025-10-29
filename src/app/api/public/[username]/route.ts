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

    // Fetch user details (name, photo, PI status)
    let userDetails = null;
    try {
      const userDetailsResponse = await fetch(
        `https://www.etoro.com/api/public/v1/user-info/people?usernames=${username}`,
        {
          headers: {
            'X-API-KEY': process.env.ETORO_API_KEY || '',
            'X-USER-KEY': process.env.ETORO_USER_KEY || '',
            'X-REQUEST-ID': '1fea900a-bf1f-4b7c-8af2-976dc6ab273f'
          }
        }
      );
      if (userDetailsResponse.ok) {
        const details = await userDetailsResponse.json();
        if (details.users && Array.isArray(details.users) && details.users.length > 0) {
          const user = details.users.find((u: any) => u.username === username) || details.users[0];
          // Get avatar - the API returns avatars array, pick the 150x150 or first one
          let avatarUrl = null;
          if (user.avatars && Array.isArray(user.avatars) && user.avatars.length > 0) {
            const avatar150 = user.avatars.find((a: any) => a.width === 150);
            avatarUrl = avatar150?.url || user.avatars[0].url;
          }

          userDetails = {
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || username,
            avatar: avatarUrl,
            isPopularInvestor: user.isPi || false,
            piLevel: user.piLevel || 0,
            country: user.country || 0
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }

    // Build portfolio summary with sorted positions and logos
    const portfolioSummary = {
      username,
      fullName: userDetails?.fullName || username,
      avatar: userDetails?.avatar || null,
      isPopularInvestor: userDetails?.isPopularInvestor || false,
      piLevel: userDetails?.piLevel || 0,
      country: userDetails?.country || 0,
      totalValue: portfolio.totalValue,
      cashBalance: portfolio.cashBalance,
      cashPercent: portfolio.cashPercent,
      positionCount: portfolio.positions?.length || 0,
      ytdReturn: portfolio.totalReturn,
      riskScore: portfolio.riskScore,
      trades: portfolio.trades,
      winRatio: portfolio.winRatio,
      topPositions: portfolio.positions
        ?.sort((a: any, b: any) => b.marketValue - a.marketValue) // Ensure sorted by allocation
        ?.slice(0, 10)
        ?.map((p: any) => ({
          symbol: p.symbol,
          instrumentName: p.instrumentName,
          instrumentId: p.instrumentId,
          marketValue: p.marketValue,  // This is percentage (0-100) for public portfolios
          logoUrl: `https://etoro-cdn.etorostatic.com/market-avatars/${p.instrumentId}/150x150.png`
        })) || []
    };

    // Get performance data from census file (has weekTDReturn, monthTDReturn)
    const censusData = await censusDataService.loadCensusData();
    const performanceHoldings = censusData?.analyses?.[0]?.topHoldings || [];

    const response = NextResponse.json({
      success: true,
      data: {
        portfolio: portfolioSummary,
        eliteGroupComparison: eliteComparison,
        broadMarketHoldings: broadMarket.topHoldings || [],
        performanceData: performanceHoldings, // Full holdings with Week TD and MTD data
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
