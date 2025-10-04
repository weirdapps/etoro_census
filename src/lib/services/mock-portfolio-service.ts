/**
 * Mock Portfolio Service for Testing
 * Generates realistic portfolio data for testing intelligence features
 */

interface MockPosition {
  instrumentId: number;
  symbol: string;
  instrumentName: string;
  units: number;
  marketValue: number;
  investedValue: number;
  profit: number;
  profitPercent: number;
  leverage: number;
  type: string;
}

class MockPortfolioService {
  private static instance: MockPortfolioService;

  private constructor() {}

  static getInstance(): MockPortfolioService {
    if (!MockPortfolioService.instance) {
      MockPortfolioService.instance = new MockPortfolioService();
    }
    return MockPortfolioService.instance;
  }

  /**
   * Generate mock portfolio data
   */
  async getPortfolio(): Promise<any> {
    const positions = this.generateMockPositions();
    const totalValue = 526000; // ~$526K portfolio
    const totalInvested = 480000;
    const totalProfit = totalValue - totalInvested;

    return {
      totalValue,
      totalInvested,
      totalProfit,
      totalProfitPercent: (totalProfit / totalInvested) * 100,
      cashBalance: 52600, // 10% cash
      cashPercent: 10,
      positions,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate portfolio metrics
   */
  calculateMetrics(portfolio: any): any {
    const totalValue = portfolio.totalValue || 526000;
    const totalInvested = portfolio.totalInvested || 480000;
    const totalProfit = totalValue - totalInvested;
    const positions = portfolio.positions || [];

    // Calculate various metrics
    const volatility = 15.2; // Mock 15.2% volatility
    const sharpeRatio = 1.25; // Mock Sharpe ratio
    const maxDrawdown = -12.5; // Mock max drawdown

    // Calculate diversification score (0-100)
    const uniqueAssets = new Set(positions.map((p: any) => p.symbol)).size;
    const diversificationScore = Math.min(100, uniqueAssets * 10);

    return {
      totalValue,
      totalInvested,
      totalProfit,
      totalReturn: (totalProfit / totalInvested) * 100,
      volatility,
      sharpeRatio,
      maxDrawdown,
      diversificationScore,
      positionCount: positions.length,
      winRate: 65, // Mock 65% win rate
      avgWin: 2500,
      avgLoss: -1200,
      profitFactor: 2.08, // avgWin * winRate / (avgLoss * lossRate)
      cashAllocation: portfolio.cashPercent || 10
    };
  }

  /**
   * Generate mock P&L data
   */
  async getPnL(): Promise<any> {
    return {
      daily: {
        amount: 2500,
        percentage: 0.48
      },
      weekly: {
        amount: 8500,
        percentage: 1.65
      },
      monthly: {
        amount: 15000,
        percentage: 2.93
      },
      yearly: {
        amount: 46000,
        percentage: 9.58
      },
      total: {
        amount: 46000,
        percentage: 9.58
      }
    };
  }

  /**
   * Generate mock census data for comparison
   */
  async getCensusData(): Promise<any> {
    return {
      topHoldings: [
        { instrumentId: 1137, symbol: 'NVDA', name: 'NVIDIA', averageAllocation: 8.5 },
        { instrumentId: 1001, symbol: 'AAPL', name: 'Apple', averageAllocation: 7.2 },
        { instrumentId: 1003, symbol: 'MSFT', name: 'Microsoft', averageAllocation: 6.8 },
        { instrumentId: 1155, symbol: 'AMZN', name: 'Amazon', averageAllocation: 5.5 },
        { instrumentId: 1177, symbol: 'GOOGL', name: 'Google', averageAllocation: 4.8 },
        { instrumentId: 1211, symbol: 'TSLA', name: 'Tesla', averageAllocation: 4.2 },
        { instrumentId: 1005, symbol: 'META', name: 'Meta', averageAllocation: 3.8 },
        { instrumentId: 1523, symbol: 'SPY', name: 'SPDR S&P 500 ETF', averageAllocation: 3.5 },
        { instrumentId: 1299, symbol: 'BRK.B', name: 'Berkshire Hathaway', averageAllocation: 2.8 },
        { instrumentId: 1412, symbol: 'JPM', name: 'JPMorgan Chase', averageAllocation: 2.5 }
      ],
      averageCashPercent: 15,
      averageRiskScore: 5.5,
      totalInvestors: 1500,
      fearGreedIndex: 65
    };
  }

  /**
   * Generate mock positions with realistic data
   */
  private generateMockPositions(): MockPosition[] {
    return [
      {
        instrumentId: 1137,
        symbol: 'NVDA',
        instrumentName: 'NVIDIA Corp',
        units: 250,
        marketValue: 105200, // ~20% of portfolio
        investedValue: 85000,
        profit: 20200,
        profitPercent: 23.76,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 1001,
        symbol: 'AAPL',
        instrumentName: 'Apple Inc',
        units: 400,
        marketValue: 68400, // ~13% of portfolio
        investedValue: 62000,
        profit: 6400,
        profitPercent: 10.32,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 1003,
        symbol: 'MSFT',
        instrumentName: 'Microsoft Corp',
        units: 150,
        marketValue: 57850, // ~11% of portfolio
        investedValue: 52000,
        profit: 5850,
        profitPercent: 11.25,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 1155,
        symbol: 'AMZN',
        instrumentName: 'Amazon.com Inc',
        units: 280,
        marketValue: 52640, // ~10% of portfolio
        investedValue: 48000,
        profit: 4640,
        profitPercent: 9.67,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 1211,
        symbol: 'TSLA',
        instrumentName: 'Tesla Inc',
        units: 180,
        marketValue: 47320, // ~9% of portfolio
        investedValue: 51000,
        profit: -3680,
        profitPercent: -7.22,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 1177,
        symbol: 'GOOGL',
        instrumentName: 'Alphabet Inc',
        units: 250,
        marketValue: 42100, // ~8% of portfolio
        investedValue: 38000,
        profit: 4100,
        profitPercent: 10.79,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 1523,
        symbol: 'SPY',
        instrumentName: 'SPDR S&P 500 ETF',
        units: 80,
        marketValue: 36800, // ~7% of portfolio
        investedValue: 34000,
        profit: 2800,
        profitPercent: 8.24,
        leverage: 1,
        type: 'ETF'
      },
      {
        instrumentId: 1005,
        symbol: 'META',
        instrumentName: 'Meta Platforms',
        units: 60,
        marketValue: 31560, // ~6% of portfolio
        investedValue: 28000,
        profit: 3560,
        profitPercent: 12.71,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 2289,
        symbol: 'BTC',
        instrumentName: 'Bitcoin',
        units: 0.5,
        marketValue: 26300, // ~5% of portfolio
        investedValue: 22000,
        profit: 4300,
        profitPercent: 19.55,
        leverage: 2,
        type: 'Crypto'
      },
      {
        instrumentId: 1412,
        symbol: 'JPM',
        instrumentName: 'JPMorgan Chase',
        units: 100,
        marketValue: 21050, // ~4% of portfolio
        investedValue: 19000,
        profit: 2050,
        profitPercent: 10.79,
        leverage: 1,
        type: 'Stock'
      },
      {
        instrumentId: 1477,
        symbol: 'DIS',
        instrumentName: 'Walt Disney Co',
        units: 150,
        marketValue: 15780, // ~3% of portfolio
        investedValue: 17000,
        profit: -1220,
        profitPercent: -7.18,
        leverage: 1,
        type: 'Stock'
      }
    ];
  }
}

export const mockPortfolioService = MockPortfolioService.getInstance();