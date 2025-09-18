import { UserDetail, UserTradeInfo } from '../models/user';
import { Position } from '../models/user-portfolio';
import { getUserAvatarUrl } from './user-service';
import { InstrumentDisplayData, InstrumentPriceData } from './instrument-service';

export interface InvestorPortfolioPosition {
  instrumentId: number;
  instrumentName?: string;
  instrumentSymbol?: string;
  instrumentImage?: string;
  allocation: number;
  netProfit: number;
  leverage: number;
  isBuy: boolean;
  openDate: string;
}

export interface InvestorPortfolio {
  positions: InvestorPortfolioPosition[];
  positionsCount: number;
  cashPercentage: number;
  profitLossPercentage: number;
}

export interface InvestorProfile {
  username: string;
  fullName: string;
  avatarUrl?: string;
  country?: string;
  aboutMe?: string;
  isVerified: boolean;
  isPi: boolean;
  gain: number;
  copiers: number;
  riskScore: number;
  winRatio: number;
  trades: number;
  portfolio: InvestorPortfolio;
  tradeInfo?: UserTradeInfo;
}

interface RawDataStructure {
  investors?: Array<{
    userName: string;
    fullName?: string;
    hasAvatar?: boolean;
    gain?: number;
    copiers?: number;
    riskScore?: number;
    isVerified?: boolean;
    isPi?: boolean;
    trades?: number;
    winRatio?: number;
    tradeInfo?: UserTradeInfo;
    portfolio?: {
      positions?: Position[];
    };
  }>;
  userDetails?: Map<string, UserDetail> | Record<string, UserDetail>;
  instruments?: {
    details?: Map<number, InstrumentDisplayData> | Record<string, InstrumentDisplayData>;
    priceData?: Map<number, InstrumentPriceData> | Record<string, InstrumentPriceData>;
  };
}

export class InvestorService {
  /**
   * Get detailed investor profile from raw data
   */
  static getInvestorProfile(username: string, rawData: unknown): InvestorProfile | null {
    const data = rawData as RawDataStructure;

    if (!data || !data.investors) {
      return null;
    }

    // Find investor in data
    const investor = data.investors.find(inv => inv.userName === username);
    if (!investor) {
      return null;
    }

    // Get user details for additional info
    const userDetailsMap = data.userDetails instanceof Map
      ? data.userDetails
      : new Map(Object.entries(data.userDetails || {}));

    const userDetail = userDetailsMap.get(username);

    // Calculate portfolio stats
    const portfolio = this.calculatePortfolioStats(investor, data);

    return {
      username: investor.userName,
      fullName: investor.fullName || investor.userName,
      avatarUrl: getUserAvatarUrl(userDetail, investor.hasAvatar, username),
      country: userDetail?.countryName,
      aboutMe: userDetail?.aboutMe,
      isVerified: investor.isVerified || false,
      isPi: investor.isPi || false,
      gain: investor.gain || 0,
      copiers: investor.copiers || 0,
      riskScore: investor.riskScore || 0,
      winRatio: investor.winRatio || 0,
      trades: investor.trades || 0,
      portfolio,
      tradeInfo: investor.tradeInfo
    };
  }

  private static calculatePortfolioStats(
    investor: {
      userName: string;
      fullName?: string;
      hasAvatar?: boolean;
      gain?: number;
      copiers?: number;
      riskScore?: number;
      isVerified?: boolean;
      isPi?: boolean;
      trades?: number;
      winRatio?: number;
      tradeInfo?: UserTradeInfo;
      portfolio?: {
        positions?: Position[];
      };
    },
    rawData: RawDataStructure
  ): InvestorPortfolio {
    const positions: InvestorPortfolioPosition[] = [];
    let totalInvested = 0;
    let totalProfitLoss = 0;

    if (investor.portfolio?.positions) {
      // Get instrument details map
      const instrumentDetailsMap = rawData.instruments?.details instanceof Map
        ? rawData.instruments.details
        : new Map(Object.entries(rawData.instruments?.details || {}).map(([k, v]) => [parseInt(k), v as InstrumentDisplayData]));

      investor.portfolio.positions.forEach((position: Position) => {
        const instrumentDetails = instrumentDetailsMap.get(position.instrumentId);

        totalInvested += position.investmentPct || 0;
        totalProfitLoss += (position.netProfit || 0) * (position.investmentPct || 0) / 100;

        positions.push({
          instrumentId: position.instrumentId,
          instrumentName: instrumentDetails?.instrumentDisplayName,
          instrumentSymbol: instrumentDetails?.symbolFull,
          instrumentImage: instrumentDetails?.images?.find(img => img.width === 50)?.uri ||
                          instrumentDetails?.images?.[0]?.uri,
          allocation: position.investmentPct || 0,
          netProfit: position.netProfit || 0,
          leverage: position.leverage || 1,
          isBuy: position.isBuy !== false,
          openDate: position.openTimestamp
        });
      });
    }

    // Sort positions by allocation
    positions.sort((a, b) => b.allocation - a.allocation);

    const cashPercentage = Math.max(0, 100 - totalInvested);
    const profitLossPercentage = totalInvested > 0 ? totalProfitLoss : 0;

    return {
      positions,
      positionsCount: positions.length,
      cashPercentage,
      profitLossPercentage
    };
  }

