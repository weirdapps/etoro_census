#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== DETAILED OUTPERFORMANCE FACTOR ANALYSIS ===\n');

// Load multiple data files for trend analysis
const dataDir = path.join(__dirname, '../../public/data');
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort();

// Load latest and earliest files for comparison
const latestFile = files[files.length - 1];
const earliestFile = files[0];

console.log(`Analyzing period: ${earliestFile.match(/\d{4}-\d{2}-\d{2}/)[0]} to ${latestFile.match(/\d{4}-\d{2}-\d{2}/)[0]}\n`);

const latestData = JSON.parse(fs.readFileSync(path.join(dataDir, latestFile), 'utf8'));
const earliestData = JSON.parse(fs.readFileSync(path.join(dataDir, earliestFile), 'utf8'));

// Helper function to get instrument name
function getInstrumentName(instrumentId, data) {
  const details = data.instruments?.details?.[instrumentId];
  if (details) {
    return {
      name: details.instrumentDisplayName || details.shortName || 'Unknown',
      symbol: details.symbolFull || details.symbol || '',
      image: details.images?.[0]?.uri || ''
    };
  }
  return { name: instrumentId.toString(), symbol: '', image: '' };
}

// Get analyses
const latestTop100 = latestData.analyses.find(a => a.investorCount === 100);
const latestAll1500 = latestData.analyses.find(a => a.investorCount === 1500);
const earliestTop100 = earliestData.analyses.find(a => a.investorCount === 100);
const earliestAll1500 = earliestData.analyses.find(a => a.investorCount === 1500);

console.log('📊 TOP HOLDINGS EVOLUTION\n');
console.log('=========================\n');

// Map instrument IDs to names for latest data
const instrumentMap = new Map();
Object.keys(latestData.instruments?.details || {}).forEach(id => {
  const details = latestData.instruments.details[id];
  instrumentMap.set(parseInt(id), {
    name: details.instrumentDisplayName || 'Unknown',
    symbol: details.symbolFull || ''
  });
});

console.log('TOP 100 INVESTORS - Current Top 10 Holdings:');
console.log('---------------------------------------------');
latestTop100.topHoldings.slice(0, 10).forEach((holding, i) => {
  const inst = instrumentMap.get(holding.instrumentId) || { name: holding.instrumentId, symbol: '' };
  const holders = holding.holders || 'N/A';
  console.log(`${i + 1}. ${inst.name} (${inst.symbol})`);
  console.log(`   Avg Allocation: ${holding.averageAllocation.toFixed(2)}%`);
  console.log(`   Holders: ${holders} investors\n`);
});

console.log('\nALL 1500 INVESTORS - Current Top 10 Holdings:');
console.log('----------------------------------------------');
latestAll1500.topHoldings.slice(0, 10).forEach((holding, i) => {
  const inst = instrumentMap.get(holding.instrumentId) || { name: holding.instrumentId, symbol: '' };
  const holders = holding.holders || 'N/A';
  console.log(`${i + 1}. ${inst.name} (${inst.symbol})`);
  console.log(`   Avg Allocation: ${holding.averageAllocation.toFixed(2)}%`);
  console.log(`   Holders: ${holders} investors\n`);
});

// Analyze allocation differences
console.log('\n📈 STRATEGIC ALLOCATION DIFFERENCES\n');
console.log('====================================\n');

// Create allocation maps
const top100Allocations = new Map();
const all1500Allocations = new Map();

latestTop100.topHoldings.forEach(h => {
  top100Allocations.set(h.instrumentId, h.averageAllocation);
});

latestAll1500.topHoldings.forEach(h => {
  all1500Allocations.set(h.instrumentId, h.averageAllocation);
});

// Find biggest allocation differences
const allocationDiffs = [];
top100Allocations.forEach((allocation, instrumentId) => {
  const all1500Allocation = all1500Allocations.get(instrumentId) || 0;
  const diff = allocation - all1500Allocation;
  const inst = instrumentMap.get(instrumentId) || { name: instrumentId, symbol: '' };

  allocationDiffs.push({
    instrumentId,
    name: inst.name,
    symbol: inst.symbol,
    top100: allocation,
    all1500: all1500Allocation,
    diff
  });
});

