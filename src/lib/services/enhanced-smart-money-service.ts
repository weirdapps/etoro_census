import { censusDataService, SmartHolding } from './census-data-service';
import { historicalTrackingService, HoldingTrend } from './historical-tracking-service';
import { logger } from '../logger';

export type ConvictionLevel = 'high' | 'medium' | 'low';
export type SignalType = 'accumulation' | 'distribution' | 'rotation';

export interface EnhancedSmartHolding extends SmartHolding {
  momentum: number;
  velocity: number;
  conviction: ConvictionLevel;
  trend: 'rising' | 'falling' | 'stable';
  weeklyChange: number;
}

export interface RotationSignal {
  from: string;
  to: string;
  strength: number;
}

export interface SmartMoneySignals {
  accumulation: string[];
  distribution: string[];
  rotation: RotationSignal[];
}

export interface EnhancedSmartMoneyFlow {
  groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk';
  groupDescription: string;
  investorCount: number;
  topHoldings: EnhancedSmartHolding[];
  signals: SmartMoneySignals;
  marketContext: {
    overallMomentum: 'risk-on' | 'risk-off' | 'neutral';
    concentration: number;
    topHoldingsTurnover: number;
  };
}

export class EnhancedSmartMoneyService {
  async getEnhancedSmartMoneyFlow(
    groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk' = 'all',
    baseUrl?: string
  ): Promise<EnhancedSmartMoneyFlow> {
    try {
      const [basicFlow, topMovers] = await Promise.all([
        censusDataService.getSmartMoneyFlow(groupType, baseUrl),
        historicalTrackingService.getTopMovers(7, 50),
      ]);

      const enhancedHoldings = this.enhanceHoldings(basicFlow.topHoldings, topMovers);
      const signals = this.detectSignals(enhancedHoldings, topMovers);
      const marketContext = this.analyzeMarketContext(enhancedHoldings);

      return {
        groupType: basicFlow.groupType,
        groupDescription: basicFlow.groupDescription,
        investorCount: basicFlow.investorCount,
        topHoldings: enhancedHoldings,
        signals,
        marketContext,
      };
    } catch (err) {
      logger.error('Error in getEnhancedSmartMoneyFlow', { error: String(err) });
      return this.getEmptyResult(groupType);
    }
  }

  private enhanceHoldings(
    holdings: SmartHolding[],
    topMovers: { gainers: HoldingTrend[]; losers: HoldingTrend[] }
  ): EnhancedSmartHolding[] {
    const moverMap = new Map<number, HoldingTrend>();

    for (const gainer of topMovers.gainers) {
      moverMap.set(gainer.instrumentId, gainer);
    }
    for (const loser of topMovers.losers) {
      moverMap.set(loser.instrumentId, loser);
    }

    return holdings.map(holding => {
      const mover = moverMap.get(holding.instrumentId);

      const weeklyChange = mover?.changePercent ?? 0;
      const momentum = weeklyChange;
      const velocity = mover?.velocity ?? 0;

      let conviction: ConvictionLevel = 'low';
      if (holding.penetration >= 50 && holding.averageAllocation >= 5) {
        conviction = 'high';
      } else if (holding.penetration >= 30 || holding.averageAllocation >= 3) {
        conviction = 'medium';
      }

      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (weeklyChange > 5) trend = 'rising';
      else if (weeklyChange < -5) trend = 'falling';

      return {
        ...holding,
        momentum,
        velocity,
        conviction,
        trend,
        weeklyChange,
      };
    });
  }

  private detectSignals(
    holdings: EnhancedSmartHolding[],
    topMovers: { gainers: HoldingTrend[]; losers: HoldingTrend[] }
  ): SmartMoneySignals {
    const accumulation: string[] = [];
    const distribution: string[] = [];
    const rotation: RotationSignal[] = [];

    // Detect accumulation (rising + high conviction)
    for (const holding of holdings) {
      if (holding.trend === 'rising' && holding.conviction !== 'low' && holding.weeklyChange > 10) {
        accumulation.push(holding.symbol);
      }
    }

    // Detect distribution (falling from top holdings)
    for (const loser of topMovers.losers) {
      const holding = holdings.find(h => h.instrumentId === loser.instrumentId);
      if (holding && holding.conviction !== 'low' && loser.changePercent < -10) {
        distribution.push(loser.symbol);
      }
    }

    // Detect rotation patterns
    if (topMovers.gainers.length > 0 && topMovers.losers.length > 0) {
      const topGainer = topMovers.gainers[0];
      const topLoser = topMovers.losers[0];

      // Check if there's a correlation between biggest loser and biggest gainer
      if (topGainer && topLoser && Math.abs(topGainer.changePercent) > 15 && Math.abs(topLoser.changePercent) > 15) {
        rotation.push({
          from: topLoser.symbol,
          to: topGainer.symbol,
          strength: Math.min(Math.abs(topGainer.changePercent), Math.abs(topLoser.changePercent)) / 100,
        });
      }
    }

    return { accumulation, distribution, rotation };
  }

