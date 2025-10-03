/**
 * Simplified Portfolio Intelligence Service
 * Focuses only on what we can actually calculate with available data
 */

import { realPortfolioService } from './real-portfolio-service';
import { censusDataService } from './census-data-service';

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

    // Use actual YTD gain from tradeinfo endpoint (this is the authoritative source)
    const actualYTDProfitPercent = tradeInfo?.gain || 0;
    // Calculate profit amount from percentage and initial value
    const initialValue = totalAccountValue / (1 + actualYTDProfitPercent / 100);
    const actualYTDProfit = totalAccountValue - initialValue;

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
  async getSmartMoneyAnalysis(groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk' = 'all'): Promise<any> {
    const [portfolio, smartMoney, topHoldings] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getSmartMoneyFlow(groupType),
      censusDataService.getTopHoldings(20)
    ]);

    // Get your positions as Sets for quick lookup (both instrument IDs and symbols)
    // Note: positions are already aggregated by instrument in the portfolio service
    const yourInstrumentIds = new Set(portfolio.positions?.map((p: any) => p.instrumentId) || []);
    const yourSymbols = new Set(portfolio.positions?.map((p: any) => p.symbol?.toUpperCase()) || []);

    // Identify opportunities - stocks held by many top investors that you DON'T have
    const opportunities = smartMoney.topHoldings
      ?.filter((holding: any) => {
        // Check if you DON'T have this holding
        const notOwned = !yourInstrumentIds.has(holding.instrumentId) &&
                         !yourSymbols.has(holding.symbol?.toUpperCase());
        // Only consider significant holdings (>20% of smart money holds it)
        return notOwned && holding.penetration > 20;
      })
      .slice(0, 10)
      .map((holding: any) => ({
        symbol: holding.symbol,
        heldByTopInvestors: `${holding.penetration.toFixed(0)}%`,
        averageAllocation: `${holding.averageAllocation.toFixed(1)}%`,
        recommendation: 'Consider adding to portfolio'
      })) || [];

    // Identify your aligned positions
    const totalAccountValue = (portfolio.totalValue || 0) + (portfolio.cashBalance || 0);
    const alignedPositions = portfolio.positions
      ?.filter((p: any) => {
        const smartHolding = smartMoney.topHoldings?.find((h: any) =>
          h.instrumentId === p.instrumentId ||
          h.symbol?.toUpperCase() === p.symbol?.toUpperCase()
        );
        // Include any position that smart money also holds (any penetration > 0)
        return smartHolding && smartHolding.penetration > 0;
      })
      .map((p: any) => {
        const smartHolding = smartMoney.topHoldings.find((h: any) =>
          h.instrumentId === p.instrumentId ||
          h.symbol?.toUpperCase() === p.symbol?.toUpperCase()
        );
        const yourAllocation = (p.marketValue / totalAccountValue) * 100;
        const smartAllocation = smartHolding?.averageAllocation || 3; // Default 3% if not available
        const penetration = smartHolding?.penetration || 0;
        return {
          symbol: p.symbol,
          yourAllocation: isNaN(yourAllocation) ? 'N/A' : yourAllocation.toFixed(1) + '%',
          smartMoneyAllocation: smartAllocation > 0 ? smartAllocation.toFixed(1) + '%' : '2-5%',
          heldBy: `${penetration.toFixed(0)}% of top investors`,
          alignment: penetration > 30 ? 'STRONGLY ALIGNED' : 'ALIGNED'
        };
      }) || [];

    return {
      groupAnalyzed: smartMoney.groupDescription,
      investorCount: smartMoney.investorCount,
      opportunities,
      alignedPositions,
      summary: {
        topMissedOpportunity: opportunities[0]?.symbol || 'None',
        alignmentScore: Math.min(100, (alignedPositions.length / Math.max(1, portfolio.positions?.length || 1)) * 100),
        recommendation: opportunities.length > 5
          ? `Review top holdings you're missing from ${smartMoney.groupDescription}`
          : `Portfolio well-aligned with ${smartMoney.groupDescription}`
      }
    };
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

      // Use actual YTD gain from tradeinfo endpoint (authoritative source)
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
  async getTopHoldingsInsights(): Promise<any> {
    const [portfolio, topHoldings] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getTopHoldings(20)
    ]);

    // Create a Set of your instrument IDs for more reliable matching
    const yourInstrumentIds = new Set(portfolio.positions?.map((p: any) => p.instrumentId) || []);
    const yourSymbols = new Set(portfolio.positions?.map((p: any) => p.symbol?.toUpperCase()) || []);

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

    return {
      topHoldings: insights.slice(0, 10),
      yourStats: {
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
  async getEliteGroupComparison(): Promise<any> {
    console.log('Starting getEliteGroupComparison...');
    const [portfolio, broadMarket, topCopiers, topPerformers, lowRisk] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getSmartMoneyFlow('all'), // All 1500+ investors
      censusDataService.getSmartMoneyFlow('topCopiers'),
      censusDataService.getSmartMoneyFlow('topPerformers'),
      censusDataService.getSmartMoneyFlow('lowRisk')
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

    // Get your positions for comparison
    const yourInstrumentIds = new Set(portfolio.positions?.map((p: any) => p.instrumentId) || []);

    // Helper function to find opportunities
    const findOpportunities = (smartMoney: any, minPenetration: number = 10) => {
      return smartMoney.topHoldings
        ?.filter((holding: any) =>
          !yourInstrumentIds.has(holding.instrumentId) &&
          holding.penetration >= minPenetration  // Changed to >= for inclusive threshold
        )
        .slice(0, 5)
        .map((h: any) => ({
          symbol: h.symbol,
          penetration: h.penetration.toFixed(0) + '%',
          avgAllocation: h.averageAllocation.toFixed(1) + '%'
        })) || [];
    };

    const result = {
      yourPortfolio: {
        positionCount: portfolio.positions?.length || 0,
        totalValue: ((portfolio.totalValue || 0) + (portfolio.cashBalance || 0)).toLocaleString()
      },
      comparisons: {
        // Broad market consensus (all 1500+ investors)
        broadMarket: {
          group: broadMarket.groupDescription,
          investorCount: broadMarket.investorCount,
          topMissing: findOpportunities(broadMarket, 10), // Lower threshold for broad market (10% = 150+ investors)
          consensusPicks: broadMarket.consensus?.slice(0, 3).map((h: any) => h.symbol) || []
        },
        // Top 100 most copied (highest social proof)
        topCopiers: {
          group: topCopiers.groupDescription,
          investorCount: topCopiers.investorCount,
          topMissing: findOpportunities(topCopiers, 15), // 15% = 15+ investors in this elite group
          consensusPicks: topCopiers.consensus?.slice(0, 3).map((h: any) => h.symbol) || []
        },
        // Top 100 YTD performers (best current strategies)
        topPerformers: {
          group: topPerformers.groupDescription,
          investorCount: topPerformers.investorCount,
          topMissing: findOpportunities(topPerformers, 15), // 15% = 15+ investors in this elite group
          consensusPicks: topPerformers.consensus?.slice(0, 3).map((h: any) => h.symbol) || []
        },
        // Top 100 conservative (lowest risk scores)
        lowRisk: {
          group: lowRisk.groupDescription,
          investorCount: lowRisk.investorCount,
          topMissing: findOpportunities(lowRisk, 15), // 15% = 15+ investors in this elite group
          consensusPicks: lowRisk.consensus?.slice(0, 3).map((h: any) => h.symbol) || []
        }
      },
      insights: this.generateEliteInsights(broadMarket, topCopiers, topPerformers, lowRisk, yourInstrumentIds)
    };

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
   * Generate insights from elite group comparison
   */
  private generateEliteInsights(broadMarket: any, topCopiers: any, topPerformers: any, lowRisk: any, yourHoldings: Set<number>): any {
    // Find stocks that appear in multiple elite groups but you don't have
    const allMissing = new Map<string, number>();

    // Count appearances across elite groups (not broad market)
    [...topCopiers.topHoldings, ...topPerformers.topHoldings, ...lowRisk.topHoldings]
      .filter((h: any) => !yourHoldings.has(h.instrumentId))
      .forEach((h: any) => {
        const count = allMissing.get(h.symbol) || 0;
        allMissing.set(h.symbol, count + 1);
      });

    // Find stocks that appear in all 3 elite groups
    const mustHave = Array.from(allMissing.entries())
      .filter(([_, count]) => count >= 3)
      .map(([symbol, _]) => symbol)
      .slice(0, 3);

    // Find unique picks by top performers not in conservative portfolio
    const performerUnique = topPerformers.topHoldings
      ?.filter((h: any) =>
        !yourHoldings.has(h.instrumentId) &&
        !lowRisk.topHoldings?.some((c: any) => c.instrumentId === h.instrumentId)
      )
      .slice(0, 2)
      .map((h: any) => h.symbol) || [];

    // Find conservative consensus (in both copiers and low risk but not performers)
    const conservativeConsensus = topCopiers.topHoldings
      ?.filter((h: any) =>
        !yourHoldings.has(h.instrumentId) &&
        lowRisk.topHoldings?.some((l: any) => l.instrumentId === h.instrumentId) &&
        !topPerformers.topHoldings?.some((p: any) => p.instrumentId === h.instrumentId)
      )
      .slice(0, 2)
      .map((h: any) => h.symbol) || [];

    return {
      mustHaveStocks: mustHave,
      performerEdgePicks: performerUnique,
      conservativePicks: conservativeConsensus,
      recommendation: mustHave.length > 0
        ? `Consider adding ${mustHave.join(', ')} - held by all elite groups`
        : performerUnique.length > 0
        ? `Top performers are uniquely holding ${performerUnique.join(', ')}`
        : conservativeConsensus.length > 0
        ? `Conservative investors favor ${conservativeConsensus.join(', ')}`
        : 'Your portfolio aligns well with elite investors'
    };
  }

  /**
   * 4. RISK ASSESSMENT - Comprehensive risk metrics calculation
   */
  async getRiskAssessment(): Promise<any> {
    const [portfolio, marketStats] = await Promise.all([
      realPortfolioService.getPortfolio(),
      censusDataService.getMarketStats()
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

    // Enhanced risk score calculation
    let riskScore = 5; // Start at medium risk

    // 1. Concentration risk (0-3 points)
    if (top5Concentration > 70) riskScore += 3;
    else if (top5Concentration > 60) riskScore += 2;
    else if (top5Concentration > 50) riskScore += 1;
    else if (top5Concentration < 30) riskScore -= 1;

    // 2. Diversification risk (0-2 points)
    if (positions.length < 5) riskScore += 2;
    else if (positions.length < 10) riskScore += 1;
    else if (positions.length > 30) riskScore -= 1;

    // 3. Cash buffer risk (0-2 points)
    if (cashPercent < 5) riskScore += 2;  // Very low cash = high risk
    else if (cashPercent < 10) riskScore += 1;
    else if (cashPercent > 30) riskScore -= 2; // High cash = defensive
    else if (cashPercent > 20) riskScore -= 1;

    // 4. Leverage risk (0-2 points)
    const leveragedPositions = positions.filter((p: any) => p.leverage && p.leverage > 1);
    const leveragedPercent = (leveragedPositions.length / Math.max(1, positions.length)) * 100;
    if (leveragedPercent > 30) riskScore += 2;
    else if (leveragedPercent > 10) riskScore += 1;

    // 5. Asset type risk (0-2 points) - check for crypto/volatile assets
    const cryptoPositions = positions.filter((p: any) =>
      p.symbol?.includes('CRYPTO') ||
      p.type?.toLowerCase().includes('crypto') ||
      ['BTC', 'ETH', 'CRYPTO'].some(crypto => p.symbol?.includes(crypto))
    );
    const cryptoPercent = cryptoPositions.reduce((sum: number, p: any) =>
      sum + (p.marketValue / totalValue) * 100, 0);
    if (cryptoPercent > 20) riskScore += 2;
    else if (cryptoPercent > 10) riskScore += 1;

    // Bound between 1-10
    riskScore = Math.max(1, Math.min(10, riskScore));

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