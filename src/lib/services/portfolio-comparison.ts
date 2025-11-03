/**
 * Portfolio Comparison Service
 * Shared comparison logic used by both personal and public portfolio intelligence
 */

interface SmartMoneyData {
  groupType: string;
  groupDescription: string;
  investorCount: number;
  topHoldings: Array<{
    instrumentId: number;
    symbol: string;
    holdersCount: number;
    averageAllocation: number;
    penetration: number;
  }>;
  risingStars?: Array<any>;
  consensus?: Array<any>;
}

interface PortfolioPosition {
  instrumentId: number;
  symbol: string;
  marketValue: number;
  [key: string]: any;
}

interface ComparisonResult {
  groupAnalyzed: string;
  investorCount: number;
  opportunities: Array<{
    symbol: string;
    heldByTopInvestors: string;
    averageAllocation: string;
    recommendation: string;
  }>;
  alignedPositions: Array<{
    symbol: string;
    yourAllocation: string;
    smartMoneyAllocation: string;
    heldBy: string;
    alignment: string;
  }>;
  summary: {
    topMissedOpportunity: string;
    alignmentScore: number;
    recommendation: string;
  };
}

export class PortfolioComparisonService {
  /**
   * Compare user portfolio against an elite investor group
   */
  compareToEliteGroup(
    userPositions: PortfolioPosition[],
    userTotalValue: number,
    smartMoney: SmartMoneyData,
    minPenetration: number = 20
  ): ComparisonResult {
    // Get your positions as Sets for quick lookup (both instrument IDs and symbols)
    const yourInstrumentIds = new Set(userPositions.map(p => p.instrumentId));
    const yourSymbols = new Set(userPositions.map(p => p.symbol?.toUpperCase()));

    // Find opportunities - stocks held by many top investors that you DON'T have
    const opportunities = this.findMissingOpportunities(
      yourInstrumentIds,
      yourSymbols,
      smartMoney.topHoldings,
      minPenetration
    );

    // Find aligned positions - stocks you have that smart money also holds
    const alignedPositions = this.findAlignedPositions(
      userPositions,
      userTotalValue,
      smartMoney.topHoldings
    );

    // Calculate alignment score
    const alignmentScore = this.calculateAlignmentScore(
      alignedPositions.length,
      userPositions.length
    );

    return {
      groupAnalyzed: smartMoney.groupDescription,
      investorCount: smartMoney.investorCount,
      opportunities,
      alignedPositions,
      summary: {
        topMissedOpportunity: opportunities[0]?.symbol || 'None',
        alignmentScore,
        recommendation: opportunities.length > 5
          ? `Review top holdings you're missing from ${smartMoney.groupDescription}`
          : `Portfolio well-aligned with ${smartMoney.groupDescription}`
      }
    };
  }

  /**
   * Find missing opportunities (stocks you don't have that elite investors hold)
   */
  private findMissingOpportunities(
    yourInstrumentIds: Set<number>,
    yourSymbols: Set<string>,
    eliteHoldings: Array<any>,
    minPenetration: number = 20
  ): Array<any> {
    return eliteHoldings
      ?.filter(holding => {
        // Check if you DON'T have this holding
        const notOwned = !yourInstrumentIds.has(holding.instrumentId) &&
                         !yourSymbols.has(holding.symbol?.toUpperCase());
        // Only consider significant holdings
        return notOwned && holding.penetration > minPenetration;
      })
      .slice(0, 10)
      .map(holding => ({
        symbol: holding.symbol,
        heldByTopInvestors: `${holding.penetration.toFixed(0)}%`,
        averageAllocation: `${holding.averageAllocation.toFixed(1)}%`,
        recommendation: 'Consider adding to portfolio'
      })) || [];
  }

  /**
   * Find aligned positions (stocks you have that elite investors also hold)
   */
  private findAlignedPositions(
    userPositions: PortfolioPosition[],
    totalAccountValue: number,
    eliteHoldings: Array<any>
  ): Array<any> {
    return userPositions
      ?.filter(p => {
        const smartHolding = eliteHoldings?.find(h =>
          h.instrumentId === p.instrumentId ||
          h.symbol?.toUpperCase() === p.symbol?.toUpperCase()
        );
        // Include any position that smart money also holds (any penetration > 0)
        return smartHolding && smartHolding.penetration > 0;
      })
      .map(p => {
        const smartHolding = eliteHoldings.find(h =>
          h.instrumentId === p.instrumentId ||
          h.symbol?.toUpperCase() === p.symbol?.toUpperCase()
        );
        const yourAllocation = (p.marketValue / totalAccountValue) * 100;
        const smartAllocation = smartHolding?.averageAllocation || 3;
        const penetration = smartHolding?.penetration || 0;
        return {
          symbol: p.symbol,
          yourAllocation: isNaN(yourAllocation) ? 'N/A' : yourAllocation.toFixed(1) + '%',
          smartMoneyAllocation: smartAllocation > 0 ? smartAllocation.toFixed(1) + '%' : '2-5%',
          heldBy: `${penetration.toFixed(0)}% of top investors`,
          alignment: penetration > 30 ? 'STRONGLY ALIGNED' : 'ALIGNED'
        };
      }) || [];
  }

  /**
   * Calculate alignment score (percentage of your portfolio that matches elite holdings)
   */
  private calculateAlignmentScore(alignedCount: number, totalPositions: number): number {
    return Math.min(100, (alignedCount / Math.max(1, totalPositions)) * 100);
  }

