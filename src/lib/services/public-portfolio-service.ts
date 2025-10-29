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
   * Get headers for public API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.ETORO_PERSONAL_API_KEY || process.env.ETORO_API_KEY || '',
      'X-USER-KEY': process.env.ETORO_PERSONAL_USER_KEY || process.env.ETORO_USER_KEY || '',
      'X-REQUEST-ID': '1fea900a-bf1f-4b7c-8af2-976dc6ab273f'
    };
  }

  /**
   * Common instrument ID to symbol mapping (for quick lookup)
   */
  private getSymbolFromId(instrumentId: number): string {
    const commonMappings: Record<number, string> = {
      1001: 'AAPL', 1003: 'META', 1004: 'MSFT', 1005: 'AMZN', 1011: 'BAC',
      1023: 'JPM', 1024: 'KO', 1030: 'T', 1041: 'MA', 1111: 'TSLA',
      1127: 'NFLX', 1135: 'ORCL', 1137: 'NVDA', 1202: 'SAP.DE', 1211: 'BMW.DE',
      1526: 'DE', 1528: 'CI', 1661: 'BLK', 1739: 'KKR', 2171: 'SHEL.L',
      2339: '0700.HK', 2380: '01211.HK', 2402: '9988.HK', 3025: 'GLD',
      3246: 'UVXY', 3653: 'MRK.DE', 4236: 'AVGO', 4310: 'GPN', 4481: 'TSM',
      6434: 'GOOGL', 6473: 'MSTR', 10651: 'LYXGRE.DE', 12200: 'ETOR',
      100000: 'BTC', 100001: 'ETH', 100003: 'XRP', 100017: 'ADA',
      100040: 'LINK', 100061: 'HBAR', 100063: 'SOL',
      1832: 'AMD', 2444: 'PLTR', 100091: 'DOGE', 4486: 'COIN'
    };
    return commonMappings[instrumentId] || `ID${instrumentId}`;
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


      // Extract and AGGREGATE positions by instrumentId
      // Note: Public API returns investmentPct (percentage of portfolio), not dollar values
      // The API returns multiple entries for the same instrument (different trades), so we need to aggregate
      const positionsMap = new Map<number, PublicPosition>();
      let totalInvestedPct = 0;

      if (portfolioData.positions && Array.isArray(portfolioData.positions)) {
        for (const pos of portfolioData.positions) {
          // investmentPct is already in percentage form (e.g., 1.8014 = 1.8%)
          const investmentPct = pos.investmentPct || 0;
          const instrumentId = pos.instrumentId || pos.InstrumentID || 0;

          if (instrumentId > 0) {
            const existing = positionsMap.get(instrumentId);
            if (existing) {
              // Aggregate: sum the investment percentages
              existing.marketValue += investmentPct;
              existing.percentage += investmentPct;
            } else {
              // New instrument
              positionsMap.set(instrumentId, {
                instrumentId,
                symbol: this.getSymbolFromId(instrumentId),
                instrumentName: pos.instrumentName || pos.name || this.getSymbolFromId(instrumentId),
                marketValue: investmentPct,
                percentage: investmentPct
              });
            }
            totalInvestedPct += investmentPct;
          }
        }
      }

      const positions: PublicPosition[] = Array.from(positionsMap.values());

      // Calculate cash percentage (what's left after all positions)
      const realizedCreditPct = portfolioData.realizedCreditPct || 0;
      const unrealizedCreditPct = portfolioData.unrealizedCreditPct || 0;
      const cashPercent = Math.max(0, 100 - totalInvestedPct);

      // For display purposes, use normalized percentages as "value"
      const totalValue = 100; // Represents 100% of portfolio
      const cashBalance = cashPercent;

      // Sort positions by percentage (largest first)
      positions.sort((a, b) => b.percentage - a.percentage);

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

      // Fetch instrument details to get actual ticker symbols
      const instrumentIds = [...new Set(portfolio.positions.map(p => p.instrumentId).filter(id => id > 0))];

      if (instrumentIds.length > 0) {
        try {
          const batchSize = 50;
          const instrumentMap = new Map<number, {symbol: string, name: string}>();

          for (let i = 0; i < instrumentIds.length; i += batchSize) {
            const batch = instrumentIds.slice(i, i + batchSize);
            const url = `https://www.etoro.com/api/public/v1/market-data/instruments?instrumentIDs=${batch.join(',')}`;

            const response = await fetch(url, { headers: this.getHeaders() });

            if (response.ok) {
              const data = await response.json();

              // The API can return data in different formats
              let instrumentsData = null;
              if (data.instrumentDisplayDatas && Array.isArray(data.instrumentDisplayDatas)) {
                instrumentsData = data.instrumentDisplayDatas;
              } else if (data.instruments && Array.isArray(data.instruments)) {
                instrumentsData = data.instruments;
              } else if (data.data && Array.isArray(data.data)) {
                instrumentsData = data.data;
              }

              if (instrumentsData && instrumentsData.length > 0) {
                for (const inst of instrumentsData) {
                  const instId = inst.instrumentID || inst.InstrumentID || inst.instrumentId;
                  instrumentMap.set(instId, {
                    symbol: inst.symbolFull || inst.symbol || inst.Symbol || `ID${instId}`,
                    name: inst.instrumentDisplayName || inst.name || inst.Name || 'Unknown'
                  });
                }
              }
            }

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < instrumentIds.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          // Update positions with actual symbols
          for (const pos of portfolio.positions) {
            const instData = instrumentMap.get(pos.instrumentId);
            if (instData) {
              pos.symbol = instData.symbol;
              pos.instrumentName = instData.name;
            }
          }
        } catch (error) {
          console.error('Failed to fetch instrument symbols:', error);
          // Continue with IDs if fetching fails
        }
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
      const url = `${this.baseUrl}/user-info/people/${username}/tradeinfo?period=currYear`;
      const headers = this.getHeaders();

      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error(`Failed to validate username ${username}: ${response.status}`);
      }

      return response.ok;
    } catch (error) {
      console.error(`Failed to validate username ${username}:`, error);
      return false;
    }
  }
}

export const publicPortfolioService = PublicPortfolioService.getInstance();
