/**
 * Simplified Portfolio Intelligence Service
 * Focuses only on what we can actually calculate with available data
 */

import { realPortfolioService } from './real-portfolio-service';
import { censusDataService } from './census-data-service';
import { portfolioComparison } from './portfolio-comparison';

class SimplifiedIntelligenceService {
  private static instance: SimplifiedIntelligenceService;

  private constructor() {}

  static getInstance(): SimplifiedIntelligenceService {
    if (!SimplifiedIntelligenceService.instance) {
      SimplifiedIntelligenceService.instance = new SimplifiedIntelligenceService();
    }
    return SimplifiedIntelligenceService.instance;
  }

  /**
   * Get Portfolio Summary - Basic portfolio information
   */
  async getPortfolioSummary(): Promise<any> {
    const [portfolio, pnl, tradeInfo] = await Promise.all([
      realPortfolioService.getPortfolio(),
      realPortfolioService.getPnL(),
      realPortfolioService.getTradeInfo()
    ]);

    // Calculate values from API data
    const portfolioValue = portfolio.totalValue || 0;
    const cashBalance = portfolio.cashBalance || 0;
    const totalAccountValue = portfolioValue + cashBalance;

    // Use YTD gain from TradeInfo API (correct YTD return)
    const actualYTDProfitPercent = tradeInfo?.gain || 0;
    const actualYTDProfit = portfolio.totalProfit || 0;

    // Log for debugging
    console.log('P&L Data:', {
      daily: pnl?.daily,
      weekly: pnl?.weekly,
      monthly: pnl?.monthly,
      yearly: pnl?.yearly,
      total: pnl?.total
    });

    return {
      // Breakdown of values
      portfolioValue: portfolioValue,
      cashBalance: cashBalance,
      totalValue: totalAccountValue,

      // YTD Performance
      ytdProfit: actualYTDProfit,
      ytdProfitPercent: actualYTDProfitPercent,

      // Portfolio details (positions are aggregated by asset)
      positionCount: portfolio.positions?.length || 0,
      topPositions: portfolio.positions?.slice(0, 5).map((p: any) => ({
        symbol: p.symbol,
        marketValue: p.marketValue,
        profitPercent: p.profitPercent || 0,
        // Allocation % reflects TOTAL position in this asset (all buys combined)
        allocation: ((p.marketValue / totalAccountValue) * 100).toFixed(1) + '%'
      })) || [],

      timeframe: {
        profitPeriod: 'Year-to-Date (YTD)',
        valuationDate: new Date().toISOString().split('T')[0],
        lastUpdate: new Date().toISOString()
      }
    };
  }