  /**
   * Find opportunities for elite group comparison with specific threshold
   */
  findEliteOpportunities(
    yourInstrumentIds: Set<number>,
    smartMoney: SmartMoneyData,
    minPenetration: number = 10
  ): Array<{ symbol: string; penetration: string; avgAllocation: string; instrumentId: number; logoUrl: string }> {
    return smartMoney.topHoldings
      ?.filter(holding =>
        !yourInstrumentIds.has(holding.instrumentId) &&
        holding.penetration >= minPenetration
      )
      .slice(0, 5)
      .map(h => ({
        symbol: h.symbol,
        penetration: h.penetration.toFixed(0) + '%',
        avgAllocation: h.averageAllocation.toFixed(1) + '%',
        instrumentId: h.instrumentId,
        logoUrl: `https://etoro-cdn.etorostatic.com/market-avatars/${h.instrumentId}/150x150.png`
      })) || [];
  }

  /**
   * Generate insights from elite group comparison
   */
  generateEliteInsights(
    broadMarket: SmartMoneyData,
    topCopiers: SmartMoneyData,
    topPerformers: SmartMoneyData,
    lowRisk: SmartMoneyData,
    yourHoldings: Set<number>
  ): {
    mustHaveStocks: string[];
    performerEdgePicks: string[];
    conservativePicks: string[];
    recommendation: string;
  } {
    // Find stocks that appear in multiple elite groups but you don't have
    const allMissing = new Map<string, number>();

    // Count appearances across elite groups (not broad market)
    [...topCopiers.topHoldings, ...topPerformers.topHoldings, ...lowRisk.topHoldings]
      .filter(h => !yourHoldings.has(h.instrumentId))
      .forEach(h => {
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
      ?.filter(h =>
        !yourHoldings.has(h.instrumentId) &&
        !lowRisk.topHoldings?.some(c => c.instrumentId === h.instrumentId)
      )
      .slice(0, 2)
      .map(h => h.symbol) || [];

    // Find conservative consensus (in both copiers and low risk but not performers)
    const conservativeConsensus = topCopiers.topHoldings
      ?.filter(h =>
        !yourHoldings.has(h.instrumentId) &&
        lowRisk.topHoldings?.some(l => l.instrumentId === h.instrumentId) &&
        !topPerformers.topHoldings?.some(p => p.instrumentId === h.instrumentId)
      )
      .slice(0, 2)
      .map(h => h.symbol) || [];

    return {
      mustHaveStocks: mustHave,
      performerEdgePicks: performerUnique,
      conservativePicks: conservativeConsensus,
      recommendation: mustHave.length > 0
        ? `Missing assets: ${mustHave.join(', ')} - held by all elite groups`
        : performerUnique.length > 0
        ? `Top performers are uniquely holding ${performerUnique.join(', ')}`
        : conservativeConsensus.length > 0
        ? `Conservative investors favor ${conservativeConsensus.join(', ')}`
        : 'Your portfolio aligns well with elite investors'
    };
  }

  /**
   * Build elite group comparison result
   */
  buildEliteComparison(
    portfolioPositions: PortfolioPosition[],
    totalValue: number,
    cashBalance: number,
    broadMarket: SmartMoneyData,
    topCopiers: SmartMoneyData,
    topPerformers: SmartMoneyData,
    lowRisk: SmartMoneyData
  ) {
    const yourInstrumentIds = new Set(portfolioPositions.map(p => p.instrumentId));
    const totalAccountValue = totalValue + cashBalance;

    const result = {
      yourPortfolio: {
        positionCount: portfolioPositions.length,
        totalValue: totalAccountValue.toLocaleString()
      },
      comparisons: {
        // Broad market consensus (all 1500+ investors)
        broadMarket: {
          group: broadMarket.groupDescription,
          investorCount: broadMarket.investorCount,
          topMissing: this.findEliteOpportunities(yourInstrumentIds, broadMarket, 10),
          consensusPicks: broadMarket.consensus?.slice(0, 3).map(h => h.symbol) || []
        },
        // Top 100 most copied (highest social proof)
        topCopiers: {
          group: topCopiers.groupDescription,
          investorCount: topCopiers.investorCount,
          topMissing: this.findEliteOpportunities(yourInstrumentIds, topCopiers, 15),
          consensusPicks: topCopiers.consensus?.slice(0, 3).map(h => h.symbol) || []
        },
        // Top 100 YTD performers (best current strategies)
        topPerformers: {
          group: topPerformers.groupDescription,
          investorCount: topPerformers.investorCount,
          topMissing: this.findEliteOpportunities(yourInstrumentIds, topPerformers, 15),
          consensusPicks: topPerformers.consensus?.slice(0, 3).map(h => h.symbol) || []
        },
        // Top 100 conservative (lowest risk scores)
        lowRisk: {
          group: lowRisk.groupDescription,
          investorCount: lowRisk.investorCount,
          topMissing: this.findEliteOpportunities(yourInstrumentIds, lowRisk, 15),
          consensusPicks: lowRisk.consensus?.slice(0, 3).map(h => h.symbol) || []
        }
      },
      insights: this.generateEliteInsights(broadMarket, topCopiers, topPerformers, lowRisk, yourInstrumentIds)
    };

    return result;
  }
}

export const portfolioComparison = new PortfolioComparisonService();
