/**
 * Test script for utilities module
 * Validates that all functions work correctly
 */

const utils = require('../lib/utils');

console.log('Testing eToro Census Utilities Module');
console.log('=====================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testsFailed++;
  }
}

// Test data directory resolution
test('getDataDirectory() finds data directory', () => {
  const dir = utils.getDataDirectory();
  if (!dir) throw new Error('No directory returned');
  console.log(`   Found: ${dir}`);
});

// Test getting all data files
test('getAllDataFiles() returns array of files', () => {
  const files = utils.getAllDataFiles();
  if (!Array.isArray(files)) throw new Error('Not an array');
  if (files.length === 0) throw new Error('No files found');
  console.log(`   Found ${files.length} data files`);
});

// Test getting latest file
test('getLatestDataFile() returns latest file', () => {
  const result = utils.getLatestDataFile();
  if (!result.filename) throw new Error('No filename');
  if (!result.filepath) throw new Error('No filepath');
  console.log(`   Latest: ${result.filename}`);
});

// Test getting latest files for comparison
test('getLatestDataFiles() returns today and yesterday', () => {
  const result = utils.getLatestDataFiles();
  if (!result.today) throw new Error('No today file');
  if (!result.yesterday) throw new Error('No yesterday file');
  console.log(`   Today: ${result.today}`);
  console.log(`   Yesterday: ${result.yesterday}`);
});

// Test loading data file
test('loadLatestData() loads and parses JSON', () => {
  const data = utils.loadLatestData();
  if (!data) throw new Error('No data loaded');
  if (!data.metadata) throw new Error('No metadata in data');
  if (!data.investors) throw new Error('No investors in data');
  console.log(`   Loaded data from ${data.metadata.collectedAtUTC}`);
  console.log(`   Found ${data.investors.length} investors`);
});

// Test instrument map creation
test('createInstrumentMap() creates lookup map', () => {
  const data = utils.loadLatestData();
  const instrumentMap = utils.createInstrumentMap(data);
  if (!(instrumentMap instanceof Map)) throw new Error('Not a Map');
  console.log(`   Created map with ${instrumentMap.size} instruments`);
});

// Test asset info retrieval
test('getAssetInfo() returns asset details', () => {
  const data = utils.loadLatestData();
  const instrumentMap = utils.createInstrumentMap(data);
  
  // Test with a known instrument ID (AMZN is usually 1155)
  const assetInfo = utils.getAssetInfo(1155, instrumentMap);
  if (!assetInfo.symbol) throw new Error('No symbol in asset info');
  console.log(`   Asset 1155: ${assetInfo.symbol} - ${assetInfo.name}`);
  
  // Test with unknown ID
  const unknownAsset = utils.getAssetInfo(999999, instrumentMap);
  if (!unknownAsset.symbol.includes('ID')) throw new Error('Unknown asset not handled');
  console.log(`   Unknown asset handled: ${unknownAsset.symbol}`);
});

// Test risk score calculation
test('calculateRiskAdjustedScore() calculates score', () => {
  const testInvestor = {
    gain: 20,
    riskScore: 5,
    winRatio: 75,
    copiers: 5000
  };
  const score = utils.calculateRiskAdjustedScore(testInvestor);
  if (typeof score !== 'number') throw new Error('Score not a number');
  if (score <= 0) throw new Error('Score should be positive');
  console.log(`   Calculated score: ${score.toFixed(2)}`);
});

// Test formatting functions
test('formatPercentage() formats with sign', () => {
  const positive = utils.formatPercentage(5.67);
  const negative = utils.formatPercentage(-3.21);
  if (positive !== '+5.7%') throw new Error(`Expected +5.7%, got ${positive}`);
  if (negative !== '-3.2%') throw new Error(`Expected -3.2%, got ${negative}`);
  console.log(`   Positive: ${positive}, Negative: ${negative}`);
});

test('formatNumber() adds commas', () => {
  const formatted = utils.formatNumber(1234567);
  if (!formatted.includes(',')) throw new Error('No comma in formatted number');
  console.log(`   Formatted: ${formatted}`);
});

test('formatDate() formats date correctly', () => {
  const date = new Date('2025-08-19');
  const formatted = utils.formatDate(date);
  if (formatted !== '2025-08-19') throw new Error(`Expected 2025-08-19, got ${formatted}`);
  console.log(`   Formatted date: ${formatted}`);
});

// Test weekly files (might fail if no Saturday files)
try {
  test('getWeeklyDataFiles() finds Saturday reports', () => {
    const result = utils.getWeeklyDataFiles();
    if (!result.latest) throw new Error('No latest Saturday');
    if (!result.weekAgo) throw new Error('No previous Saturday');
    console.log(`   Latest Saturday: ${result.latest}`);
    console.log(`   Previous Saturday: ${result.weekAgo}`);
  });
} catch (e) {
  console.log(`⚠️  Weekly files test skipped: ${e.message}`);
}

// Test monthly files (might fail if no first-of-month files)
try {
  test('getMonthlyDataFiles() finds first-of-month reports', () => {
    const result = utils.getMonthlyDataFiles();
    if (!result.latest) throw new Error('No latest first-of-month');
    if (!result.monthAgo) throw new Error('No previous first-of-month');
    console.log(`   Latest month: ${result.latest}`);
    console.log(`   Previous month: ${result.monthAgo}`);
  });
} catch (e) {
  console.log(`⚠️  Monthly files test skipped: ${e.message}`);
}

// Summary
console.log('\n=====================================');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
if (testsFailed === 0) {
  console.log('\n✅ All utilities working correctly!');
} else {
  console.log(`\n❌ ${testsFailed} tests failed. Please fix before proceeding.`);
  process.exit(1);
}