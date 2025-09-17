export interface InvestorPosition {
  instrumentId: number;
  instrumentName?: string;
  instrumentSymbol?: string;
  instrumentImage?: string;
  allocation: number;
  netProfit: number;
  openDate: string;
  leverage: number;
  isBuy: boolean;
}

export interface InvestorProfile {
  username: string;
  fullName: string;
  avatarUrl?: string;
  country?: string;
  aboutMe?: string;
  isVerified?: boolean;
  isPi?: boolean; // Popular Investor

  // Performance metrics
  gain: number;
  dailyGain: number;
  riskScore: number;
  trades: number;
  winRatio: number;
  copiers: number;

  // Portfolio data
  portfolio: {
    totalValue: number;
    positionsCount: number;
    cashPercentage: number;
    profitLoss: number;
    profitLossPercentage: number;
    positions: InvestorPosition[];
  };

  // Trading statistics from tradeInfo
  tradeInfo?: {
    activeWeeksPct: number;
    avgPosSize: number;
    firstActivity: string;
    lastActivity: string;
    highLeveragePct: number;
    mediumLeveragePct: number;
    lowLeveragePct: number;
    maxDailyRiskScore: number;
    maxMonthlyRiskScore: number;
    peakToValley: number;
    profitableMonthsPct: number;
    profitableWeeksPct: number;
    weeklyDd: number;
    dailyDd: number;
    topTradedInstrumentId?: number;
    countryId?: number;
  };
}

export class InvestorService {
  /**
   * Get detailed information about a specific investor
   */
  static getInvestorProfile(username: string, rawData: any): InvestorProfile | null {
    if (!rawData || !rawData.investors) {
      return null;
    }

    // Find the investor
    const investor = rawData.investors.find((inv: any) => inv.userName === username);
    if (!investor) {
      return null;
    }

    // Convert to Maps if they're serialized objects
    const userDetailsMap = rawData.userDetails instanceof Map
      ? rawData.userDetails
      : new Map(Object.entries(rawData.userDetails || {}));

    const instrumentDetailsMap = rawData.instruments?.details instanceof Map
      ? rawData.instruments.details
      : new Map(Object.entries(rawData.instruments?.details || {}).map(([k, v]) => [parseInt(k), v]));

    // Get user details using Map.get()
    const userDetails = userDetailsMap.get(username);

    // Calculate cash percentage
    let cashPercentage = 100;
    if (investor.portfolio?.positions?.length > 0) {
      const totalInvested = investor.portfolio.positions.reduce(
        (sum: number, p: any) => sum + (p.investmentPct || 0),
        0
      );
      cashPercentage = Math.max(0, 100 - totalInvested);
    }

    // Process positions
    const positions: InvestorPosition[] = [];
    if (investor.portfolio?.positions) {
      for (const position of investor.portfolio.positions) {
        // Find the instrument details using Map.get()
        const instrumentDetails = instrumentDetailsMap.get(position.instrumentId);

        positions.push({
          instrumentId: position.instrumentId,
          instrumentName: instrumentDetails?.instrumentDisplayName || position.instrumentName,
          instrumentSymbol: instrumentDetails?.symbolFull,
          instrumentImage: instrumentDetails?.images?.find((img: any) => img.width === 50)?.uri,
          allocation: position.investmentPct || 0,
          netProfit: position.netProfit || 0,
          openDate: position.openTimestamp,
          leverage: position.leverage || 1,
          isBuy: position.isBuy !== false,
        });
      }
    }

    // Sort positions by allocation
    positions.sort((a, b) => b.allocation - a.allocation);

    return {
      username: investor.userName,
      fullName: investor.fullName || investor.userName,
      avatarUrl: investor.hasAvatar
        ? `https://etoro-cdn.etorostatic.com/avatars/${investor.userName}/150x150.png`
        : undefined,
      country: userDetails?.country,
      aboutMe: userDetails?.aboutMe,
      isVerified: userDetails?.isVerified,
      isPi: userDetails?.isPi,

      // Performance metrics
      gain: investor.gain || 0,
      dailyGain: investor.dailyGain || 0,
      riskScore: investor.riskScore || 0,
      trades: investor.trades || 0,
      winRatio: investor.winRatio || 0,
      copiers: investor.copiers || 0,

      // Portfolio data
      portfolio: {
        totalValue: investor.portfolio?.totalValue || 0,
        positionsCount: investor.portfolio?.positionsCount || 0,
        cashPercentage,
        profitLoss: investor.portfolio?.profitLoss || 0,
        profitLossPercentage: investor.portfolio?.profitLossPercentage || 0,
        positions,
      },

      // Trading statistics
      tradeInfo: investor.tradeInfo ? {
        activeWeeksPct: investor.tradeInfo.activeWeeksPct || 0,
        avgPosSize: investor.tradeInfo.avgPosSize || 0,
        firstActivity: investor.tradeInfo.firstActivity,
        lastActivity: investor.tradeInfo.lastActivity,
        highLeveragePct: investor.tradeInfo.highLeveragePct || 0,
        mediumLeveragePct: investor.tradeInfo.mediumLeveragePct || 0,
        lowLeveragePct: investor.tradeInfo.lowLeveragePct || 0,
        maxDailyRiskScore: investor.tradeInfo.maxDailyRiskScore || 0,
        maxMonthlyRiskScore: investor.tradeInfo.maxMonthlyRiskScore || 0,
        peakToValley: investor.tradeInfo.peakToValley || 0,
        profitableMonthsPct: investor.tradeInfo.profitableMonthsPct || 0,
        profitableWeeksPct: investor.tradeInfo.profitableWeeksPct || 0,
        weeklyDd: investor.tradeInfo.weeklyDd || 0,
        dailyDd: investor.tradeInfo.dailyDd || 0,
        topTradedInstrumentId: investor.tradeInfo.topTradedInstrumentId,
        countryId: investor.tradeInfo.countryId,
      } : undefined,
    };
  }

