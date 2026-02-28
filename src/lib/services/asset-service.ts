import { InstrumentDisplayData, InstrumentPriceData } from './instrument-service';
import { UserPosition } from '../models/user-portfolio';
import { logger } from '../logger';

export interface AssetHolder {
  username: string;
  fullName: string;
  avatarUrl?: string;
  allocation: number; // Investment percentage
  gain: number; // YTD gain
  copiers: number;
  riskScore: number;
  position: {
    openDate: string;
    netProfit: number;
    leverage: number;
  };
}

export interface AssetDetails {
  instrumentId: number;
  displayName: string;
  symbol: string;
  imageUrl?: string;
  exchangeId?: number;
  priceSource?: string;
  currentPrice: number;
  returns: {
    yesterday: number;
    weekTD: number;
    monthTD: number;
  };
  holders: AssetHolder[];
  averageAllocation: number;
  totalHolders: number;
  allocationDistribution: { range: string; count: number }[];
}

interface RawDataStructure {
  instruments?: {
    details?: Map<number, InstrumentDisplayData> | Record<string, InstrumentDisplayData>;
    priceData?: Map<number, InstrumentPriceData> | Record<string, InstrumentPriceData>;
  };
  investors?: Array<{
    userName: string;
    fullName?: string;
    hasAvatar?: boolean;
    gain?: number;
    copiers?: number;
    riskScore?: number;
    portfolio?: {
      positions?: UserPosition[];
    };
  }>;
}

export class AssetService {
  /**
   * Get detailed information about a specific asset
   */
  static getAssetDetails(
    instrumentId: number,
    rawData: unknown
  ): AssetDetails | null {
    const data = rawData as RawDataStructure;

    if (!data || !data.instruments || !data.investors) {
      return null;
    }

    // Get instrument details - handle both Map and object formats
    // When stored in sessionStorage, Maps become objects with numeric string keys

    // Convert to Maps if they're serialized objects
    const detailsMap = data.instruments?.details instanceof Map
      ? data.instruments.details
      : new Map(Object.entries(data.instruments?.details || {}).map(([k, v]) => [parseInt(k), v]));

    const priceMap = data.instruments?.priceData instanceof Map
      ? data.instruments.priceData
      : new Map(Object.entries(data.instruments?.priceData || {}).map(([k, v]) => [parseInt(k), v]));

    // Get instrument details using Map.get()
    const instrumentDetails = detailsMap.get(instrumentId);
    const instrumentPrice = priceMap.get(instrumentId);

    if (!instrumentDetails || !instrumentPrice) {
      logger.warn('Asset not found in data', { instrumentId });
      return null;
    }

    // Find all holders of this asset
    const holders: AssetHolder[] = [];
    let totalAllocation = 0;

    for (const investor of data.investors) {
      if (!investor.portfolio?.positions) continue;

      // Find positions for this instrument
      const positions = investor.portfolio.positions.filter(
        (p: UserPosition) => p.instrumentId === instrumentId
      );

      if (positions.length > 0) {
        // Sum allocations if multiple positions
        const totalInvestorAllocation = positions.reduce(
          (sum: number, p: UserPosition) => sum + (p.investmentPct || 0),
          0
        );

        holders.push({
          username: investor.userName,
          fullName: investor.fullName || investor.userName,
          avatarUrl: investor.hasAvatar
            ? `https://etoro-cdn.etorostatic.com/avatars/${investor.userName}/150x150.png`
            : undefined,
          allocation: totalInvestorAllocation,
          gain: investor.gain || 0,
          copiers: investor.copiers || 0,
          riskScore: investor.riskScore || 0,
          position: {
            openDate: positions[0].openTimestamp,
            netProfit: positions.reduce((sum: number, p: UserPosition) => sum + (p.netProfit || 0), 0),
            leverage: positions[0].leverage || 1,
          },
        });

        totalAllocation += totalInvestorAllocation;
      }
    }

    // Sort holders by allocation
    holders.sort((a, b) => b.allocation - a.allocation);

    // Calculate allocation distribution
    const allocationRanges = [
      { range: '0-1%', min: 0, max: 1, count: 0 },
      { range: '1-5%', min: 1, max: 5, count: 0 },
      { range: '5-10%', min: 5, max: 10, count: 0 },
      { range: '10-20%', min: 10, max: 20, count: 0 },
      { range: '20%+', min: 20, max: 100, count: 0 },
    ];

    holders.forEach(holder => {
      const range = allocationRanges.find(
        r => holder.allocation > r.min && holder.allocation <= r.max
      );
      if (range) range.count++;
    });

    return {
      instrumentId,
      displayName: instrumentDetails.instrumentDisplayName || 'Unknown',
      symbol: instrumentDetails.symbolFull || '',
      imageUrl: instrumentDetails.images?.find(img => img.width === 150)?.uri ||
                instrumentDetails.images?.[0]?.uri,
      exchangeId: instrumentDetails.exchangeID,
      priceSource: instrumentDetails.priceSource,
      currentPrice: instrumentPrice.currentPrice || 0,
      returns: instrumentPrice.returns || { yesterday: 0, weekTD: 0, monthTD: 0 },
      holders,
      averageAllocation: holders.length > 0 ? totalAllocation / holders.length : 0,
      totalHolders: holders.length,
      allocationDistribution: allocationRanges.map(r => ({
        range: r.range,
        count: r.count,
      })),
    };
  }

  /**
   * Get top assets by number of holders
   */
  static getTopAssets(rawData: unknown, limit: number = 10): unknown[] {
    const data = rawData as RawDataStructure;

    if (!data || !data.instruments || !data.investors) {
      return [];
    }

    const assetHolderCounts = new Map<number, number>();

    // Count holders for each asset
    for (const investor of data.investors) {
      if (!investor.portfolio?.positions) continue;

      const uniqueInstruments = new Set<number>();
      investor.portfolio.positions.forEach((p: UserPosition) => {
        uniqueInstruments.add(p.instrumentId);
      });

      uniqueInstruments.forEach(instrumentId => {
        assetHolderCounts.set(
          instrumentId,
          (assetHolderCounts.get(instrumentId) || 0) + 1
        );
      });
    }

    // Sort by holder count and return top N
    return Array.from(assetHolderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([instrumentId, holderCount]) => ({
        instrumentId,
        holderCount,
        details: (data.instruments?.details as Record<string, InstrumentDisplayData>)?.[instrumentId],
        priceData: (data.instruments?.priceData as Record<string, InstrumentPriceData>)?.[instrumentId],
      }));
  }
}