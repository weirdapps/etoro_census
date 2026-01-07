#!/usr/bin/env node

/**
 * Import Historical Census Data to Supabase
 *
 * This script imports historical JSON census data files into Supabase database.
 * It can process both compressed (.json.gz) and uncompressed (.json) files.
 *
 * Usage:
 *   node scripts/import-historical-to-supabase.js [options]
 *
 * Options:
 *   --dry-run       Show what would be imported without actually importing
 *   --limit N       Import only the first N files
 *   --file PATH     Import a specific file
 *   --recent N      Import only files from the last N days
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const BATCH_SIZE = 100; // Number of records to insert at once

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const fileLimit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null;
const fileIndex = args.indexOf('--file');
const specificFile = fileIndex !== -1 ? args[fileIndex + 1] : null;
const recentIndex = args.indexOf('--recent');
const recentDays = recentIndex !== -1 ? parseInt(args[recentIndex + 1], 10) : null;

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Find all JSON data files (compressed and uncompressed)
 */
function findDataFiles() {
  const files = [];

  // Find uncompressed files in root data directory
  if (fs.existsSync(DATA_DIR)) {
    const rootFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
      .map(f => ({
        path: path.join(DATA_DIR, f),
        compressed: false,
        filename: f
      }));
    files.push(...rootFiles);
  }

  // Find files in current/ directory
  const currentDir = path.join(DATA_DIR, 'current');
  if (fs.existsSync(currentDir)) {
    const currentFiles = fs.readdirSync(currentDir)
      .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
      .map(f => ({
        path: path.join(currentDir, f),
        compressed: false,
        filename: f
      }));
    files.push(...currentFiles);
  }

  // Find compressed files in archive/ directory
  const archiveDir = path.join(DATA_DIR, 'archive');
  if (fs.existsSync(archiveDir)) {
    walkDirectory(archiveDir, (filePath) => {
      const filename = path.basename(filePath);
      if (filename.startsWith('etoro-data-') && filename.endsWith('.json.gz')) {
        files.push({
          path: filePath,
          compressed: true,
          filename: filename.replace('.gz', '')
        });
      }
    });
  }

  // Sort by filename (which includes date)
  files.sort((a, b) => a.filename.localeCompare(b.filename));

  return files;
}

/**
 * Recursively walk a directory
 */
function walkDirectory(dir, callback) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

/**
 * Read and parse a JSON file (compressed or uncompressed)
 */
function readJsonFile(filePath, compressed) {
  const buffer = fs.readFileSync(filePath);
  const content = compressed ? zlib.gunzipSync(buffer).toString('utf8') : buffer.toString('utf8');
  return JSON.parse(content);
}

/**
 * Extract date from filename
 */
function extractDateFromFilename(filename) {
  // Format: etoro-data-YYYY-MM-DD-HH-MM.json
  const match = filename.match(/etoro-data-(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})\.json/);
  if (match) {
    const [, date, hour, minute] = match;
    return new Date(`${date}T${hour}:${minute}:00Z`);
  }
  return null;
}

/**
 * Import a single census file into Supabase
 */
async function importFile(fileInfo) {
  const { path: filePath, compressed, filename } = fileInfo;

  console.log(`\n📄 Processing: ${filename}`);

  try {
    const data = readJsonFile(filePath, compressed);
    const collectedAt = extractDateFromFilename(filename);

    if (!collectedAt) {
      console.log(`   ⚠️  Could not extract date from filename, skipping`);
      return { success: false, error: 'Invalid filename format' };
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would import:`);
      console.log(`   - ${data.investors?.length || 0} investors`);
      console.log(`   - ${Object.keys(data.instruments?.details || {}).length} instruments`);
      console.log(`   - ${data.analyses?.length || 0} analysis bands`);
      return { success: true, dryRun: true };
    }

    // 1. Create census snapshot
    const { data: censusSnapshot, error: censusError } = await supabase
      .from('census_snapshots')
      .upsert({
        collected_at: collectedAt.toISOString(),
        total_investors: data.investors?.length || 0,
        period: data.metadata?.period || 'CurrYear',
        fear_greed_index: data.analyses?.[0]?.metrics?.fearGreedIndex || null,
        metadata: {
          generatedAt: data.metadata?.generatedAt,
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
    console.log(`   ✅ Census snapshot created (ID: ${censusId})`);

    // 2. Upsert instruments
    const instrumentDetails = data.instruments?.details || {};
    const instrumentRecords = Object.entries(instrumentDetails).map(([id, inst]) => ({
      etoro_instrument_id: parseInt(id, 10),
      symbol: inst.symbolFull || inst.symbol || null,
      name: inst.instrumentDisplayName || inst.name || null,
      image_url: inst.images?.[0]?.uri || null,
      instrument_type: inst.instrumentTypeId?.toString() || null
    }));

    if (instrumentRecords.length > 0) {
      // Process in batches
      for (let i = 0; i < instrumentRecords.length; i += BATCH_SIZE) {
        const batch = instrumentRecords.slice(i, i + BATCH_SIZE);
        const { error: instError } = await supabase
          .from('instruments')
          .upsert(batch, { onConflict: 'etoro_instrument_id' });

        if (instError) {
          console.log(`   ⚠️  Instrument batch error: ${instError.message}`);
        }
      }
      console.log(`   ✅ ${instrumentRecords.length} instruments upserted`);
    }

    // 3. Upsert investors and create snapshots
    const investors = data.investors || [];
    let investorCount = 0;

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
          investorCount += snapshotRecords.length;
        }
      }
    }

    console.log(`   ✅ ${investorCount} investor snapshots created`);

    // 4. Create holdings records from analyses
    const analysis = data.analyses?.[0]; // Use first analysis band
    if (analysis?.topHoldings) {
      // Get instrument IDs from database
      const symbols = analysis.topHoldings.map(h => h.symbol || h.name).filter(Boolean);
      const { data: dbInstruments } = await supabase
        .from('instruments')
        .select('id, symbol, name')
        .or(`symbol.in.(${symbols.join(',')}),name.in.(${symbols.join(',')})`);

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
          console.log(`   ✅ ${holdingRecords.length} holdings created`);
        }
      }
    }

    return { success: true, censusId, investorCount };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 eToro Census Historical Data Import');
  console.log('=====================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be imported\n');
  }

  // Find all data files
  let files = findDataFiles();
  console.log(`📁 Found ${files.length} data files\n`);

  // Filter by specific file
  if (specificFile) {
    files = files.filter(f => f.path === specificFile || f.filename === specificFile);
    if (files.length === 0) {
      console.error(`❌ File not found: ${specificFile}`);
      process.exit(1);
    }
  }

  // Filter by recent days
  if (recentDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - recentDays);
    files = files.filter(f => {
      const fileDate = extractDateFromFilename(f.filename);
      return fileDate && fileDate >= cutoffDate;
    });
    console.log(`📅 Filtered to ${files.length} files from last ${recentDays} days\n`);
  }

  // Apply limit
  if (fileLimit && fileLimit < files.length) {
    files = files.slice(0, fileLimit);
    console.log(`🔢 Limited to first ${fileLimit} files\n`);
  }

  // Import files
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const result = await importFile(file);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n=====================================');
  console.log('📊 Import Summary');
  console.log('=====================================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Total processed: ${files.length}`);

  if (dryRun) {
    console.log('\n🔍 This was a dry run. No data was actually imported.');
    console.log('   Run without --dry-run to import data.');
  }
}

main().catch(console.error);