  /**
   * Get top investors by various criteria
   */
  static getTopInvestors(
    rawData: unknown,
    sortBy: 'copiers' | 'gain' | 'riskScore' = 'copiers',
    limit: number = 10
  ): InvestorProfile[] {
    const data = rawData as RawDataStructure;

    if (!data || !data.investors) {
      return [];
    }

    const profiles: InvestorProfile[] = [];

    // Get user details map
    const userDetailsMap = data.userDetails instanceof Map
      ? data.userDetails
      : new Map(Object.entries(data.userDetails || {}));

    for (const investor of data.investors) {
      const userDetail = userDetailsMap.get(investor.userName);
      const portfolio = this.calculatePortfolioStats(investor, data);

      profiles.push({
        username: investor.userName,
        fullName: investor.fullName || investor.userName,
        avatarUrl: getUserAvatarUrl(userDetail, investor.hasAvatar, investor.userName),
        country: userDetail?.countryName,
        aboutMe: userDetail?.aboutMe,
        isVerified: investor.isVerified || false,
        isPi: investor.isPi || false,
        gain: investor.gain || 0,
        copiers: investor.copiers || 0,
        riskScore: investor.riskScore || 0,
        winRatio: investor.winRatio || 0,
        trades: investor.trades || 0,
        portfolio,
        tradeInfo: investor.tradeInfo
      });
    }

    // Sort based on criteria
    profiles.sort((a, b) => {
      switch (sortBy) {
        case 'gain':
          return b.gain - a.gain;
        case 'riskScore':
          return a.riskScore - b.riskScore; // Lower is better
        case 'copiers':
        default:
          return b.copiers - a.copiers;
      }
    });

    return profiles.slice(0, limit);
  }

  /**
   * Search investors by various criteria
   */
  static searchInvestors(
    rawData: unknown,
    criteria: {
      minGain?: number;
      maxRiskScore?: number;
      minCopiers?: number;
      hasPositionIn?: number; // instrumentId
    }
  ): InvestorProfile[] {
    const data = rawData as RawDataStructure;

    if (!data || !data.investors) {
      return [];
    }

    const profiles: InvestorProfile[] = [];
    const userDetailsMap = data.userDetails instanceof Map
      ? data.userDetails
      : new Map(Object.entries(data.userDetails || {}));

    for (const investor of data.investors) {
      // Apply filters
      if (criteria.minGain !== undefined && (investor.gain || 0) < criteria.minGain) continue;
      if (criteria.maxRiskScore !== undefined && (investor.riskScore || 0) > criteria.maxRiskScore) continue;
      if (criteria.minCopiers !== undefined && (investor.copiers || 0) < criteria.minCopiers) continue;

      // Check for specific position
      if (criteria.hasPositionIn !== undefined) {
        const hasPosition = investor.portfolio?.positions?.some(
          p => p.instrumentId === criteria.hasPositionIn
        );
        if (!hasPosition) continue;
      }

      const userDetail = userDetailsMap.get(investor.userName);
      const portfolio = this.calculatePortfolioStats(investor, data);

      profiles.push({
        username: investor.userName,
        fullName: investor.fullName || investor.userName,
        avatarUrl: getUserAvatarUrl(userDetail, investor.hasAvatar, investor.userName),
        country: userDetail?.countryName,
        aboutMe: userDetail?.aboutMe,
        isVerified: investor.isVerified || false,
        isPi: investor.isPi || false,
        gain: investor.gain || 0,
        copiers: investor.copiers || 0,
        riskScore: investor.riskScore || 0,
        winRatio: investor.winRatio || 0,
        trades: investor.trades || 0,
        portfolio,
        tradeInfo: investor.tradeInfo
      });
    }

    return profiles;
  }
}