// Also check instruments in All 1500 but not in Top 100
all1500Allocations.forEach((allocation, instrumentId) => {
  if (!top100Allocations.has(instrumentId)) {
    const inst = instrumentMap.get(instrumentId) || { name: instrumentId, symbol: '' };
    allocationDiffs.push({
      instrumentId,
      name: inst.name,
      symbol: inst.symbol,
      top100: 0,
      all1500: allocation,
      diff: -allocation
    });
  }
});

allocationDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

console.log('BIGGEST ALLOCATION DIFFERENCES:');
console.log('--------------------------------');
allocationDiffs.slice(0, 10).forEach(stock => {
  const direction = stock.diff > 0 ? 'OVERWEIGHT' : 'UNDERWEIGHT';
  const color = stock.diff > 0 ? '🟢' : '🔴';
  console.log(`${color} ${stock.name} (${stock.symbol})`);
  console.log(`   Top 100: ${stock.top100.toFixed(2)}%`);
  console.log(`   All 1500: ${stock.all1500.toFixed(2)}%`);
  console.log(`   ${direction} by ${Math.abs(stock.diff).toFixed(2)}%\n`);
});

// Analyze performance metrics over time
console.log('\n📊 PERFORMANCE METRICS EVOLUTION\n');
console.log('=================================\n');

const metrics = {
  start: {
    top100: earliestTop100?.averages || {},
    all1500: earliestAll1500?.averages || {}
  },
  end: {
    top100: latestTop100.averages,
    all1500: latestAll1500.averages
  }
};

console.log('                        | Start → End (Top 100) | Start → End (All 1500) | Current Diff');
console.log('------------------------|----------------------|------------------------|-------------');
console.log(`YTD Gain               | ${metrics.start.top100.gain?.toFixed(1) || 'N/A'}% → ${metrics.end.top100.gain.toFixed(1)}%         | ${metrics.start.all1500.gain?.toFixed(1) || 'N/A'}% → ${metrics.end.all1500.gain.toFixed(1)}%          | +${(metrics.end.top100.gain - metrics.end.all1500.gain).toFixed(1)}%`);
console.log(`Win Ratio              | ${metrics.start.top100.winRatio?.toFixed(1) || 'N/A'}% → ${metrics.end.top100.winRatio.toFixed(1)}%       | ${metrics.start.all1500.winRatio?.toFixed(1) || 'N/A'}% → ${metrics.end.all1500.winRatio.toFixed(1)}%        | +${(metrics.end.top100.winRatio - metrics.end.all1500.winRatio).toFixed(1)}%`);
console.log(`Avg Trades             | ${metrics.start.top100.trades?.toFixed(0) || 'N/A'} → ${metrics.end.top100.trades.toFixed(0)}           | ${metrics.start.all1500.trades?.toFixed(0) || 'N/A'} → ${metrics.end.all1500.trades.toFixed(0)}            | +${(metrics.end.top100.trades - metrics.end.all1500.trades).toFixed(0)}`);
console.log(`Risk Score             | ${metrics.start.top100.riskScore?.toFixed(1) || 'N/A'} → ${metrics.end.top100.riskScore.toFixed(1)}           | ${metrics.start.all1500.riskScore?.toFixed(1) || 'N/A'} → ${metrics.end.all1500.riskScore.toFixed(1)}            | ${(metrics.end.top100.riskScore - metrics.end.all1500.riskScore).toFixed(1)}`);
console.log(`Cash Position          | ${metrics.start.top100.cashPercentage?.toFixed(1) || 'N/A'}% → ${metrics.end.top100.cashPercentage.toFixed(1)}%       | ${metrics.start.all1500.cashPercentage?.toFixed(1) || 'N/A'}% → ${metrics.end.all1500.cashPercentage.toFixed(1)}%        | ${(metrics.end.top100.cashPercentage - metrics.end.all1500.cashPercentage).toFixed(1)}%`);

