/**
 * Portfolio Service
 * Manages personal portfolio data fetching and processing
 *
 * @deprecated This service is not used. Use real-portfolio-service.ts or public-portfolio-service.ts instead.
 */

// TODO: Remove this file - it's dead code. Using placeholder to fix TypeScript errors.
const personalAuth = {
  makeRequest: async <T>(_endpoint: string): Promise<T> => {
    throw new Error('Portfolio service is deprecated. Use real-portfolio-service instead.');
  }
};

// Types based on eToro API documentation
export interface Position {
  positionId: string;
  instrumentId: number;
  instrumentName: string;
  symbolFull: string;
  instrumentLogo?: string;
  direction: 'BUY' | 'SELL';
  leverage: number;
  units: number;
  openRate: number;
  currentRate: number;
  marketValue: number;
  investedAmount: number;
  profit: number;
  profitPercent: number;
  openDateTime: string;
  isBuy: boolean;
  isSell: boolean;
  stopLossRate?: number;
  takeProfitRate?: number;
  // For aggregated positions
  positionCount?: number;
}

export interface Portfolio {
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  totalProfitPercent: number;
  availableCash: number;
  cashPercent: number;
  positions: Position[];
  lastUpdated: string;
}

export interface PnLData {
  daily: {
    amount: number;
    percent: number;
  };
  weekly: {
    amount: number;
    percent: number;
  };
  monthly: {
    amount: number;
    percent: number;
  };
  yearly: {
    amount: number;
    percent: number;
  };
  total: {
    amount: number;
    percent: number;
  };
}

export interface TradeHistory {
  trades: Trade[];
  totalTrades: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
}

export interface Trade {
  tradeId: string;
  instrumentId: number;
  instrumentName: string;
  openTime: string;
  closeTime: string;
  direction: 'BUY' | 'SELL';
  openRate: number;
  closeRate: number;
  profit: number;
  profitPercent: number;
  units: number;
  leverage: number;
}

