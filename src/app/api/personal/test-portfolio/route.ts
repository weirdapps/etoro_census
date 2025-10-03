import { NextResponse } from 'next/server';
import { realPortfolioService } from '@/lib/services/real-portfolio-service';

export async function GET() {
  try {
    // Check environment variables
    const hasPersonalKeys = !!(process.env.ETORO_PERSONAL_API_KEY && process.env.ETORO_PERSONAL_USER_KEY);
    const hasRegularKeys = !!(process.env.ETORO_API_KEY && process.env.ETORO_USER_KEY);

    console.log('Environment check:', {
      hasPersonalKeys,
      hasRegularKeys,
      personalApiKey: process.env.ETORO_PERSONAL_API_KEY ? 'SET' : 'NOT SET',
      personalUserKey: process.env.ETORO_PERSONAL_USER_KEY ? 'SET' : 'NOT SET',
    });

    // Try to fetch real portfolio
    const portfolio = await realPortfolioService.getPortfolio();

    return NextResponse.json({
      success: true,
      environment: {
        hasPersonalKeys,
        hasRegularKeys,
        keysFound: hasPersonalKeys || hasRegularKeys
      },
      portfolio: {
        totalValue: portfolio.totalValue,
        totalInvested: portfolio.totalInvested,
        totalProfit: portfolio.totalProfit,
        positionsCount: portfolio.positions?.length || 0,
        cashBalance: portfolio.cashBalance,
        error: portfolio.error
      },
      rawPositions: portfolio.positions?.slice(0, 3) // Show first 3 positions for debugging
    });
  } catch (error) {
    console.error('Test portfolio error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        hasPersonalKeys: !!(process.env.ETORO_PERSONAL_API_KEY && process.env.ETORO_PERSONAL_USER_KEY),
        hasRegularKeys: !!(process.env.ETORO_API_KEY && process.env.ETORO_USER_KEY)
      }
    }, { status: 500 });
  }
}