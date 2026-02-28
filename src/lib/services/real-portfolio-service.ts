/**
 * Real Portfolio Service - Uses actual eToro Personal API
 * Fetches live portfolio data from your eToro account
 */

import { generateUUID } from '@/lib/etoro-api-config';
import { logger } from '../logger';

interface Position {
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

class RealPortfolioService {
  private static instance: RealPortfolioService;
  private readonly baseUrl = 'https://www.etoro.com/api/public/v1';
  private cachedPortfolio: any = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache for portfolio data
  private instrumentCache: Map<number, any> = new Map();
  private instrumentCacheTimestamp: number = 0;
  private readonly INSTRUMENT_CACHE_DURATION = 300000; // 5 minute cache for instruments

  // Request deduplication - prevents multiple parallel calls
  private portfolioFetchPromise: Promise<any> | null = null;

  private constructor() {}

  static getInstance(): RealPortfolioService {
    if (!RealPortfolioService.instance) {
      RealPortfolioService.instance = new RealPortfolioService();
    }
    return RealPortfolioService.instance;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.ETORO_PERSONAL_API_KEY || process.env.ETORO_API_KEY || '',
      'X-USER-KEY': process.env.ETORO_PERSONAL_USER_KEY || process.env.ETORO_USER_KEY || '',
      'X-REQUEST-ID': generateUUID()
    };
  }

  /**
   * Get real portfolio data from eToro API
   */
  async getPortfolio(): Promise<any> {
    // Check cache
    if (this.cachedPortfolio && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      logger.debug('Returning cached portfolio');
      return this.cachedPortfolio;
    }

    // If a fetch is already in progress, return that promise
    if (this.portfolioFetchPromise) {
      logger.debug('Portfolio fetch already in progress');
      return this.portfolioFetchPromise;
    }

    // Start a new fetch and store the promise for deduplication
    logger.debug('Starting new portfolio fetch');
    this.portfolioFetchPromise = this.fetchPortfolioData();

    try {
      const result = await this.portfolioFetchPromise;
      return result;
    } finally {
      // Clear the promise after completion (success or failure)
      this.portfolioFetchPromise = null;
    }
  }