class PortfolioService {
  private static instance: PortfolioService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): PortfolioService {
    if (!PortfolioService.instance) {
      PortfolioService.instance = new PortfolioService();
    }
    return PortfolioService.instance;
  }

  /**
   * Get current portfolio positions
   */
  async getPortfolio(useDemo: boolean = false): Promise<Portfolio> {
    const cacheKey = `portfolio_${useDemo ? 'demo' : 'real'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const endpoint = useDemo
      ? '/api/public/v1/trading/info/demo/portfolio'
      : '/api/public/v1/trading/info/portfolio';

    try {
      const response = await personalAuth.makeRequest<any>(endpoint);

      // Extract portfolio data from clientPortfolio structure
      const clientPortfolio = response.clientPortfolio || {};
      const positions = clientPortfolio.positions || [];
      const availableCash = clientPortfolio.credit || 0; // Cash is in 'credit' field

      // Get unique instrument IDs for fetching current prices
      const instrumentIds = [...new Set(positions.map((p: any) => p.instrumentID))];

      // Fetch current market prices
      let currentPrices: Map<number, number> = new Map();
      if (instrumentIds.length > 0) {
        try {
          const pricesEndpoint = `/api/public/v1/market-data/instruments/history/closing-price?instrumentIDs=${instrumentIds.join(',')}&period=OneDay`;
          const pricesResponse = await personalAuth.makeRequest<any>(pricesEndpoint);

          // Map prices by instrumentId
          if (Array.isArray(pricesResponse)) {
            pricesResponse.forEach((item: any) => {
              if (item.instrumentId && item.officialClosingPrice) {
                currentPrices.set(item.instrumentId, item.officialClosingPrice);
              }
            });
          }
        } catch (error) {
          console.error('Failed to fetch current prices:', error);
        }
      }

      // Fetch instrument details for names, symbols, and logos
      let instrumentDetails: Map<number, any> = new Map();
      if (instrumentIds.length > 0) {
        try {
          const instrumentsEndpoint = `/api/public/v1/market-data/instruments?instrumentIDs=${instrumentIds.join(',')}`;
          const instrumentsResponse = await personalAuth.makeRequest<any>(instrumentsEndpoint);

          if (instrumentsResponse.instrumentDisplayDatas) {
            instrumentsResponse.instrumentDisplayDatas.forEach((inst: any) => {
              if (inst.instrumentID) {
                instrumentDetails.set(inst.instrumentID, {
                  name: inst.instrumentDisplayName || inst.instrumentName || `Asset ${inst.instrumentID}`,
                  symbol: inst.symbolFull || inst.symbol || '',
                  logo: inst.images?.find((img: any) => img.width === 150)?.url ||
                        inst.images?.find((img: any) => img.width === 50)?.url ||
                        inst.images?.[0]?.url || ''
                });
              }
            });
          }
        } catch (error) {
          console.error('Failed to fetch instrument details:', error);
        }
      }

      // Calculate totals with real P&L
      const totalInvested = positions.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Calculate real market value and P&L
      let totalMarketValue = 0;
      let totalProfit = 0;

      positions.forEach((p: any) => {
        const currentPrice = currentPrices.get(p.instrumentID) || p.openRate;
        const marketValue = currentPrice * p.units;
        const profit = marketValue - p.amount;

        totalMarketValue += marketValue;
        totalProfit += profit;
      });

      // Process and normalize positions with current prices and names
      const normalizedPositions = positions.map((p: any) => {
        const currentPrice = currentPrices.get(p.instrumentID) || p.openRate;
        const marketValue = currentPrice * p.units;
        const profit = marketValue - p.amount;
        const profitPercent = p.amount > 0 ? (profit / p.amount) * 100 : 0;
        const details = instrumentDetails.get(p.instrumentID) || {};

        return {
          positionId: String(p.positionID || p.positionId || p.id),
          instrumentId: p.instrumentID || p.instrumentId,
          instrumentName: details.name || `Asset ${p.instrumentID}`,
          symbolFull: details.symbol || '',
          instrumentLogo: details.logo || '',
          direction: p.direction || (p.isBuy ? 'BUY' : 'SELL'),
          leverage: p.leverage || 1,
          units: p.units || 0,
          openRate: p.openRate || 0,
          currentRate: currentPrice,
          marketValue,
          investedAmount: p.amount || 0,
          profit,
          profitPercent,
          openDateTime: p.openDateTime || p.openTime,
          isBuy: p.isBuy !== undefined ? p.isBuy : p.direction === 'BUY',
          isSell: p.isSell !== undefined ? p.isSell : p.direction === 'SELL',
          stopLossRate: p.stopLossRate,
          takeProfitRate: p.takeProfitRate
        };
      });

      // Aggregate positions by instrument
      const aggregatedPositions = this.aggregatePositionsByInstrument(normalizedPositions);

      const totalValue = totalMarketValue + availableCash;
      const cashPercent = totalValue > 0 ? (availableCash / totalValue) * 100 : 0;

      // Process and normalize the response
      const portfolio: Portfolio = {
        totalValue,
        totalInvested,
        totalProfit,
        totalProfitPercent: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
        availableCash,
        cashPercent,
        positions: aggregatedPositions,
        lastUpdated: new Date().toISOString()
      };

      this.setCache(cacheKey, portfolio);
      return portfolio;
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      throw error;
    }
  }

  /**
   * Get profit and loss data
   */
  async getPnL(useDemo: boolean = false): Promise<PnLData> {
    const cacheKey = `pnl_${useDemo ? 'demo' : 'real'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const endpoint = useDemo
      ? '/api/public/v1/trading/info/demo/pnl'
      : '/api/public/v1/trading/info/real/pnl';

    try {
      const response = await personalAuth.makeRequest<any>(endpoint);

      const pnl: PnLData = {
        daily: {
          amount: response.daily?.amount || 0,
          percent: response.daily?.percent || 0
        },
        weekly: {
          amount: response.weekly?.amount || 0,
          percent: response.weekly?.percent || 0
        },
        monthly: {
          amount: response.monthly?.amount || 0,
          percent: response.monthly?.percent || 0
        },
        yearly: {
          amount: response.yearly?.amount || 0,
          percent: response.yearly?.percent || 0
        },
        total: {
          amount: response.total?.amount || 0,
          percent: response.total?.percent || 0
        }
      };

      this.setCache(cacheKey, pnl);
      return pnl;
    } catch (error) {
      console.error('Failed to fetch PnL:', error);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<TradeHistory> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('limit', limit.toString());

    const endpoint = `/api/public/v1/trading/info/trade/history?${params.toString()}`;

    try {
      const response = await personalAuth.makeRequest<any>(endpoint);

      const trades = this.normalizeTrades(response.trades || []);
      const stats = this.calculateTradeStats(trades);

      return {
        trades,
        totalTrades: trades.length,
        winRate: stats.winRate,
        averageProfit: stats.averageProfit,
        averageLoss: stats.averageLoss,
        profitFactor: stats.profitFactor
      };
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
      throw error;
    }
  }

  /**
   * Compare portfolio with census data
   */
  async compareWithCensus(censusData: any): Promise<any> {
    const portfolio = await this.getPortfolio();

    // Calculate overlap with popular investors
    const positionSymbols = new Set(portfolio.positions.map(p => p.instrumentId));
    const censusHoldings = new Set(censusData.topHoldings?.map((h: any) => h.instrumentId) || []);

    const overlap = [...positionSymbols].filter(id => censusHoldings.has(id));
    const unique = [...positionSymbols].filter(id => !censusHoldings.has(id));

    return {
      portfolio: {
        totalPositions: portfolio.positions.length,
        totalValue: portfolio.totalValue,
        cashPercent: portfolio.cashPercent,
        profitPercent: portfolio.totalProfitPercent
      },
      comparison: {
        overlapCount: overlap.length,
        overlapPercent: (overlap.length / portfolio.positions.length) * 100,
        uniquePositions: unique.length,
        uniquePercent: (unique.length / portfolio.positions.length) * 100,
        cashDifference: portfolio.cashPercent - (censusData.averageCashPercent || 0)
      },
      riskAnalysis: {
        portfolioRisk: this.calculateRiskScore(portfolio),
        censusRisk: censusData.averageRiskScore || 0,
        relativeRisk: 'calculating...'
      }
    };
  }

  /**
   * Calculate portfolio metrics
   */
  calculateMetrics(portfolio: Portfolio): any {
    const metrics = {
      diversification: this.calculateDiversification(portfolio),
      concentration: this.calculateConcentration(portfolio),
      leverage: this.calculateAverageLeverage(portfolio),
      winningPositions: portfolio.positions.filter(p => p.profit > 0).length,
      losingPositions: portfolio.positions.filter(p => p.profit < 0).length,
      largestPosition: this.findLargestPosition(portfolio),
      bestPerformer: this.findBestPerformer(portfolio),
      worstPerformer: this.findWorstPerformer(portfolio)
    };

    return metrics;
  }

  // Helper methods
  private calculateCashPercent(response: any): number {
    const total = response.totalValue || 0;
    const cash = response.availableCash || 0;
    return total > 0 ? (cash / total) * 100 : 0;
  }


  private normalizeTrades(trades: any[]): Trade[] {
    return trades.map(t => ({
      tradeId: t.tradeId || t.id,
      instrumentId: t.instrumentId,
      instrumentName: t.instrumentName || t.name,
      openTime: t.openTime,
      closeTime: t.closeTime,
      direction: t.direction || (t.isBuy ? 'BUY' : 'SELL'),
      openRate: t.openRate || 0,
      closeRate: t.closeRate || 0,
      profit: t.profit || 0,
      profitPercent: t.profitPercent || 0,
      units: t.units || 0,
      leverage: t.leverage || 1
    }));
  }

  private calculateTradeStats(trades: Trade[]) {
    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);

    const winRate = trades.length > 0
      ? (winningTrades.length / trades.length) * 100
      : 0;

    const averageProfit = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length
      : 0;

    const averageLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length)
      : 0;

    const profitFactor = averageLoss > 0 ? averageProfit / averageLoss : 0;

    return { winRate, averageProfit, averageLoss, profitFactor };
  }

  private calculateRiskScore(portfolio: Portfolio): number {
    // Simple risk calculation based on leverage, concentration, and cash
    const avgLeverage = this.calculateAverageLeverage(portfolio);
    const concentration = this.calculateConcentration(portfolio);
    const cashScore = Math.max(0, 25 - portfolio.cashPercent) / 25; // Lower cash = higher risk

    return ((avgLeverage - 1) * 20) + (concentration * 30) + (cashScore * 50);
  }

  private calculateDiversification(portfolio: Portfolio): number {
    // Herfindahl-Hirschman Index for concentration
    const totalValue = portfolio.positions.reduce((sum, p) => sum + p.marketValue, 0);
    if (totalValue === 0) return 0;

    const shares = portfolio.positions.map(p => p.marketValue / totalValue);
    const hhi = shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

    return 1 - hhi; // Higher value = more diversified
  }

  private calculateConcentration(portfolio: Portfolio): number {
    if (portfolio.positions.length === 0) return 0;

    const sorted = [...portfolio.positions].sort((a, b) => b.marketValue - a.marketValue);
    const top3Value = sorted.slice(0, 3).reduce((sum, p) => sum + p.marketValue, 0);
    const totalValue = portfolio.positions.reduce((sum, p) => sum + p.marketValue, 0);

    return totalValue > 0 ? top3Value / totalValue : 0;
  }

  private calculateAverageLeverage(portfolio: Portfolio): number {
    if (portfolio.positions.length === 0) return 1;

    const totalLeverage = portfolio.positions.reduce((sum, p) => sum + p.leverage, 0);
    return totalLeverage / portfolio.positions.length;
  }

  private findLargestPosition(portfolio: Portfolio): Position | null {
    if (portfolio.positions.length === 0) return null;
    return [...portfolio.positions].sort((a, b) => b.marketValue - a.marketValue)[0];
  }

  private findBestPerformer(portfolio: Portfolio): Position | null {
    if (portfolio.positions.length === 0) return null;
    return [...portfolio.positions].sort((a, b) => b.profitPercent - a.profitPercent)[0];
  }

  private findWorstPerformer(portfolio: Portfolio): Position | null {
    if (portfolio.positions.length === 0) return null;
    return [...portfolio.positions].sort((a, b) => a.profitPercent - b.profitPercent)[0];
  }

  private getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Aggregate multiple positions of the same instrument
   */
  private aggregatePositionsByInstrument(positions: Position[]): Position[] {
    const aggregated = new Map<number, Position>();

    positions.forEach(pos => {
      const existing = aggregated.get(pos.instrumentId);

      if (existing) {
        // Calculate weighted average open rate
        const totalUnits = existing.units + pos.units;
        const avgOpenRate = (existing.openRate * existing.units + pos.openRate * pos.units) / totalUnits;

        // Aggregate the position
        aggregated.set(pos.instrumentId, {
          ...existing,
          units: totalUnits,
          openRate: avgOpenRate,
          marketValue: existing.marketValue + pos.marketValue,
          investedAmount: existing.investedAmount + pos.investedAmount,
          profit: existing.profit + pos.profit,
          profitPercent: ((existing.profit + pos.profit) / (existing.investedAmount + pos.investedAmount)) * 100,
          positionCount: (existing.positionCount || 1) + 1,
          openDateTime: pos.openDateTime < existing.openDateTime ? pos.openDateTime : existing.openDateTime
        });
      } else {
        aggregated.set(pos.instrumentId, {
          ...pos,
          positionCount: 1
        });
      }
    });

    return Array.from(aggregated.values());
  }
}

export const portfolioService = PortfolioService.getInstance();