  private analyzeMarketContext(holdings: EnhancedSmartHolding[]): {
    overallMomentum: 'risk-on' | 'risk-off' | 'neutral';
    concentration: number;
    topHoldingsTurnover: number;
  } {
    // Calculate average momentum
    const avgMomentum = holdings.length > 0
      ? holdings.reduce((sum, h) => sum + h.momentum, 0) / holdings.length
      : 0;

    let overallMomentum: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
    if (avgMomentum > 3) overallMomentum = 'risk-on';
    else if (avgMomentum < -3) overallMomentum = 'risk-off';

    // Calculate concentration (Herfindahl-like index based on penetration)
    const totalPenetration = holdings.slice(0, 10).reduce((sum, h) => sum + h.penetration, 0);
    const concentration = totalPenetration / 10;

    // Calculate turnover (how much movement in top holdings)
    const turnover = holdings.slice(0, 10).reduce((sum, h) => sum + Math.abs(h.weeklyChange), 0) / 10;

    return {
      overallMomentum,
      concentration,
      topHoldingsTurnover: turnover,
    };
  }

  private getEmptyResult(groupType: 'all' | 'topCopiers' | 'topPerformers' | 'lowRisk'): EnhancedSmartMoneyFlow {
    return {
      groupType,
      groupDescription: '',
      investorCount: 0,
      topHoldings: [],
      signals: {
        accumulation: [],
        distribution: [],
        rotation: [],
      },
      marketContext: {
        overallMomentum: 'neutral',
        concentration: 0,
        topHoldingsTurnover: 0,
      },
    };
  }

  async getSmartMoneyDivergence(baseUrl?: string): Promise<{
    opportunities: Array<{
      symbol: string;
      smartMoneyPenetration: number;
      elitePenetration: number;
      divergence: number;
      signal: 'SMART_ACCUMULATING' | 'SMART_DISTRIBUTING' | 'NEUTRAL';
    }>;
    summary: {
      totalOpportunities: number;
      accumulatingCount: number;
      distributingCount: number;
    };
  }> {
    try {
      const [allFlow, eliteFlow] = await Promise.all([
        this.getEnhancedSmartMoneyFlow('all', baseUrl),
        this.getEnhancedSmartMoneyFlow('topCopiers', baseUrl),
      ]);

      const allMap = new Map(allFlow.topHoldings.map(h => [h.symbol, h]));
      const opportunities: Array<{
        symbol: string;
        smartMoneyPenetration: number;
        elitePenetration: number;
        divergence: number;
        signal: 'SMART_ACCUMULATING' | 'SMART_DISTRIBUTING' | 'NEUTRAL';
      }> = [];

      for (const eliteHolding of eliteFlow.topHoldings) {
        const allHolding = allMap.get(eliteHolding.symbol);
        if (!allHolding) continue;

        const divergence = eliteHolding.penetration - allHolding.penetration;

        let signal: 'SMART_ACCUMULATING' | 'SMART_DISTRIBUTING' | 'NEUTRAL' = 'NEUTRAL';
        if (divergence > 10 && eliteHolding.trend === 'rising') {
          signal = 'SMART_ACCUMULATING';
        } else if (divergence < -10 && eliteHolding.trend === 'falling') {
          signal = 'SMART_DISTRIBUTING';
        }

        if (Math.abs(divergence) >= 5) {
          opportunities.push({
            symbol: eliteHolding.symbol,
            smartMoneyPenetration: eliteHolding.penetration,
            elitePenetration: allHolding.penetration,
            divergence,
            signal,
          });
        }
      }

      // Sort by absolute divergence
      opportunities.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));

      return {
        opportunities: opportunities.slice(0, 20),
        summary: {
          totalOpportunities: opportunities.length,
          accumulatingCount: opportunities.filter(o => o.signal === 'SMART_ACCUMULATING').length,
          distributingCount: opportunities.filter(o => o.signal === 'SMART_DISTRIBUTING').length,
        },
      };
    } catch (err) {
      logger.error('Error in getSmartMoneyDivergence', { error: String(err) });
      return {
        opportunities: [],
        summary: {
          totalOpportunities: 0,
          accumulatingCount: 0,
          distributingCount: 0,
        },
      };
    }
  }
}

export const enhancedSmartMoneyService = new EnhancedSmartMoneyService();
