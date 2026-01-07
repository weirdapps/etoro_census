#!/usr/bin/env node

/**
 * Sync Daily Census Data to Supabase
 *
 * This script syncs the latest census data to Supabase after each daily run.
 * It's designed to be called from the GitHub Actions workflow after report generation.
 *
 * Usage:
 *   node scripts/sync-daily-to-supabase.js [options]
 *
 * Options:
 *   --file PATH     Sync a specific file (default: census-data-latest.json)
 *   --dry-run       Show what would be synced without actually syncing
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const DEFAULT_FILE = 'census-data-latest.json';
const BATCH_SIZE = 100;

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileIndex = args.indexOf('--file');
const targetFile = fileIndex !== -1 ? args[fileIndex + 1] : DEFAULT_FILE;

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if Supabase is configured
if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️  Supabase not configured, skipping sync');
  console.log('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable');
  process.exit(0); // Exit gracefully - this is expected when Supabase isn't set up
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Read and parse the census data file
 */
function readCensusData(filename) {
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Sync census data to Supabase
 */
async function syncToSupabase(data) {
  const startTime = Date.now();

  console.log('📊 Data Summary:');
  console.log(`   - Investors: ${data.investors?.length || 0}`);
  console.log(`   - Instruments: ${Object.keys(data.instruments?.details || {}).length}`);
  console.log(`   - Analysis bands: ${data.analyses?.length || 0}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No data will be synced');
    return { success: true, dryRun: true };
  }

  try {
    // 1. Create census snapshot
    const collectedAt = new Date(data.metadata?.generatedAt || Date.now());

    const { data: censusSnapshot, error: censusError } = await supabase
      .from('census_snapshots')
      .upsert({
        collected_at: collectedAt.toISOString(),
        total_investors: data.investors?.length || 0,
        period: data.metadata?.period || 'CurrYear',
        fear_greed_index: data.analyses?.[0]?.metrics?.fearGreedIndex || null,
        metadata: {
          generatedAt: data.metadata?.generatedAt,
          generatedAtUTC: data.metadata?.generatedAtUTC,
          analysisGroups: data.metadata?.analysisGroups
        }
      }, {
        onConflict: 'collected_at'
      })
      .select()
      .single();

    if (censusError) {
      throw new Error(`Census snapshot error: ${censusError.message}`);
    }

    const censusId = censusSnapshot.id;
    console.log(`\n✅ Census snapshot: ID ${censusId}`);

    // 2. Upsert instruments
    const instrumentDetails = data.instruments?.details || {};
    const instrumentRecords = Object.entries(instrumentDetails).map(([id, inst]) => ({
      etoro_instrument_id: parseInt(id, 10),
      symbol: inst.symbolFull || inst.symbol || null,
      name: inst.instrumentDisplayName || inst.name || null,
      image_url: inst.images?.[0]?.uri || null,
      instrument_type: inst.instrumentTypeId?.toString() || null
    }));

    let instrumentCount = 0;
    for (let i = 0; i < instrumentRecords.length; i += BATCH_SIZE) {
      const batch = instrumentRecords.slice(i, i + BATCH_SIZE);
      const { error: instError } = await supabase
        .from('instruments')
        .upsert(batch, { onConflict: 'etoro_instrument_id' });

      if (instError) {
        console.log(`   ⚠️  Instrument batch error: ${instError.message}`);
      } else {
        instrumentCount += batch.length;
      }
    }
    console.log(`✅ Instruments: ${instrumentCount} upserted`);

    // 3. Upsert investors and create snapshots
    const investors = data.investors || [];
    let investorCount = 0;
    let snapshotCount = 0;

    for (let i = 0; i < investors.length; i += BATCH_SIZE) {
      const batch = investors.slice(i, i + BATCH_SIZE);

      // Upsert investors
      const investorRecords = batch.map(inv => ({
        etoro_customer_id: inv.customerId,
        username: inv.userName,
        full_name: inv.fullName || null,
        country_id: inv.countryId || null
      }));

      const { data: upsertedInvestors, error: invError } = await supabase
        .from('investors')
        .upsert(investorRecords, { onConflict: 'etoro_customer_id' })
        .select('id, etoro_customer_id');

      if (invError) {
        console.log(`   ⚠️  Investor batch error: ${invError.message}`);
        continue;
      }

      investorCount += upsertedInvestors.length;

      // Create investor snapshots
      const investorIdMap = new Map(
        upsertedInvestors.map(inv => [inv.etoro_customer_id, inv.id])
      );

      const snapshotRecords = batch
        .filter(inv => investorIdMap.has(inv.customerId))
        .map(inv => ({
          census_id: censusId,
          investor_id: investorIdMap.get(inv.customerId),
          copiers: inv.copiers || null,
          gain: inv.gain || null,
          risk_score: inv.riskScore || null,
          cash_percentage: inv.portfolio?.realizedCreditPct || null,
          trades: inv.trades || inv.tradeInfo?.trades || null,
          win_ratio: inv.winRatio || inv.tradeInfo?.winRatio || null
        }));

      if (snapshotRecords.length > 0) {
        const { error: snapError } = await supabase
          .from('investor_snapshots')
          .upsert(snapshotRecords, { onConflict: 'census_id,investor_id' });

        if (snapError) {
          console.log(`   ⚠️  Snapshot batch error: ${snapError.message}`);
        } else {
          snapshotCount += snapshotRecords.length;
        }
      }

      // Progress update
      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= investors.length) {
        console.log(`   Progress: ${Math.min(i + BATCH_SIZE, investors.length)}/${investors.length} investors`);
      }
    }

    console.log(`✅ Investors: ${investorCount} upserted`);
    console.log(`✅ Snapshots: ${snapshotCount} created`);

    // 4. Create holdings records
    const analysis = data.analyses?.[0];
    if (analysis?.topHoldings) {
      const symbols = analysis.topHoldings
        .map(h => h.symbol || h.name)
        .filter(Boolean);

      const { data: dbInstruments } = await supabase
        .from('instruments')
        .select('id, symbol, name');

      const instrumentMap = new Map();
      (dbInstruments || []).forEach(inst => {
        if (inst.symbol) instrumentMap.set(inst.symbol, inst.id);
        if (inst.name) instrumentMap.set(inst.name, inst.id);
      });

      const holdingRecords = analysis.topHoldings
        .filter(h => instrumentMap.has(h.symbol) || instrumentMap.has(h.name))
        .map(h => ({
          census_id: censusId,
          instrument_id: instrumentMap.get(h.symbol) || instrumentMap.get(h.name),
          holders_count: h.holders || null,
          average_allocation: h.avgAllocation || null,
          yesterday_return: h.yesterdayReturn || null,
          week_td_return: h.weekTdReturn || null,
          month_td_return: h.monthTdReturn || null
        }));

      if (holdingRecords.length > 0) {
        const { error: holdError } = await supabase
          .from('holdings')
          .upsert(holdingRecords, { onConflict: 'census_id,instrument_id' });

        if (holdError) {
          console.log(`   ⚠️  Holdings error: ${holdError.message}`);
        } else {
          console.log(`✅ Holdings: ${holdingRecords.length} created`);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  Sync completed in ${duration}s`);

    return { success: true, censusId, investorCount, snapshotCount };

  } catch (error) {
    console.error(`\n❌ Sync failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 eToro Census Daily Sync to Supabase');
  console.log('======================================\n');

  console.log(`📄 Reading: ${targetFile}`);

  try {
    const data = readCensusData(targetFile);
    console.log(`   Generated: ${data.metadata?.generatedAtUTC || 'Unknown'}\n`);

    const result = await syncToSupabase(data);

    if (result.success) {
      console.log('\n✅ Sync completed successfully!');
    } else {
      console.log('\n❌ Sync failed');
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
