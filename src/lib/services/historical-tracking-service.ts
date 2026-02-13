import { supabase, isSupabaseConfigured, createServerClient } from '../supabase/client';
import type { Instrument, CensusSnapshotInsert, HoldingInsert, CensusSnapshot, Holding } from '../supabase/types';
import { logger } from '../logger';

export interface FearGreedHistoryPoint {
  timestamp: string;
  fearGreedIndex: number;
  totalInvestors: number;
  cashComponent?: number;
  riskComponent?: number;
}

export interface HoldingHistoryPoint {
  timestamp: string;
  holdersCount: number;
  holdersPercentage: number;
  averageAllocation: number;
}

export interface HoldingTrend {
  instrumentId: number;
  symbol: string;
  name: string;
  currentHolders: number;
  previousHolders: number;
  change: number;
  changePercent: number;
  momentum: 'rising' | 'falling' | 'stable';
  velocity: number;
  history: HoldingHistoryPoint[];
}

export interface TrendAnalysis {
  fearGreed: {
    current: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    change7d: number;
    change30d: number;
    history: FearGreedHistoryPoint[];
  };
  topMovers: {
    gainers: HoldingTrend[];
    losers: HoldingTrend[];
  };
  marketMomentum: 'risk-on' | 'risk-off' | 'neutral';
}

type CensusSnapshotRow = Pick<CensusSnapshot, 'id' | 'collected_at' | 'fear_greed_index' | 'total_investors' | 'metadata'>;
type HoldingRow = Pick<Holding, 'instrument_id' | 'holders_count' | 'average_allocation' | 'census_id'>;

export class HistoricalTrackingService {
  private getClient() {
    return createServerClient() ?? supabase;
  }

  private getWriteClient() {
    return createServerClient();
  }

  async getFearGreedHistory(days: number = 30): Promise<FearGreedHistoryPoint[]> {
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, historical data unavailable');
      return [];
    }

