/**
 * Supabase Database Types
 *
 * This file defines the TypeScript types for the Supabase database schema.
 * These types should match the SQL schema defined in the migration files.
 */

export interface Database {
  public: {
    Tables: {
      investors: {
        Row: {
          id: number;
          etoro_customer_id: number;
          username: string;
          full_name: string | null;
          country_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          etoro_customer_id: number;
          username: string;
          full_name?: string | null;
          country_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          etoro_customer_id?: number;
          username?: string;
          full_name?: string | null;
          country_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      census_snapshots: {
        Row: {
          id: number;
          collected_at: string;
          total_investors: number;
          period: string;
          fear_greed_index: number | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: number;
          collected_at: string;
          total_investors: number;
          period: string;
          fear_greed_index?: number | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: number;
          collected_at?: string;
          total_investors?: number;
          period?: string;
          fear_greed_index?: number | null;
          metadata?: Record<string, unknown> | null;
        };
      };
      investor_snapshots: {
        Row: {
          id: number;
          census_id: number;
          investor_id: number;
          copiers: number | null;
          gain: number | null;
          risk_score: number | null;
          cash_percentage: number | null;
          trades: number | null;
          win_ratio: number | null;
        };
        Insert: {
          id?: number;
          census_id: number;
          investor_id: number;
          copiers?: number | null;
          gain?: number | null;
          risk_score?: number | null;
          cash_percentage?: number | null;
          trades?: number | null;
          win_ratio?: number | null;
        };
        Update: {
          id?: number;
          census_id?: number;
          investor_id?: number;
          copiers?: number | null;
          gain?: number | null;
          risk_score?: number | null;
          cash_percentage?: number | null;
          trades?: number | null;
          win_ratio?: number | null;
        };
      };
      instruments: {
        Row: {
          id: number;
          etoro_instrument_id: number;
          symbol: string | null;
          name: string | null;
          image_url: string | null;
          instrument_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          etoro_instrument_id: number;
          symbol?: string | null;
          name?: string | null;
          image_url?: string | null;
          instrument_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          etoro_instrument_id?: number;
          symbol?: string | null;
          name?: string | null;
          image_url?: string | null;
          instrument_type?: string | null;
          created_at?: string;
        };
      };
      holdings: {
        Row: {
          id: number;
          census_id: number;
          instrument_id: number;
          holders_count: number | null;
          average_allocation: number | null;
          yesterday_return: number | null;
          week_td_return: number | null;
          month_td_return: number | null;
        };
        Insert: {
          id?: number;
          census_id: number;
          instrument_id: number;
          holders_count?: number | null;
          average_allocation?: number | null;
          yesterday_return?: number | null;
          week_td_return?: number | null;
          month_td_return?: number | null;
        };
        Update: {
          id?: number;
          census_id?: number;
          instrument_id?: number;
          holders_count?: number | null;
          average_allocation?: number | null;
          yesterday_return?: number | null;
          week_td_return?: number | null;
          month_td_return?: number | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

/**
 * Helper types for easier access
 */
export type Investor = Database['public']['Tables']['investors']['Row'];
export type InvestorInsert = Database['public']['Tables']['investors']['Insert'];
export type CensusSnapshot = Database['public']['Tables']['census_snapshots']['Row'];
export type CensusSnapshotInsert = Database['public']['Tables']['census_snapshots']['Insert'];
export type InvestorSnapshot = Database['public']['Tables']['investor_snapshots']['Row'];
export type InvestorSnapshotInsert = Database['public']['Tables']['investor_snapshots']['Insert'];
export type Instrument = Database['public']['Tables']['instruments']['Row'];
export type InstrumentInsert = Database['public']['Tables']['instruments']['Insert'];
export type Holding = Database['public']['Tables']['holdings']['Row'];
export type HoldingInsert = Database['public']['Tables']['holdings']['Insert'];