  /**
   * 1. SMART MONEY ANALYSIS - What top investors are holding
   */
  async getSmartMoneyAnalysis(groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk' = 'all', baseUrl?: string): Promise<any> {
    const [portfolio, smartMoney, topHoldings] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getSmartMoneyFlow(groupType, baseUrl),
      censusDataService.getTopHoldings(20, baseUrl)
    ]);

    const totalAccountValue = (portfolio.totalValue || 0) + (portfolio.cashBalance || 0);

    // Use shared comparison service
    return portfolioComparison.compareToEliteGroup(
      portfolio.positions || [],
      totalAccountValue,
      smartMoney,
      20 // minPenetration threshold
    );
  }

  /**
   * 2. PERFORMANCE COMPARISON - How you stack up against the market
   */
  async getPerformanceComparison(): Promise<any> {
    const [portfolio, pnl, tradeInfo, sp500Data] = await Promise.all([
      realPortfolioService.getPortfolio(),
      realPortfolioService.getPnL(),
      realPortfolioService.getTradeInfo(),
      realPortfolioService.getSP500Data()
    ]);

    // Calculate values from API data
    let portfolioValue, cashBalance, totalAccountValue, yourYTDReturn;

    {
      // Include cash in total value for accurate display
      portfolioValue = portfolio.totalValue || 0;
      cashBalance = portfolio.cashBalance || 0;
      totalAccountValue = portfolioValue + cashBalance;

      // Use YTD gain from TradeInfo API (correct YTD return)
      yourYTDReturn = tradeInfo?.gain || 0;
    }

    // Use S&P 500 YTD return as market benchmark
    const marketYTDReturn = sp500Data?.ytdReturn || 20;  // Default to ~20% if API fails

    console.log('YTD Performance comparison - Your return:', yourYTDReturn, 'Market average:', marketYTDReturn);
    const outperformance = yourYTDReturn - marketYTDReturn;

    // Calculate percentile rank (simplified)
    let percentileRank = 50; // Default to median
    if (yourYTDReturn > marketYTDReturn + 10) percentileRank = 80;
    else if (yourYTDReturn > marketYTDReturn) percentileRank = 60;
    else if (yourYTDReturn > marketYTDReturn - 10) percentileRank = 40;
    else percentileRank = 20;

    return {
      yourPerformance: {
        ytdReturn: yourYTDReturn.toFixed(2) + '%',
        portfolioValue: '$' + portfolioValue.toLocaleString(),
        cashBalance: '$' + cashBalance.toLocaleString(),
        totalValue: '$' + totalAccountValue.toLocaleString(),
        positionCount: portfolio.positions?.length || 0,
        cashPercent: ((cashBalance / totalAccountValue) * 100).toFixed(1) + '%',
        winRate: '---', // We don't have this for individual portfolio
      },
      marketAverages: {
        ytdReturn: marketYTDReturn.toFixed(1) + '%',
        benchmark: 'S&P 500 Index',
        currentPrice: sp500Data?.currentPrice ? '$' + sp500Data.currentPrice.toFixed(2) : 'N/A',
        yearStartPrice: sp500Data?.yearStartPrice ? '$' + sp500Data.yearStartPrice.toFixed(2) : 'N/A'
      },
      comparison: {
        outperformance: (outperformance > 0 ? '+' : '') + outperformance.toFixed(2) + '%',
        percentileRank: percentileRank + 'th percentile',
        status: outperformance > 0 ? 'OUTPERFORMING' : 'UNDERPERFORMING',
        message: outperformance > 0
          ? `You're beating the S&P 500 by ${Math.abs(outperformance).toFixed(1)}%`
          : `S&P 500 is ahead by ${Math.abs(outperformance).toFixed(1)}%`
      },
      timeframe: {
        returnPeriod: 'Year-to-Date (YTD)',
        comparisonDate: new Date().toISOString().split('T')[0],
        marketDataSource: 'S&P 500 Index (SPY ETF)',
        lastUpdate: new Date().toISOString(),
        note: 'Comparing your YTD return against S&P 500 benchmark'
      }
    };
  }

  /**
   * 3. TOP HOLDINGS INSIGHTS - What's popular and how it's performing
   */
  async getTopHoldingsInsights(baseUrl?: string): Promise<any> {
    const [portfolio, topHoldings] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getTopHoldings(20, baseUrl)
    ]);

    // Create a Set of your instrument IDs for more reliable matching
    const yourInstrumentIds = new Set(portfolio.positions?.map((p: any) => p.instrumentId) || []);
    const yourSymbols = new Set(portfolio.positions?.map((p: any) => p.symbol?.toUpperCase()) || []);

    // Create a Set of POPULAR instrument IDs (top holdings from market data)
    const popularInstrumentIds = new Set(topHoldings.map((h: any) => h.instrumentId));

    const insights = topHoldings.map((holding: any) => ({
      rank: topHoldings.indexOf(holding) + 1,
      symbol: holding.symbol,
      name: holding.instrumentName || holding.name,
      heldBy: `${holding.holdersPercentage || 0}% of investors`,
      averageAllocation: `${(holding.averageAllocation || 0).toFixed(1)}%`,
      // Check both instrument ID and symbol for matching
      inYourPortfolio: yourInstrumentIds.has(holding.instrumentId) ||
                       yourSymbols.has(holding.symbol?.toUpperCase()),
      performance: {
        yesterday: (holding.yesterdayReturn || 0).toFixed(2) + '%',
        weekTD: (holding.weekTDReturn || 0).toFixed(2) + '%',
        monthTD: (holding.monthTDReturn || 0).toFixed(2) + '%'
      }
    }));

    // Summary stats
    const yourPopularHoldings = insights.filter((h: any) => h.inYourPortfolio);
    const missedTopHoldings = insights.filter((h: any) => !h.inYourPortfolio).slice(0, 5);

    // Calculate total account value for allocation percentages
    const totalAccountValue = (portfolio.totalValue || 0) + (portfolio.cashBalance || 0);

    // Format user's actual holdings with allocation percentages
    const yourHoldings = (portfolio.positions || []).map((position: any) => ({
      symbol: position.symbol,
      name: position.instrumentName,
      instrumentId: position.instrumentId,
      marketValue: position.marketValue,
      allocation: totalAccountValue > 0
        ? `${((position.marketValue / totalAccountValue) * 100).toFixed(1)}%`
        : '0.0%',
      profit: position.profit,
      profitPercent: `${position.profitPercent?.toFixed(2) || '0.00'}%`,
      isPopular: popularInstrumentIds.has(position.instrumentId)
    })).sort((a: any, b: any) => b.marketValue - a.marketValue); // Sort by value descending

    return {
      // Market-wide top holdings for comparison
      topHoldings: insights.slice(0, 10),
      // YOUR ACTUAL HOLDINGS
      yourHoldings: yourHoldings,
      yourStats: {
        totalHoldings: yourHoldings.length,
        popularHoldingsCount: yourPopularHoldings.length,
        coverageOfTop20: `${((yourPopularHoldings.length / 20) * 100).toFixed(0)}%`,
        missedOpportunities: missedTopHoldings.length
      },
      recommendations: missedTopHoldings.map((h: any) => ({
        symbol: h.symbol,
        name: h.name,
        reason: `Held by ${h.heldBy}, you're missing out`
      }))
    };
  }

  /**
   * ELITE GROUP COMPARISON - Compare against multiple elite investor groups
   */
  async getEliteGroupComparison(baseUrl?: string): Promise<any> {
    console.log('Starting getEliteGroupComparison...');
    const [portfolio, broadMarket, topCopiers, topPerformers, lowRisk] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getSmartMoneyFlow('all', baseUrl), // All 1500+ investors
      censusDataService.getSmartMoneyFlow('topCopiers', baseUrl),
      censusDataService.getSmartMoneyFlow('topPerformers', baseUrl),
      censusDataService.getSmartMoneyFlow('lowRisk', baseUrl)
    ]);

    console.log('Elite Group Data Fetched:', {
      portfolio: !!portfolio,
      broadMarket: {
        loaded: !!broadMarket,
        holdings: broadMarket?.topHoldings?.length || 0,
        consensus: broadMarket?.consensus?.length || 0,
        firstHolding: broadMarket?.topHoldings?.[0]
      },
      topCopiers: {
        loaded: !!topCopiers,
        holdings: topCopiers?.topHoldings?.length || 0,
        consensus: topCopiers?.consensus?.length || 0
      },
      topPerformers: {
        loaded: !!topPerformers,
        holdings: topPerformers?.topHoldings?.length || 0
      },
      lowRisk: {
        loaded: !!lowRisk,
        holdings: lowRisk?.topHoldings?.length || 0
      }
    });

    // Use shared comparison service
    const result = portfolioComparison.buildEliteComparison(
      portfolio.positions || [],
      portfolio.totalValue || 0,
      portfolio.cashBalance || 0,
      broadMarket,
      topCopiers,
      topPerformers,
      lowRisk
    );

    console.log('Elite Group Comparison Result:', {
      hasData: true,
      portfolioCount: portfolio.positions?.length || 0,
      comparisons: {
        broadMarket: !!result.comparisons.broadMarket.topMissing?.length,
        topCopiers: !!result.comparisons.topCopiers.topMissing?.length,
        topPerformers: !!result.comparisons.topPerformers.topMissing?.length,
        lowRisk: !!result.comparisons.lowRisk.topMissing?.length
      },
      insights: !!result.insights
    });

    return result;
  }

  /**
   * 4. RISK ASSESSMENT - Use eToro's actual risk score
   */
  async getRiskAssessment(): Promise<any> {
    const [portfolio, marketStats, tradeInfo] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getMarketStats(),
      realPortfolioService.getTradeInfo()
    ]);

    // Calculate concentration risk
    const positions = portfolio.positions || [];
    const totalValue = (portfolio.totalValue || 0) + (portfolio.cashBalance || 0) || 1;
    const cashPercent = ((portfolio.cashBalance || 0) / totalValue) * 100;

    const topPositions = positions
      .sort((a: any, b: any) => b.marketValue - a.marketValue)
      .slice(0, 5);

    const top5Concentration = topPositions.reduce((sum: number, p: any) =>
      sum + (p.marketValue / totalValue) * 100, 0);

    // Use eToro's actual risk score from TradeInfo API
    const riskScore = tradeInfo?.riskScore || 5; // Fallback to 5 if not available

    // Calculate additional risk factors for context
    const leveragedPositions = positions.filter((p: any) => p.leverage && p.leverage > 1);
    const leveragedPercent = (leveragedPositions.length / Math.max(1, positions.length)) * 100;

    const cryptoPositions = positions.filter((p: any) =>
      p.symbol?.includes('CRYPTO') ||
      p.type?.toLowerCase().includes('crypto') ||
      ['BTC', 'ETH', 'CRYPTO'].some(crypto => p.symbol?.includes(crypto))
    );
    const cryptoPercent = cryptoPositions.reduce((sum: number, p: any) =>
      sum + (p.marketValue / totalValue) * 100, 0);

    return {
      riskMetrics: {
        overallRiskScore: riskScore,
        riskLevel: riskScore <= 3 ? 'LOW' : riskScore <= 6 ? 'MEDIUM' : 'HIGH',
        riskFactors: {
          concentration: {
            value: top5Concentration.toFixed(1) + '%',
            impact: top5Concentration > 60 ? 'HIGH' : top5Concentration > 40 ? 'MEDIUM' : 'LOW',
            largestPosition: ((topPositions[0]?.marketValue / totalValue) * 100).toFixed(1) + '%'
          },
          diversification: {
            totalPositions: positions.length,
            impact: positions.length < 10 ? 'HIGH' : positions.length < 20 ? 'MEDIUM' : 'LOW'
          },
          cashBuffer: {
            percent: cashPercent.toFixed(1) + '%',
            impact: cashPercent < 10 ? 'HIGH' : cashPercent < 20 ? 'MEDIUM' : 'LOW'
          },
          leverage: {
            leveragedPositions: leveragedPositions.length,
            percent: leveragedPercent.toFixed(0) + '%',
            impact: leveragedPercent > 20 ? 'HIGH' : leveragedPercent > 5 ? 'MEDIUM' : 'LOW'
          },
          assetTypes: {
            cryptoExposure: cryptoPercent.toFixed(1) + '%',
            impact: cryptoPercent > 15 ? 'HIGH' : cryptoPercent > 5 ? 'MEDIUM' : 'LOW'
          }
        },
        calculationDate: new Date().toISOString().split('T')[0],
        methodology: 'Composite score based on concentration, diversification, cash buffer, leverage, and asset volatility'
      },
      comparison: {
        yourRiskScore: riskScore,
        marketAverageRisk: marketStats?.averageRiskScore || 3.7,
        difference: (riskScore - (marketStats?.averageRiskScore || 3.7)).toFixed(1),
        interpretation: riskScore > (marketStats?.averageRiskScore || 3.7)
          ? 'Higher risk than average'
          : 'Lower risk than average'
      }
    };
  }
}

export const simplifiedIntelligence = SimplifiedIntelligenceService.getInstance();