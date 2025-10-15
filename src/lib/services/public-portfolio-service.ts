/**
 * Public Portfolio Service
 * Fetches publicly available portfolio data for any eToro username
 * Uses public API endpoints (no personal API keys required)
 */

interface PublicPosition {
  instrumentId: number;
  symbol: string;
  instrumentName: string;
  marketValue: number;
  percentage: number;
}

interface PublicPortfolio {
  positions: PublicPosition[];
  totalValue: number;
  cashBalance: number;
  cashPercent: number;
  totalReturn?: number;
  riskScore?: number;
}

class PublicPortfolioService {
  private static instance: PublicPortfolioService;
  private readonly baseUrl = 'https://www.etoro.com/api/public/v1';

  private constructor() {}

  static getInstance(): PublicPortfolioService {
    if (!PublicPortfolioService.instance) {
      PublicPortfolioService.instance = new PublicPortfolioService();
    }
    return PublicPortfolioService.instance;
  }

  /**
   * Get headers for public API requests (no personal keys needed)
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.ETORO_API_KEY || '',
      'X-USER-KEY': process.env.ETORO_USER_KEY || '',
      'X-REQUEST-ID': '1fea900a-bf1f-4b7c-8af2-976dc6ab273f'
    };
  }

  /**
   * Get public portfolio data for a username
   */
  async getPortfolio(username: string): Promise<PublicPortfolio | null> {
    try {
      console.log(`Fetching public portfolio for username: ${username}`);

      // Fetch public portfolio/live endpoint
      const portfolioResponse = await fetch(
        `${this.baseUrl}/user-info/people/${username}/portfolio/live`,
        { headers: this.getHeaders() }
      );

      if (!portfolioResponse.ok) {
        const errorText = await portfolioResponse.text();
        console.error(`Failed to fetch public portfolio for ${username}:`, errorText);
        return null;
      }

      const portfolioData = await portfolioResponse.json();
      console.log(`Portfolio data received for ${username}:`, {
        hasPositions: !!portfolioData.positions,
        positionsCount: portfolioData.positions?.length || 0
      });

      // Extract positions
      const positions: PublicPosition[] = [];
      let totalValue = 0;

      if (portfolioData.positions && Array.isArray(portfolioData.positions)) {
        for (const pos of portfolioData.positions) {
          const position: PublicPosition = {
            instrumentId: pos.instrumentId || pos.InstrumentID || 0,
            symbol: pos.symbol || pos.ticker || 'N/A',
            instrumentName: pos.instrumentName || pos.name || 'Unknown',
            marketValue: pos.marketValue || pos.value || 0,
            percentage: pos.percentage || pos.allocation || 0
          };

          positions.push(position);
          totalValue += position.marketValue;
        }
      }

      // Calculate cash and totals
      const cashBalance = portfolioData.cashBalance || portfolioData.cash || 0;
      const accountValue = totalValue + cashBalance;
      const cashPercent = accountValue > 0 ? (cashBalance / accountValue) * 100 : 0;

      return {
        positions,
        totalValue,
        cashBalance,
        cashPercent
      };
    } catch (error) {
      console.error(`Failed to fetch public portfolio for ${username}:`, error);
      return null;
    }
  }

  /**
   * Get trade info for a username (includes YTD gain, risk score, trades, win ratio)
   */
  async getTradeInfo(username: string): Promise<any | null> {
    try {
      console.log(`Fetching trade info for username: ${username}`);

      const response = await fetch(
        `${this.baseUrl}/user-info/people/${username}/tradeinfo?period=currYear`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        console.error(`Failed to fetch trade info for ${username}:`, response.status);
        return null;
      }

      const data = await response.json();
      console.log(`Trade info received for ${username}:`, {
        gain: data.gain,
        riskScore: data.riskScore,
        trades: data.trades,
        winRatio: data.winRatio
      });

      return data;
    } catch (error) {
      console.error(`Failed to fetch trade info for ${username}:`, error);
      return null;
    }
  }

  /**
   * Get normalized portfolio data (same structure as realPortfolioService for compatibility)
   */
  async getNormalizedData(username: string): Promise<any> {
    try {
      const [portfolio, tradeInfo] = await Promise.all([
        this.getPortfolio(username),
        this.getTradeInfo(username)
      ]);

      if (!portfolio) {
        throw new Error(`Failed to fetch portfolio for ${username}`);
      }

      // Normalize to match realPortfolioService structure
      const totalAccountValue = portfolio.totalValue + portfolio.cashBalance;

      return {
        totalValue: portfolio.totalValue,
        totalInvested: portfolio.totalValue, // Public API doesn't provide invested amount
        totalProfit: 0, // Cannot calculate without invested amount
        totalReturn: tradeInfo?.gain || 0, // Use YTD gain from tradeInfo
        cashBalance: portfolio.cashBalance,
        cashPercent: portfolio.cashPercent,
        positions: portfolio.positions.map(p => ({
          instrumentId: p.instrumentId,
          symbol: p.symbol,
          instrumentName: p.instrumentName,
          marketValue: p.marketValue,
          investedValue: p.marketValue, // Not available via public API
          profit: 0, // Not available via public API
          profitPercent: 0, // Not available via public API
          units: 0, // Not available via public API
          leverage: 1,
          type: 'Unknown'
        })),
        riskScore: tradeInfo?.riskScore || 5,
        trades: tradeInfo?.trades || 0,
        winRatio: tradeInfo?.winRatio || 0,
        lastUpdated: new Date().toISOString(),
        username
      };
    } catch (error) {
      console.error(`Failed to get normalized portfolio for ${username}:`, error);
      throw error;
    }
  }

  /**
   * Validate username exists and is a valid eToro investor
   */
  async validateUsername(username: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/user-info/people/${username}/tradeinfo?period=currYear`,
        { headers: this.getHeaders() }
      );

      return response.ok;
    } catch (error) {
      console.error(`Failed to validate username ${username}:`, error);
      return false;
    }
  }
}

export const publicPortfolioService = PublicPortfolioService.getInstance();