  /**
   * Get top investors by various metrics
   */
  static getTopInvestors(
    rawData: any,
    metric: 'copiers' | 'gain' | 'trades' | 'winRatio',
    limit: number = 10
  ): any[] {
    if (!rawData || !rawData.investors) {
      return [];
    }

    return rawData.investors
      .filter((inv: any) => inv[metric] !== undefined && inv[metric] !== null)
      .sort((a: any, b: any) => b[metric] - a[metric])
      .slice(0, limit)
      .map((inv: any) => ({
        username: inv.userName,
        fullName: inv.fullName || inv.userName,
        value: inv[metric],
        gain: inv.gain,
        copiers: inv.copiers,
        riskScore: inv.riskScore,
        trades: inv.trades,
        winRatio: inv.winRatio,
      }));
  }

  /**
   * Calculate investor statistics
   */
  static getInvestorStats(rawData: any): any {
    if (!rawData || !rawData.investors) {
      return null;
    }

    const investors = rawData.investors;
    const totalInvestors = investors.length;

    // Calculate averages
    const avgGain = investors.reduce((sum: number, inv: any) => sum + (inv.gain || 0), 0) / totalInvestors;
    const avgRiskScore = investors.reduce((sum: number, inv: any) => sum + (inv.riskScore || 0), 0) / totalInvestors;
    const avgTrades = investors.reduce((sum: number, inv: any) => sum + (inv.trades || 0), 0) / totalInvestors;
    const avgWinRatio = investors.reduce((sum: number, inv: any) => sum + (inv.winRatio || 0), 0) / totalInvestors;
    const avgCopiers = investors.reduce((sum: number, inv: any) => sum + (inv.copiers || 0), 0) / totalInvestors;

    return {
      totalInvestors,
      averages: {
        gain: avgGain,
        riskScore: avgRiskScore,
        trades: avgTrades,
        winRatio: avgWinRatio,
        copiers: avgCopiers,
      },
      topPerformers: {
        byGain: this.getTopInvestors(rawData, 'gain', 5),
        byCopiers: this.getTopInvestors(rawData, 'copiers', 5),
        byTrades: this.getTopInvestors(rawData, 'trades', 5),
        byWinRatio: this.getTopInvestors(rawData, 'winRatio', 5),
      },
    };
  }
}