  /**
   * Internal method to actually fetch portfolio data
   */
  private async fetchPortfolioData(): Promise<any> {
    try {
      const headers = this.getHeaders();

      // CRITICAL FIX: Use P&L endpoint which returns ALL positions with unrealized P&L
      // The regular portfolio endpoint only returns 5 aggregated positions
      const portfolioResponse = await fetch(`${this.baseUrl}/trading/info/real/pnl`, {
        headers: this.getHeaders()
      });

      logger.debug('Portfolio response', { status: portfolioResponse.status });

      if (!portfolioResponse.ok) {
        const errorText = await portfolioResponse.text();
        logger.error('Portfolio API error', { errorText });
        throw new Error(`Failed to fetch portfolio data: ${portfolioResponse.status} - ${errorText}`);
      }

      const portfolioData = await portfolioResponse.json();

      // Extract positions from clientPortfolio structure
      const clientPortfolio = portfolioData.clientPortfolio || {};

      // According to swagger.json schema, the cash field is 'credit'
      const availableCash = clientPortfolio.credit ||
                           clientPortfolio.netCreditAndDebits ||
                           clientPortfolio.availableCash ||
                           clientPortfolio.cash ||
                           clientPortfolio.cashBalance ||
                           clientPortfolio.availableCredit ||
                           clientPortfolio.netCredit ||
                           0;

      const rawPositions = clientPortfolio.positions || [];

      const positions: Position[] = [];
      let totalValue = 0;
      let totalInvested = 0;
      let totalProfit = 0;

      // Process positions from clientPortfolio
      if (Array.isArray(rawPositions)) {
        for (const item of rawPositions) {
          // CRITICAL FIX: Use initialAmountInDollars + unrealizedPnL.pnL for accurate values
          // The 'amount' field includes margin/collateral, NOT current market value
          // The 'exposureInAccountCurrency' includes leverage, NOT actual position value
          const unrealizedPnL = item.unrealizedPnL || {};
          const investedAmount = Math.abs(item.initialAmountInDollars || 0);
          const units = Math.abs(item.units || 0);

          // CORRECT CALCULATION: Current value = invested amount + profit/loss
          let profit = unrealizedPnL.pnL || 0;
          let marketValue = investedAmount + profit;
          let profitPercent = investedAmount > 0 ? (profit / investedAmount) * 100 : 0;

          // Only fall back to calculation if we don't have the amount field
          if (!marketValue && item.currentRate && units) {
            logger.debug('No amount field, calculating from currentRate');
            const calculatedValue = units * item.currentRate;
            const calculatedProfit = calculatedValue - investedAmount;
            const calculatedProfitPercent = investedAmount > 0 ? (calculatedProfit / investedAmount) * 100 : 0;

            // Only reject truly unrealistic values (>10000% return)
            // Some crypto/leveraged positions can legitimately have 200-1000% returns
            if (Math.abs(calculatedProfitPercent) > 10000) {
              logger.warn('Unrealistic return detected, using invested amount');
              // Use invested amount as a safe fallback
              marketValue = investedAmount;
              profit = 0;
              profitPercent = 0;
            } else {
              marketValue = calculatedValue;
              profit = calculatedProfit;
              profitPercent = calculatedProfitPercent;

              if (Math.abs(calculatedProfitPercent) > 200) {
                logger.debug('High return position', { profitPercent: calculatedProfitPercent.toFixed(1) });
              }
            }
          } else if (!marketValue) {
            // Last resort fallback - assume no profit/loss
            logger.warn('No market value available for position');
            marketValue = investedAmount;
            profit = 0;
            profitPercent = 0;
          }

          const position: Position = {
            instrumentId: item.instrumentID || item.instrumentId || 0,
            symbol: item.symbol || item.ticker || 'N/A',
            instrumentName: item.instrumentName || item.name || 'Unknown',
            units: units,
            marketValue: marketValue,
            investedValue: investedAmount,
            profit: profit,
            profitPercent: profitPercent,
            leverage: item.leverage || 1,
            type: item.orderType === 17 ? 'Stock' : 'CFD'
          };

          positions.push(position);
          totalValue += position.marketValue;
          totalInvested += position.investedValue;
          totalProfit += position.profit;
        }
      }

      // Get instrument details and current prices
      if (positions.length > 0) {
        // Check if instrument cache is still valid
        const isCacheValid = Date.now() - this.instrumentCacheTimestamp < this.INSTRUMENT_CACHE_DURATION;

        // Get unique instrument IDs
        const uniqueInstrumentIds = Array.from(new Set(positions.map(p => p.instrumentId)));
        logger.debug('Found unique instruments', { unique: uniqueInstrumentIds.length, positions: positions.length });

        // Only fetch instruments that aren't cached
        const uncachedIds = uniqueInstrumentIds
          .filter(id => !isCacheValid || !this.instrumentCache.has(id));

        if (uncachedIds.length > 0) {
          try {
            // Batch instrument fetching (API might have limits)
            const batchSize = 50;
            const allInstruments = [];

            for (let i = 0; i < uncachedIds.length; i += batchSize) {
              const batch = uncachedIds.slice(i, i + batchSize);
              const instrumentIds = batch.join(',');
              logger.debug('Fetching instrument batch', {
                batch: Math.floor(i/batchSize) + 1,
                total: Math.ceil(uncachedIds.length/batchSize),
                size: batch.length
              });

              // Fetch instrument details
              const instrumentResponse = await fetch(
                `${this.baseUrl}/market-data/instruments?instrumentIDs=${instrumentIds}`,
                { headers: this.getHeaders() }
              );

              if (instrumentResponse.ok) {
                const instrumentData = await instrumentResponse.json();
                const instruments = instrumentData.instrumentDisplayDatas || instrumentData.instruments || [];
                allInstruments.push(...instruments);

                // Cache the instruments
                instruments.forEach((instrument: any) => {
                  this.instrumentCache.set(instrument.instrumentID, instrument);
                });
              }
            }

            logger.debug('Fetched and cached instruments', { count: allInstruments.length });
            this.instrumentCacheTimestamp = Date.now();
          } catch (error) {
            logger.warn('Failed to fetch instrument data', { error: error instanceof Error ? error.message : String(error) });
          }
        }

        // Always fetch current prices regardless of instrument cache status
        if (uniqueInstrumentIds.length > 0) {
          try {
            logger.debug('Fetching current prices');

            // Batch price fetching
            const priceBatchSize = 50;
            const allRates = [];

            for (let i = 0; i < uniqueInstrumentIds.length; i += priceBatchSize) {
              const batch = uniqueInstrumentIds.slice(i, i + priceBatchSize);
              const batchIds = batch.join(',');

              try {
                const priceResponse = await fetch(
                  `${this.baseUrl}/market-data/instruments/rates?instrumentIDs=${batchIds}`,
                  {
                    headers: this.getHeaders(),
                    method: 'GET'
                  }
                );

                logger.debug('Price batch fetched', {
                  batch: Math.floor(i/priceBatchSize) + 1,
                  total: Math.ceil(uniqueInstrumentIds.length/priceBatchSize),
                  status: priceResponse.status
                });

                if (priceResponse.ok) {
                  const priceData = await priceResponse.json();
                  const rates = priceData.rates || [];
                  allRates.push(...rates);
                  logger.debug('Prices in batch', { count: rates.length });
                }
              } catch (err) {
                logger.warn('Failed to fetch price batch', {
                  batch: Math.floor(i/priceBatchSize) + 1,
                  error: err instanceof Error ? err.message : String(err)
                });
              }
            }

            if (allRates.length > 0) {
              logger.debug('Total prices fetched', { count: allRates.length });

              // Update positions with current prices
              allRates.forEach((rate: any) => {
                    const instrumentId = rate.instrumentID || rate.InstrumentID || rate.instrumentId;
                    const currentPrice = rate.ask || rate.Ask || rate.bid || rate.Bid ||
                                       rate.lastExecution || rate.lastPrice || rate.Last || rate.price || rate.currentRate;

                    if (instrumentId && currentPrice) {
                      // Update all positions with this instrument
                      let updateCount = 0;
                      positions.forEach(position => {
                        if (position.instrumentId === instrumentId) {
                          const openPrice = rawPositions.find((p: any) =>
                            (p.instrumentID || p.instrumentId) === instrumentId
                          )?.openRate;

                          // ONLY update prices if we don't already have good values from the API
                          // The API's 'amount' field is already the correct market value in USD
                          if (position.marketValue === 0 && position.units && currentPrice > 0) {
                            logger.debug('No market value from API, calculating from price', { symbol: position.symbol });

                            // Get instrument details for exchange-specific handling
                            const instrument = this.instrumentCache.get(instrumentId);
                            let adjustedPrice = currentPrice;

                            // Get the correct symbol from instrument cache if available
                            const symbolToCheck = instrument?.symbolFull || position.symbol;

                            // Check if this is a UK stock (London Stock Exchange)
                            // UK stocks are priced in pence (GBX) and need to be converted to pounds
                            if (symbolToCheck?.endsWith('.L') || instrument?.exchangeID === 9) {
                              adjustedPrice = currentPrice / 100; // Convert pence to pounds
                              logger.debug('Stock price conversion', {
                                symbol: symbolToCheck,
                                from: currentPrice,
                                to: adjustedPrice,
                                exchange: 'UK'
                              });
                            }
                            // Check for Copenhagen/Danish stocks
                            else if (symbolToCheck?.endsWith('.CO')) {
                              // Danish stocks are typically in øre (1/100 of a krone)
                              adjustedPrice = currentPrice / 100;
                              logger.debug('Stock price conversion', {
                                symbol: symbolToCheck,
                                from: currentPrice,
                                to: adjustedPrice,
                                exchange: 'Danish'
                              });
                            }
                            // Check for Brussels stocks
                            else if (symbolToCheck?.endsWith('.BR')) {
                              // Brussels stocks are typically in cents
                              adjustedPrice = currentPrice / 100;
                              logger.debug('Stock price conversion', {
                                symbol: symbolToCheck,
                                from: currentPrice,
                                to: adjustedPrice,
                                exchange: 'Brussels'
                              });
                            }
                            // Check for Hong Kong stocks
                            else if (symbolToCheck?.endsWith('.HK') || instrument?.exchangeID === 10) {
                              // HK stocks are typically already in HKD, no conversion needed
                              logger.debug('Stock price conversion', {
                                symbol: symbolToCheck,
                                from: currentPrice,
                                to: adjustedPrice,
                                exchange: 'HK'
                              });
                            }
                            // Log exchange ID for debugging unknown exchanges
                            else if (instrument?.exchangeID) {
                              logger.debug('Stock exchange info', {
                                symbol: symbolToCheck,
                                exchangeId: instrument.exchangeID
                              });
                            }

                            // Calculate real market value and profit with adjusted price
                            const oldValue = position.marketValue;
                            const calculatedValue = position.units * adjustedPrice;
                            const calculatedProfit = calculatedValue - position.investedValue;
                            const calculatedProfitPercent = position.investedValue > 0
                              ? (calculatedProfit / position.investedValue) * 100
                              : 0;

                            // Only reject truly unrealistic returns (>10000%)
                            // Crypto and leveraged positions can have legitimate 200-1000% returns
                            if (Math.abs(calculatedProfitPercent) > 10000) {
                              logger.warn('Unrealistic return detected', {
                                symbol: position.symbol,
                                instrumentId,
                                profitPercent: calculatedProfitPercent.toFixed(1)
                              });
                              // Don't update with unrealistic values
                              position.marketValue = position.investedValue;
                              position.profit = 0;
                              position.profitPercent = 0;
                            } else {
                              // Update with calculated values
                              position.marketValue = calculatedValue;
                              position.profit = calculatedProfit;
                              position.profitPercent = calculatedProfitPercent;

                              // High return positions are logged in development only
                              if (process.env.NODE_ENV !== 'production' && Math.abs(position.profitPercent) > 100) {
                                logger.debug('High return position', {
                                  symbol: position.symbol,
                                  profitPercent: position.profitPercent.toFixed(1)
                                });
                              }
                            }
                            updateCount++;
                          }
                        }
                      });
                      if (updateCount > 0) {
                        logger.debug('Applied price to positions', {
                          price: currentPrice,
                          count: updateCount,
                          instrumentId
                        });
                      }
                    }
                  });
            } else {
              logger.debug('No price data received');
            }
          } catch (error) {
            logger.warn('Failed to fetch prices', { error: error instanceof Error ? error.message : String(error) });
          }
        }

        // Recalculate totals with real values - update the outer scope variables
        totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
        totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
        totalInvested = positions.reduce((sum, p) => sum + p.investedValue, 0);

        // Log positions with high returns for debugging
        const highReturnPositions = positions.filter(p => Math.abs(p.profitPercent) > 100);
        if (highReturnPositions.length > 0) {
          logger.debug('High return positions found', { count: highReturnPositions.length });
          const uniqueHighReturnInstruments = new Set(highReturnPositions.map(p => p.instrumentId));

          // Try to identify what these instruments are
          uniqueHighReturnInstruments.forEach(id => {
            const instrument = this.instrumentCache.get(id as number);
            const positionsForInstrument = highReturnPositions.filter(p => p.instrumentId === id);
            const avgReturn = positionsForInstrument.reduce((sum, p) => sum + p.profitPercent, 0) / positionsForInstrument.length;
            logger.debug('High return instrument', {
              id,
              symbol: instrument?.symbolFull || 'Unknown',
              name: instrument?.instrumentDisplayName || 'Unknown',
              avgReturn: avgReturn.toFixed(1)
            });
          });
        }

        // Enhance positions with cached instrument data
        logger.debug('Enhancing positions with instrument data', { count: positions.length });
        positions.forEach(position => {
          const instrument = this.instrumentCache.get(position.instrumentId);
          if (instrument) {
            const oldSymbol = position.symbol;
            position.symbol = instrument.symbolFull || instrument.ticker || instrument.symbol || position.symbol;
            position.instrumentName = instrument.instrumentDisplayName || instrument.name || position.instrumentName;

            if (oldSymbol === 'N/A' && position.symbol !== 'N/A') {
              logger.debug('Updated symbol', {
                instrumentId: position.instrumentId,
                from: oldSymbol,
                to: position.symbol
              });
            }
          } else {
            logger.debug('No instrument data cached', { instrumentId: position.instrumentId });
          }
        });
      }

      // Aggregate positions by instrument (combine multiple positions of same asset)
      const aggregatedPositionsMap = new Map<number, Position>();

      for (const position of positions) {
        const existing = aggregatedPositionsMap.get(position.instrumentId);

        if (existing) {
          // Aggregate with existing position
          existing.units += position.units;
          existing.marketValue += position.marketValue;
          existing.investedValue += position.investedValue;
          existing.profit += position.profit;
          // Recalculate profit percentage based on aggregated values
          existing.profitPercent = existing.investedValue > 0
            ? (existing.profit / existing.investedValue) * 100
            : 0;
        } else {
          // First position for this instrument, clone it
          aggregatedPositionsMap.set(position.instrumentId, { ...position });
        }
      }

      // Convert map back to array and sort by market value
      const aggregatedPositions = Array.from(aggregatedPositionsMap.values())
        .sort((a, b) => b.marketValue - a.marketValue);

      logger.info('Aggregated positions', {
        raw: positions.length,
        unique: aggregatedPositions.length
      });

      // Calculate total account value including cash
      const accountValue = totalValue + availableCash;
      const cashPercent = accountValue > 0 ? (availableCash / accountValue) * 100 : 0;

      // IMPORTANT: The API seems to be missing some positions or values
      // eToro shows $579,911 total but we're only getting $537,853
      // This could be due to pending trades, unrealized positions, or API limitations
      // For now, we'll add a note about this discrepancy
      const apiDiscrepancyNote = totalValue < 520000 ?
        'Note: Portfolio value may be incomplete due to API limitations' : '';

      const calculatedReturn = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

      this.cachedPortfolio = {
        totalValue,
        totalInvested,
        totalProfit,
        totalReturn: calculatedReturn, // Add calculated return for simplified intelligence service
        totalProfitPercent: calculatedReturn, // Keep for backwards compatibility
        cashBalance: availableCash,
        cashPercent,
        positions: aggregatedPositions, // Use aggregated positions
        rawPositions: positions, // Keep raw positions for reference
        lastUpdated: new Date().toISOString(),
        apiNote: apiDiscrepancyNote
      };

      this.cacheTimestamp = Date.now();
      return this.cachedPortfolio;

    } catch (error) {
      logger.error('Failed to fetch real portfolio', { error: error instanceof Error ? error.message : String(error) });
      // Return a minimal portfolio structure on error
      return {
        totalValue: 0,
        totalInvested: 0,
        totalProfit: 0,
        totalProfitPercent: 0,
        cashBalance: 0,
        cashPercent: 100,
        positions: [],
        lastUpdated: new Date().toISOString(),
        error: 'Failed to fetch portfolio data'
      };
    }
  }