    const client = this.getClient();
    if (!client) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const { data, error } = await client
        .from('census_snapshots')
        .select('collected_at, fear_greed_index, total_investors, metadata')
        .gte('collected_at', cutoffDate.toISOString())
        .order('collected_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch fear greed history', { error: error.message });
        return [];
      }

      const rows = (data ?? []) as CensusSnapshotRow[];
      return rows.map((row) => ({
        timestamp: row.collected_at,
        fearGreedIndex: row.fear_greed_index ?? 50,
        totalInvestors: row.total_investors,
        cashComponent: (row.metadata as Record<string, number> | null)?.cashComponent,
        riskComponent: (row.metadata as Record<string, number> | null)?.riskComponent,
      }));
    } catch (err) {
      logger.error('Error in getFearGreedHistory', { error: String(err) });
      return [];
    }
  }

  async getHoldingHistory(
    instrumentId: number,
    days: number = 30
  ): Promise<HoldingHistoryPoint[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const client = this.getClient();
    if (!client) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const { data: censusData, error: censusError } = await client
        .from('census_snapshots')
        .select('id, collected_at, total_investors')
        .gte('collected_at', cutoffDate.toISOString())
        .order('collected_at', { ascending: true });

      if (censusError || !censusData) {
        logger.error('Failed to fetch census data for holding history', { error: censusError?.message });
        return [];
      }

      const censusRows = censusData as CensusSnapshotRow[];
      const censusIds = censusRows.map(c => c.id);
      if (censusIds.length === 0) return [];

      const { data: holdingsData, error: holdingsError } = await client
        .from('holdings')
        .select('census_id, holders_count, average_allocation')
        .eq('instrument_id', instrumentId)
        .in('census_id', censusIds);

      if (holdingsError) {
        logger.error('Failed to fetch holding history', { error: holdingsError.message, instrumentId });
        return [];
      }

      const holdingsRows = (holdingsData ?? []) as HoldingRow[];
      const holdingsMap = new Map(holdingsRows.map(h => [h.census_id, h]));

      return censusRows
        .filter(c => holdingsMap.has(c.id))
        .map(c => {
          const holding = holdingsMap.get(c.id)!;
          const totalInvestors = c.total_investors || 1;
          return {
            timestamp: c.collected_at,
            holdersCount: holding.holders_count ?? 0,
            holdersPercentage: ((holding.holders_count ?? 0) / totalInvestors) * 100,
            averageAllocation: holding.average_allocation ?? 0,
          };
        });
    } catch (err) {
      logger.error('Error in getHoldingHistory', { error: String(err) });
      return [];
    }
  }

  async getTopMovers(
    days: number = 7,
    limit: number = 10
  ): Promise<{ gainers: HoldingTrend[]; losers: HoldingTrend[] }> {
    if (!isSupabaseConfigured()) {
      return { gainers: [], losers: [] };
    }

    const client = this.getClient();
    if (!client) return { gainers: [], losers: [] };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const { data: latestCensusData } = await client
        .from('census_snapshots')
        .select('id')
        .order('collected_at', { ascending: false })
        .limit(1)
        .single();

      const latestCensus = latestCensusData as { id: number } | null;
      if (!latestCensus) {
        return { gainers: [], losers: [] };
      }

      const { data: previousCensusData } = await client
        .from('census_snapshots')
        .select('id')
        .lte('collected_at', cutoffDate.toISOString())
        .order('collected_at', { ascending: false })
        .limit(1)
        .single();

      const previousCensus = previousCensusData as { id: number } | null;
      if (!previousCensus) {
        return { gainers: [], losers: [] };
      }

      const [latestHoldingsResult, previousHoldingsResult, instrumentsResult] = await Promise.all([
        client
          .from('holdings')
          .select('instrument_id, holders_count, average_allocation')
          .eq('census_id', latestCensus.id),
        client
          .from('holdings')
          .select('instrument_id, holders_count')
          .eq('census_id', previousCensus.id),
        client.from('instruments').select('id, etoro_instrument_id, symbol, name'),
      ]);

      if (latestHoldingsResult.error || previousHoldingsResult.error || instrumentsResult.error) {
        logger.error('Failed to fetch holdings for comparison');
        return { gainers: [], losers: [] };
      }

      const latestHoldings = (latestHoldingsResult.data ?? []) as HoldingRow[];
      const previousHoldings = (previousHoldingsResult.data ?? []) as HoldingRow[];
      const instruments = (instrumentsResult.data ?? []) as Instrument[];

      const previousMap = new Map(
        previousHoldings.map((h) => [h.instrument_id, h.holders_count ?? 0])
      );
      const instrumentMap = new Map(
        instruments.map((i) => [i.id, { symbol: i.symbol ?? '', name: i.name ?? '' }])
      );

      const trends: HoldingTrend[] = latestHoldings
        .map((h) => {
          const currentHolders = h.holders_count ?? 0;
          const previousHolders = previousMap.get(h.instrument_id) ?? currentHolders;
          const change = currentHolders - previousHolders;
          const changePercent = previousHolders > 0 ? (change / previousHolders) * 100 : 0;
          const velocity = change / days;
          const inst = instrumentMap.get(h.instrument_id) || { symbol: '', name: '' };

          let momentum: 'rising' | 'falling' | 'stable' = 'stable';
          if (changePercent > 5) momentum = 'rising';
          else if (changePercent < -5) momentum = 'falling';

          return {
            instrumentId: h.instrument_id,
            symbol: inst.symbol,
            name: inst.name,
            currentHolders,
            previousHolders,
            change,
            changePercent,
            momentum,
            velocity,
            history: [],
          };
        })
        .filter((t) => t.currentHolders > 10);

      trends.sort((a, b) => b.changePercent - a.changePercent);

      const gainers = trends.filter((t) => t.change > 0).slice(0, limit);
      const losers = trends
        .filter((t) => t.change < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, limit);

      return { gainers, losers };
    } catch (err) {
      logger.error('Error in getTopMovers', { error: String(err) });
      return { gainers: [], losers: [] };
    }
  }

  async getTrendAnalysis(days: number = 30): Promise<TrendAnalysis | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const [fearGreedHistory, topMovers] = await Promise.all([
      this.getFearGreedHistory(days),
      this.getTopMovers(7, 5),
    ]);

    if (fearGreedHistory.length === 0) {
      return null;
    }

    const current = fearGreedHistory[fearGreedHistory.length - 1]?.fearGreedIndex ?? 50;
    const weekAgo = fearGreedHistory[Math.max(0, fearGreedHistory.length - 8)]?.fearGreedIndex ?? current;
    const monthAgo = fearGreedHistory[0]?.fearGreedIndex ?? current;

    const change7d = current - weekAgo;
    const change30d = current - monthAgo;

    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (change7d > 5 && change30d > 0) trend = 'bullish';
    else if (change7d < -5 && change30d < 0) trend = 'bearish';

    let marketMomentum: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
    if (current > 60 && trend === 'bullish') marketMomentum = 'risk-on';
    else if (current < 40 && trend === 'bearish') marketMomentum = 'risk-off';

    return {
      fearGreed: {
        current,
        trend,
        change7d,
        change30d,
        history: fearGreedHistory,
      },
      topMovers,
      marketMomentum,
    };
  }

  async saveCensusSnapshot(
    fearGreedIndex: number,
    totalInvestors: number,
    period: string,
    metadata?: Record<string, unknown>
  ): Promise<number | null> {
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, cannot save snapshot');
      return null;
    }

    const client = this.getWriteClient();
    if (!client) {
      logger.error('Server client not available for write operations');
      return null;
    }

    try {
      const insertData: CensusSnapshotInsert = {
        collected_at: new Date().toISOString(),
        fear_greed_index: fearGreedIndex,
        total_investors: totalInvestors,
        period,
        metadata,
      };

       
      const { data, error } = await (client.from('census_snapshots') as any)
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to save census snapshot', { error: error.message });
        return null;
      }

      const result = data as { id: number } | null;
      return result?.id ?? null;
    } catch (err) {
      logger.error('Error in saveCensusSnapshot', { error: String(err) });
      return null;
    }
  }

  async saveHoldings(
    censusId: number,
    holdings: Array<{
      instrumentId: number;
      holdersCount: number;
      averageAllocation: number;
      yesterdayReturn?: number;
      weekTdReturn?: number;
      monthTdReturn?: number;
    }>
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    const client = this.getWriteClient();
    if (!client) {
      logger.error('Server client not available for write operations');
      return false;
    }

    try {
      const rows: HoldingInsert[] = holdings.map((h) => ({
        census_id: censusId,
        instrument_id: h.instrumentId,
        holders_count: h.holdersCount,
        average_allocation: h.averageAllocation,
        yesterday_return: h.yesterdayReturn,
        week_td_return: h.weekTdReturn,
        month_td_return: h.monthTdReturn,
      }));

       
      const { error } = await (client.from('holdings') as any).insert(rows);

      if (error) {
        logger.error('Failed to save holdings', { error: error.message });
        return false;
      }

      logger.info('Saved holdings snapshot', { censusId, count: holdings.length });
      return true;
    } catch (err) {
      logger.error('Error in saveHoldings', { error: String(err) });
      return false;
    }
  }
}

export const historicalTrackingService = new HistoricalTrackingService();