// Analyze specific high-performing investors
console.log('\n🏆 TOP PERFORMERS IN TOP 100\n');
console.log('=============================\n');

const topPerformers = latestData.investors
  .slice(0, 100)
  .sort((a, b) => (b.yearToDateGain || 0) - (a.yearToDateGain || 0))
  .slice(0, 10);

console.log('Highest YTD Gains among Top 100:');
console.log('---------------------------------');
topPerformers.forEach((investor, i) => {
  console.log(`${i + 1}. ${investor.name} (@${investor.username})`);
  console.log(`   YTD Gain: ${investor.yearToDateGain?.toFixed(1) || 'N/A'}%`);
  console.log(`   Copiers: ${investor.copiers || 0}`);
  console.log(`   Win Ratio: ${investor.tradeInfo?.winRatio?.toFixed(1) || 'N/A'}%`);
  console.log(`   Risk Score: ${investor.riskScore || 'N/A'}\n`);
});

// Key findings summary
console.log('\n🎯 KEY OUTPERFORMANCE DRIVERS\n');
console.log('==============================\n');

const outperformance = metrics.end.top100.gain - metrics.end.all1500.gain;
const winRatioDiff = metrics.end.top100.winRatio - metrics.end.all1500.winRatio;

console.log(`The Top 100 investors achieved ${outperformance.toFixed(1)}% outperformance through:\n`);

console.log('1. SUPERIOR STOCK SELECTION & TIMING');
console.log(`   • ${winRatioDiff.toFixed(1)}% higher win ratio (${metrics.end.top100.winRatio.toFixed(1)}% vs ${metrics.end.all1500.winRatio.toFixed(1)}%)`);
console.log(`   • More active trading: ${metrics.end.top100.trades.toFixed(0)} vs ${metrics.end.all1500.trades.toFixed(0)} average trades`);

console.log('\n2. PORTFOLIO CONCENTRATION STRATEGY');
const top100Concentration = latestTop100.topHoldings.slice(0, 5).reduce((sum, h) => sum + h.averageAllocation, 0);
const all1500Concentration = latestAll1500.topHoldings.slice(0, 5).reduce((sum, h) => sum + h.averageAllocation, 0);
console.log(`   • Top 5 holdings: ${top100Concentration.toFixed(1)}% (Top 100) vs ${all1500Concentration.toFixed(1)}% (All 1500)`);
console.log(`   • More focused portfolios with ${metrics.end.top100.uniqueInstruments.toFixed(0)} vs ${metrics.end.all1500.uniqueInstruments.toFixed(0)} unique instruments`);

console.log('\n3. KEY STOCK OVERWEIGHTS');
const topOverweights = allocationDiffs.filter(s => s.diff > 0).slice(0, 3);
topOverweights.forEach(stock => {
  console.log(`   • ${stock.symbol}: +${stock.diff.toFixed(2)}% overweight`);
});

console.log('\n4. RISK-ADJUSTED POSITIONING');
console.log(`   • Lower risk score: ${metrics.end.top100.riskScore.toFixed(1)} vs ${metrics.end.all1500.riskScore.toFixed(1)}`);
console.log(`   • Similar cash levels: ${metrics.end.top100.cashPercentage.toFixed(1)}% vs ${metrics.end.all1500.cashPercentage.toFixed(1)}%`);
console.log(`   • Better risk-adjusted returns despite similar cash positions`);

// Find specific stocks that may have driven outperformance
console.log('\n5. POTENTIAL HIGH-IMPACT HOLDINGS');
console.log('   Based on allocation differences and market performance:');
topOverweights.forEach(stock => {
  if (stock.diff > 1) {
    console.log(`   • ${stock.name} (${stock.symbol}): Significant overweight position`);
  }
});

console.log('\n=================================================');
console.log('CONCLUSION: Top 100 investors demonstrate superior');
console.log('stock picking, timing, and portfolio concentration');
console.log('while maintaining comparable risk levels.');
console.log('=================================================\n');