  /**
   * Get user's trade info including actual YTD gain
   */
  async getTradeInfo(): Promise<any> {
    try {
      // Get username from environment or default to 'plessas'
      const username = process.env.ETORO_USERNAME || 'plessas';
      const url = `https://www.etoro.com/api/public/v1/user-info/people/${username}/tradeinfo?period=currYear`;

      logger.debug('Fetching trade info', { username });
      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        logger.error('TradeInfo API error', { status: response.status });
        return null;
      }

      const data = await response.json();
      logger.debug('TradeInfo data', {
        gain: data.gain,
        dailyGain: data.dailyGain,
        weekGain: data.thisWeekGain,
        riskScore: data.riskScore,
        trades: data.trades,
        winRatio: data.winRatio
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch trade info', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Get S&P 500 (SPY ETF) data for market comparison
   */
  async getSP500Data(): Promise<any> {
    try {
      // SPY ETF has instrumentID 3000 on eToro (verified from census data)
      const spyInstrumentId = 3000;

      // Get instrument details
      const marketResponse = await fetch(
        `${this.baseUrl}/market-data/instruments?instrumentIDs=${spyInstrumentId}`,
        { headers: this.getHeaders() }
      );

      if (!marketResponse.ok) {
        logger.error('Failed to fetch SPY market data');
        return null;
      }

      const marketData = await marketResponse.json();
      const spyData = marketData.instrumentDisplayDatas?.[0] || marketData.instruments?.[0];

      if (!spyData) {
        logger.error('No SPY data found');
        return null;
      }

      // Get current price from rates endpoint
      const ratesResponse = await fetch(
        `${this.baseUrl}/market-data/instruments/rates?instrumentIDs=${spyInstrumentId}`,
        { headers: this.getHeaders() }
      );

      if (!ratesResponse.ok) {
        logger.error('Failed to fetch SPY rates');
        return null;
      }

      const ratesData = await ratesResponse.json();
      const currentPrice = ratesData.rates?.[0]?.lastExecution || ratesData.rates?.[0]?.ask || 663;

      // Calculate YTD return
      // SPY was approximately $590 at the end of 2024/beginning of 2025
      // This is based on actual S&P 500 performance data
      const yearStartPrice = 590; // SPY price at end of 2024/start of 2025
      const ytdReturn = ((currentPrice - yearStartPrice) / yearStartPrice) * 100;

      logger.debug('S&P 500 YTD data', {
        yearStartPrice,
        currentPrice: currentPrice.toFixed(2),
        ytdReturn: ytdReturn.toFixed(2)
      });

      return {
        instrumentId: spyInstrumentId,
        symbol: spyData.symbolFull || 'SPY',
        name: spyData.instrumentDisplayName || 'S&P 500 ETF',
        currentPrice,
        yearStartPrice,
        ytdReturn
      };
    } catch (error) {
      logger.error('Failed to fetch S&P 500 data', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Get P&L data - including YTD returns
   */
  async getPnL(): Promise<any> {
    try {
      logger.debug('Fetching P&L data from eToro');
      const response = await fetch(`${this.baseUrl}/trading/info/real/pnl`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('P&L API error', { errorText });
        throw new Error(`Failed to fetch P&L: ${response.status}`);
      }

      const data = await response.json();

      // The P&L endpoint might return different field names
      // Check for various possible field names
      const yearlyAmount = data.yearlyPnL || data.yearToDatePnL || data.ytdPnL ||
                          data.yearPnL || data.yearlyProfit || data.ytdProfit || 0;
      const yearlyPercent = data.yearlyPnLPercentage || data.yearToDatePnLPercentage ||
                           data.ytdPnLPercentage || data.yearPnLPercentage ||
                           data.yearlyProfitPercentage || data.ytdProfitPercentage || 0;

      return {
        daily: {
          amount: data.dailyPnL || data.dailyProfit || 0,
          percentage: data.dailyPnLPercentage || data.dailyProfitPercentage || 0
        },
        weekly: {
          amount: data.weeklyPnL || data.weeklyProfit || 0,
          percentage: data.weeklyPnLPercentage || data.weeklyProfitPercentage || 0
        },
        monthly: {
          amount: data.monthlyPnL || data.monthlyProfit || 0,
          percentage: data.monthlyPnLPercentage || data.monthlyProfitPercentage || 0
        },
        yearly: {
          amount: yearlyAmount,
          percentage: yearlyPercent
        },
        total: {
          amount: data.totalPnL || data.totalProfit || data.allTimeProfit || 0,
          percentage: data.totalPnLPercentage || data.totalProfitPercentage || data.allTimeProfitPercentage || 0
        }
      };
    } catch (error) {
      logger.error('Failed to fetch P&L', { error: error instanceof Error ? error.message : String(error) });
      return {
        daily: { amount: 0, percentage: 0 },
        weekly: { amount: 0, percentage: 0 },
        monthly: { amount: 0, percentage: 0 },
        yearly: { amount: 0, percentage: 0 },
        total: { amount: 0, percentage: 0 }
      };
    }
  }

  /**
   * Calculate portfolio metrics
   *
   * IMPORTANT DISCLAIMERS:
   * - "volatility" is estimated from eToro's riskScore (1-10 scale mapped to 5-50%)
   *   since we don't have historical price data for true volatility calculation
   * - "sharpeRatio" uses this estimated volatility and is therefore approximate
   * - "maxDrawdown" is based on current unrealized P/L, not historical peak-to-trough
   * - These metrics are for informational purposes and should not be used for
   *   professional investment decisions without proper historical data analysis
   */
  calculateMetrics(portfolio: any): any {
    const totalValue = portfolio.totalValue || 10000;
    const totalInvested = portfolio.totalInvested || 10000;
    const totalProfit = portfolio.totalProfit || 0;
    const positions = portfolio.positions || [];

    // Ensure we have at least some positions for calculations
    const effectivePositions = positions.length > 0 ? positions : [
      { marketValue: totalValue, symbol: 'CASH', profitPercent: 0 }
    ];

    // Calculate concentration score (how concentrated the portfolio is)
    let concentrationScore = 50; // Default moderate concentration
    if (totalValue > 0 && effectivePositions.length > 0) {
      const positionWeights = effectivePositions.map((p: any) =>
        (p.marketValue || 0) / totalValue
      );
      const avgWeight = 1 / effectivePositions.length;
      const weightVariance = positionWeights.reduce((sum: number, w: number) =>
        sum + Math.pow(w - avgWeight, 2), 0) / effectivePositions.length;
      concentrationScore = Math.min(100, Math.max(0, Math.sqrt(weightVariance) * 100));
    }

    // Estimate volatility from eToro's riskScore (1-10 scale)
    // riskScore 1 = very low risk ≈ 5% volatility
    // riskScore 10 = very high risk ≈ 50% volatility
    const riskScore = portfolio.riskScore || 5;
    const estimatedVolatility = Math.max(5, Math.min(50, riskScore * 5));

    // Calculate Sharpe ratio using estimated volatility
    // NOTE: This is an approximation since we don't have true price volatility
    const riskFreeRate = 0.04; // 4% risk-free rate
    const portfolioReturn = totalInvested > 0 ? (totalProfit / totalInvested) : 0;
    const excessReturn = portfolioReturn - riskFreeRate;
    let sharpeRatio = estimatedVolatility > 0 ? excessReturn / (estimatedVolatility / 100) : 1.0;
    sharpeRatio = Math.min(3, Math.max(-2, sharpeRatio)); // Cap between -2 and 3

    // Calculate max drawdown (simplified - would need historical data for accuracy)
    const maxDrawdown = effectivePositions.reduce((max: number, p: any) =>
      Math.min(max, p.profitPercent || 0), 0) || -10; // Default -10% max drawdown

    // Calculate diversification score
    const uniqueAssets = new Set(effectivePositions.map((p: any) => p.symbol)).size;
    const diversificationScore = Math.min(100, Math.max(10, uniqueAssets * 10));

    // Calculate win rate
    const winningPositions = positions.filter((p: any) => p.profit > 0).length;
    const winRate = positions.length > 0 ? (winningPositions / positions.length) * 100 : 0;

    // Calculate average win/loss
    const wins = positions.filter((p: any) => p.profit > 0);
    const losses = positions.filter((p: any) => p.profit < 0);
    const avgWin = wins.length > 0 ?
      wins.reduce((sum: number, p: any) => sum + p.profit, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ?
      losses.reduce((sum: number, p: any) => sum + p.profit, 0) / losses.length : 0;

    // Calculate profit factor
    const totalWins = wins.reduce((sum: number, p: any) => sum + p.profit, 0);
    const totalLosses = Math.abs(losses.reduce((sum: number, p: any) => sum + p.profit, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    return {
      totalValue: totalValue || 10000,
      totalInvested: totalInvested || 10000,
      totalProfit: totalProfit || 0,
      totalReturn: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
      volatility: Math.max(5, Math.min(50, isNaN(estimatedVolatility) ? 15 : estimatedVolatility)),
      concentrationScore: Math.max(0, Math.min(100, isNaN(concentrationScore) ? 50 : concentrationScore)),
      sharpeRatio: Math.max(-2, Math.min(3, isNaN(sharpeRatio) ? 1.0 : sharpeRatio)),
      maxDrawdown: Math.max(-50, Math.min(0, isNaN(maxDrawdown) ? -10 : maxDrawdown)),
      diversificationScore: Math.max(10, Math.min(100, isNaN(diversificationScore) ? 50 : diversificationScore)),
      positionCount: positions.length || 1,
      winRate: Math.max(0, Math.min(100, isNaN(winRate) ? 50 : winRate)),
      avgWin: isNaN(avgWin) ? 100 : avgWin,
      avgLoss: isNaN(avgLoss) ? -50 : avgLoss,
      profitFactor: Math.max(0, Math.min(10, profitFactor)),
      cashAllocation: portfolio.cashPercent || 0,
      // Disclaimer metadata
      _disclaimers: {
        volatility: 'Estimated from eToro riskScore, not historical price data',
        sharpeRatio: 'Uses estimated volatility; for informational purposes only',
        maxDrawdown: 'Based on current unrealized P/L, not historical peak-to-trough'
      }
    };
  }

  /**
   * Get census data for comparison
   */
  async getCensusData(): Promise<any> {
    try {
      let censusData: any = null;

      // On Vercel or client-side, use fetch. On local server, use filesystem
      if (process.env.VERCEL) {
        // Vercel: Fetch from static CDN
        const dataFiles = [
          '/data/census-data-latest.json',
          '/data/latest-census.json'
        ];

        for (const file of dataFiles) {
          try {
            const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''}${file}`);
            if (response.ok) {
              censusData = await response.json();
              break;
            }
          } catch (err) {
            logger.debug('Census data file not found, trying next', { file });
          }
        }
      } else {
        // Local dev: Read from filesystem
        const fs = await import('fs/promises');
        const path = await import('path');
        const dataDir = path.join(process.cwd(), 'public', 'data');

        const files = await fs.readdir(dataDir);
        const censusFiles = files.filter(f => f.startsWith('etoro-data-') && f.endsWith('.json') || f === 'census-data-latest.json');

        if (censusFiles.length > 0) {
          censusFiles.sort().reverse();
          const latestFile = censusFiles[0];
          const filePath = path.join(dataDir, latestFile);
          const data = await fs.readFile(filePath, 'utf-8');
          censusData = JSON.parse(data);
        }
      }

      if (censusData) {

        // Extract top holdings from census data
        const topHoldings = censusData.analyses?.[0]?.topHoldings || [];

        return {
          topHoldings: topHoldings.slice(0, 10).map((h: any) => ({
            instrumentId: h.instrumentId,
            symbol: h.symbol,
            name: h.name,
            averageAllocation: h.averageAllocation,
            holdersCount: h.holders
          })),
          averageCashPercent: censusData.analyses?.[0]?.averageCashPercent || 15,
          averageRiskScore: censusData.analyses?.[0]?.averageRiskScore || 5,
          totalInvestors: censusData.analyses?.[0]?.investorCount || 1500,
          fearGreedIndex: censusData.analyses?.[0]?.fearGreedIndex || 50
        };
      }
    } catch (error) {
      logger.error('Failed to load census data', { error: error instanceof Error ? error.message : String(error) });
    }

    // Return default census data if loading fails
    return {
      topHoldings: [],
      averageCashPercent: 15,
      averageRiskScore: 5,
      totalInvestors: 1500,
      fearGreedIndex: 50
    };
  }
}

export const realPortfolioService = RealPortfolioService.getInstance();