-- eToro Census Database Schema
-- Initial migration: Core tables for historical data storage

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- INVESTORS TABLE
-- ============================================
-- Stores unique investor identities
CREATE TABLE IF NOT EXISTS investors (
  id SERIAL PRIMARY KEY,
  etoro_customer_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(200),
  country_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up by eToro customer ID
CREATE INDEX IF NOT EXISTS idx_investors_customer_id ON investors(etoro_customer_id);
CREATE INDEX IF NOT EXISTS idx_investors_username ON investors(username);

-- ============================================
-- CENSUS SNAPSHOTS TABLE
-- ============================================
-- Stores metadata for each daily census run
CREATE TABLE IF NOT EXISTS census_snapshots (
  id SERIAL PRIMARY KEY,
  collected_at TIMESTAMPTZ NOT NULL,
  total_investors INTEGER NOT NULL,
  period VARCHAR(20) NOT NULL DEFAULT 'CurrYear',
  fear_greed_index DECIMAL(5,2),
  metadata JSONB,
  UNIQUE(collected_at)
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_census_snapshots_date ON census_snapshots(collected_at DESC);

-- ============================================
-- INVESTOR SNAPSHOTS TABLE
-- ============================================
-- Stores daily snapshot data for each investor
CREATE TABLE IF NOT EXISTS investor_snapshots (
  id SERIAL PRIMARY KEY,
  census_id INTEGER NOT NULL REFERENCES census_snapshots(id) ON DELETE CASCADE,
  investor_id INTEGER NOT NULL REFERENCES investors(id),
  copiers INTEGER,
  gain DECIMAL(10,4),
  risk_score INTEGER,
  cash_percentage DECIMAL(5,2),
  trades INTEGER,
  win_ratio DECIMAL(5,2),
  UNIQUE(census_id, investor_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_investor_snapshots_census ON investor_snapshots(census_id);
CREATE INDEX IF NOT EXISTS idx_investor_snapshots_investor ON investor_snapshots(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_snapshots_copiers ON investor_snapshots(copiers DESC);

-- ============================================
-- INSTRUMENTS TABLE
-- ============================================
-- Stores instrument (asset) metadata
CREATE TABLE IF NOT EXISTS instruments (
  id SERIAL PRIMARY KEY,
  etoro_instrument_id INTEGER UNIQUE NOT NULL,
  symbol VARCHAR(20),
  name VARCHAR(200),
  image_url TEXT,
  instrument_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up by eToro instrument ID
CREATE INDEX IF NOT EXISTS idx_instruments_etoro_id ON instruments(etoro_instrument_id);
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON instruments(symbol);

-- ============================================
-- HOLDINGS TABLE
-- ============================================
-- Stores aggregated holding data per census
CREATE TABLE IF NOT EXISTS holdings (
  id SERIAL PRIMARY KEY,
  census_id INTEGER NOT NULL REFERENCES census_snapshots(id) ON DELETE CASCADE,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  holders_count INTEGER,
  average_allocation DECIMAL(5,2),
  yesterday_return DECIMAL(10,4),
  week_td_return DECIMAL(10,4),
  month_td_return DECIMAL(10,4),
  UNIQUE(census_id, instrument_id)
);

-- Index for querying holdings by census
CREATE INDEX IF NOT EXISTS idx_holdings_census ON holdings(census_id);
CREATE INDEX IF NOT EXISTS idx_holdings_instrument ON holdings(instrument_id);

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: Latest census data for each investor
CREATE OR REPLACE VIEW latest_investor_data AS
SELECT
  i.username,
  i.full_name,
  i.country_id,
  s.copiers,
  s.gain,
  s.risk_score,
  s.cash_percentage,
  s.trades,
  s.win_ratio,
  c.collected_at
FROM investors i
JOIN investor_snapshots s ON i.id = s.investor_id
JOIN census_snapshots c ON s.census_id = c.id
WHERE c.id = (SELECT MAX(id) FROM census_snapshots);

-- View: Copier trends (last 30 days)
CREATE OR REPLACE VIEW copier_trends AS
SELECT
  i.username,
  i.full_name,
  c.collected_at::date as date,
  s.copiers,
  s.gain
FROM investors i
JOIN investor_snapshots s ON i.id = s.investor_id
JOIN census_snapshots c ON s.census_id = c.id
WHERE c.collected_at > NOW() - INTERVAL '30 days'
ORDER BY i.username, c.collected_at;

-- View: Fear & Greed index history
CREATE OR REPLACE VIEW fear_greed_history AS
SELECT
  collected_at::date as date,
  fear_greed_index,
  total_investors
FROM census_snapshots
ORDER BY collected_at DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get copier change for an investor over a period
CREATE OR REPLACE FUNCTION get_copier_change(
  p_username VARCHAR,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  start_copiers INTEGER,
  end_copiers INTEGER,
  change INTEGER,
  change_pct DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH period_data AS (
    SELECT
      s.copiers,
      c.collected_at,
      ROW_NUMBER() OVER (ORDER BY c.collected_at ASC) as rn_asc,
      ROW_NUMBER() OVER (ORDER BY c.collected_at DESC) as rn_desc
    FROM investors i
    JOIN investor_snapshots s ON i.id = s.investor_id
    JOIN census_snapshots c ON s.census_id = c.id
    WHERE i.username = p_username
      AND c.collected_at > NOW() - (p_days || ' days')::INTERVAL
  )
  SELECT
    (SELECT copiers FROM period_data WHERE rn_asc = 1)::INTEGER as start_copiers,
    (SELECT copiers FROM period_data WHERE rn_desc = 1)::INTEGER as end_copiers,
    ((SELECT copiers FROM period_data WHERE rn_desc = 1) -
     (SELECT copiers FROM period_data WHERE rn_asc = 1))::INTEGER as change,
    CASE
      WHEN (SELECT copiers FROM period_data WHERE rn_asc = 1) > 0 THEN
        ROUND(
          ((SELECT copiers FROM period_data WHERE rn_desc = 1)::DECIMAL -
           (SELECT copiers FROM period_data WHERE rn_asc = 1)::DECIMAL) /
          (SELECT copiers FROM period_data WHERE rn_asc = 1)::DECIMAL * 100,
          2
        )
      ELSE 0
    END as change_pct;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (Optional - for future auth)
-- ============================================

-- Enable RLS on all tables (but allow public read access for now)
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE census_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Allow public read access" ON investors FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON census_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON investor_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON instruments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON holdings FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access" ON investors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON census_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON investor_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON instruments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON holdings FOR ALL USING (auth.role() = 'service_role');
