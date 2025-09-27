#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== ANALYZING OUTPERFORMANCE FACTORS ===\n');

// Load the latest data file
const dataDir = path.join(__dirname, '../../public/data');
const latestFile = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort()
  .pop();

console.log(`Analyzing latest data: ${latestFile}\n`);

const data = JSON.parse(fs.readFileSync(path.join(dataDir, latestFile), 'utf8'));

// Get analyses for Top 100 and All 1500
const top100Analysis = data.analyses.find(a => a.investorCount === 100);
const all1500Analysis = data.analyses.find(a => a.investorCount === 1500);

// Get investors data
const top100Investors = data.investors.slice(0, 100);
const all1500Investors = data.investors;

// 1. ANALYZE TOP HOLDINGS DIFFERENCES
console.log('📊 TOP HOLDINGS COMPARISON\n');
console.log('Top 100 - Most Popular Holdings:');
console.log('--------------------------------');

const top100Holdings = top100Analysis.topHoldings.slice(0, 10);
const all1500Holdings = all1500Analysis.topHoldings.slice(0, 10);

// Create maps for easy comparison
const top100HoldingsMap = new Map();
const all1500HoldingsMap = new Map();

top100Holdings.forEach((h, i) => {
  const instrument = data.instruments?.details?.[h.instrumentId];
  const name = instrument?.shortName || h.instrumentId;
  const symbol = instrument?.symbol || '';
  top100HoldingsMap.set(h.instrumentId, {
    rank: i + 1,
    name,
    symbol,
    avgAllocation: h.averageAllocation,
    holders: h.holders
  });
  console.log(`${i + 1}. ${name} (${symbol}): ${h.averageAllocation.toFixed(2)}% avg, ${h.holders} holders`);
});

console.log('\nAll 1500 - Most Popular Holdings:');
console.log('----------------------------------');

all1500Holdings.forEach((h, i) => {
  const instrument = data.instruments?.details?.[h.instrumentId];
  const name = instrument?.shortName || h.instrumentId;
  const symbol = instrument?.symbol || '';
  all1500HoldingsMap.set(h.instrumentId, {
    rank: i + 1,
    name,
    symbol,
    avgAllocation: h.averageAllocation,
    holders: h.holders
  });
  console.log(`${i + 1}. ${name} (${symbol}): ${h.averageAllocation.toFixed(2)}% avg, ${h.holders} holders`);
});

// Find unique holdings in Top 100
console.log('\n🎯 UNIQUE TO TOP 100 (not in All 1500 top 10):');
console.log('------------------------------------------------');
let uniqueCount = 0;
top100Holdings.forEach(h => {
  if (!all1500HoldingsMap.has(h.instrumentId)) {
    const instrument = data.instruments?.details?.[h.instrumentId];
    const name = instrument?.shortName || h.instrumentId;
    const symbol = instrument?.symbol || '';
    console.log(`• ${name} (${symbol}): ${h.averageAllocation.toFixed(2)}% avg allocation`);
    uniqueCount++;
  }
});
if (uniqueCount === 0) console.log('None - all top 10 holdings overlap');

// 2. ANALYZE PORTFOLIO METRICS
console.log('\n📈 KEY PERFORMANCE METRICS\n');

const metrics = {
  top100: top100Analysis.averages,
  all1500: all1500Analysis.averages
};

console.log('Metric                  | Top 100  | All 1500 | Difference');
console.log('------------------------|----------|----------|------------');
console.log(`YTD Gain               | ${metrics.top100.gain.toFixed(1)}%   | ${metrics.all1500.gain.toFixed(1)}%   | +${(metrics.top100.gain - metrics.all1500.gain).toFixed(1)}%`);
console.log(`Win Ratio              | ${metrics.top100.winRatio.toFixed(1)}%   | ${metrics.all1500.winRatio.toFixed(1)}%   | +${(metrics.top100.winRatio - metrics.all1500.winRatio).toFixed(1)}%`);
console.log(`Avg Trades             | ${metrics.top100.trades.toFixed(0)}     | ${metrics.all1500.trades.toFixed(0)}      | +${(metrics.top100.trades - metrics.all1500.trades).toFixed(0)}`);
console.log(`Risk Score             | ${metrics.top100.riskScore.toFixed(1)}      | ${metrics.all1500.riskScore.toFixed(1)}      | ${(metrics.top100.riskScore - metrics.all1500.riskScore).toFixed(1)}`);
console.log(`Cash Position          | ${metrics.top100.cashPercentage.toFixed(1)}%   | ${metrics.all1500.cashPercentage.toFixed(1)}%   | ${(metrics.top100.cashPercentage - metrics.all1500.cashPercentage).toFixed(1)}%`);
console.log(`Unique Instruments     | ${metrics.top100.uniqueInstruments.toFixed(1)}     | ${metrics.all1500.uniqueInstruments.toFixed(1)}     | ${(metrics.top100.uniqueInstruments - metrics.all1500.uniqueInstruments).toFixed(1)}`);

// 3. ANALYZE CONCENTRATION
console.log('\n🎲 PORTFOLIO CONCENTRATION ANALYSIS\n');

// Calculate concentration for top holdings
function calculateConcentration(holdings) {
  const top5 = holdings.slice(0, 5).reduce((sum, h) => sum + h.averageAllocation, 0);
  const top10 = holdings.slice(0, 10).reduce((sum, h) => sum + h.averageAllocation, 0);
  return { top5, top10 };
}

const top100Concentration = calculateConcentration(top100Holdings);
const all1500Concentration = calculateConcentration(all1500Holdings);

console.log(`Top 5 Holdings Concentration:`);
console.log(`  Top 100: ${top100Concentration.top5.toFixed(1)}%`);
console.log(`  All 1500: ${all1500Concentration.top5.toFixed(1)}%`);
console.log(`  Difference: ${(top100Concentration.top5 - all1500Concentration.top5).toFixed(1)}%`);

console.log(`\nTop 10 Holdings Concentration:`);
console.log(`  Top 100: ${top100Concentration.top10.toFixed(1)}%`);
console.log(`  All 1500: ${all1500Concentration.top10.toFixed(1)}%`);
console.log(`  Difference: ${(top100Concentration.top10 - all1500Concentration.top10).toFixed(1)}%`);

// 4. ANALYZE SPECIFIC HIGH-PERFORMING STOCKS
console.log('\n🚀 HIGH-PERFORMING STOCKS ANALYSIS\n');

// Get all unique holdings from top 100 investors
const top100StockAllocations = new Map();
const all1500StockAllocations = new Map();

// Aggregate allocations for Top 100
top100Investors.forEach(investor => {
  if (investor.portfolio?.positions) {
    investor.portfolio.positions.forEach(position => {
      const current = top100StockAllocations.get(position.instrumentId) || {
        totalAllocation: 0,
        count: 0,
        totalValue: 0
      };
      current.totalAllocation += position.investmentPercentage || 0;
      current.count++;
      current.totalValue += position.netAmount || 0;
      top100StockAllocations.set(position.instrumentId, current);
    });
  }
});

// Aggregate allocations for All 1500
all1500Investors.forEach(investor => {
  if (investor.portfolio?.positions) {
    investor.portfolio.positions.forEach(position => {
      const current = all1500StockAllocations.get(position.instrumentId) || {
        totalAllocation: 0,
        count: 0,
        totalValue: 0
      };
      current.totalAllocation += position.investmentPercentage || 0;
      current.count++;
      current.totalValue += position.netAmount || 0;
      all1500StockAllocations.set(position.instrumentId, current);
    });
  }
});

// Find stocks with biggest allocation difference
const allocationDiffs = [];
top100StockAllocations.forEach((value, instrumentId) => {
  const all1500Data = all1500StockAllocations.get(instrumentId);
  if (all1500Data && value.count >= 10) { // At least 10 holders in top 100
    const top100Avg = value.totalAllocation / value.count;
    const all1500Avg = all1500Data.totalAllocation / all1500Data.count;
    const diff = top100Avg - all1500Avg;

    const instrument = data.instruments?.details?.[instrumentId];
    if (instrument) {
      allocationDiffs.push({
        instrumentId,
        name: instrument.shortName,
        symbol: instrument.symbol,
        top100Avg,
        all1500Avg,
        diff,
        top100Holders: value.count,
        all1500Holders: all1500Data.count
      });
    }
  }
});

// Sort by difference and show top overweights
allocationDiffs.sort((a, b) => b.diff - a.diff);

console.log('Stocks OVERWEIGHTED by Top 100 (vs All 1500):');
console.log('----------------------------------------------');
allocationDiffs.slice(0, 10).forEach(stock => {
  if (stock.diff > 0.1) { // Only show meaningful differences
    console.log(`${stock.name} (${stock.symbol}):`);
    console.log(`  Top 100: ${stock.top100Avg.toFixed(2)}% avg (${stock.top100Holders} holders)`);
    console.log(`  All 1500: ${stock.all1500Avg.toFixed(2)}% avg (${stock.all1500Holders} holders)`);
    console.log(`  Overweight: +${stock.diff.toFixed(2)}%\n`);
  }
});

console.log('\nStocks UNDERWEIGHTED by Top 100 (vs All 1500):');
console.log('-----------------------------------------------');
allocationDiffs.slice(-10).reverse().forEach(stock => {
  if (stock.diff < -0.1) { // Only show meaningful differences
    console.log(`${stock.name} (${stock.symbol}):`);
    console.log(`  Top 100: ${stock.top100Avg.toFixed(2)}% avg (${stock.top100Holders} holders)`);
    console.log(`  All 1500: ${stock.all1500Avg.toFixed(2)}% avg (${stock.all1500Holders} holders)`);
    console.log(`  Underweight: ${stock.diff.toFixed(2)}%\n`);
  }
});

// 5. TRADING BEHAVIOR ANALYSIS
console.log('\n📊 TRADING BEHAVIOR PATTERNS\n');

const top100HighTraders = top100Investors.filter(i => i.tradeInfo?.trades > 500).length;
const all1500HighTraders = all1500Investors.filter(i => i.tradeInfo?.trades > 500).length;

console.log(`High-frequency traders (>500 trades):`);
console.log(`  Top 100: ${top100HighTraders} (${(top100HighTraders/100*100).toFixed(0)}%)`);
console.log(`  All 1500: ${all1500HighTraders} (${(all1500HighTraders/1500*100).toFixed(0)}%)`);

// 6. SUMMARY OF KEY FACTORS
console.log('\n🎯 KEY OUTPERFORMANCE FACTORS SUMMARY\n');
console.log('=====================================\n');

const outperformance = metrics.top100.gain - metrics.all1500.gain;

console.log(`The Top 100 investors outperformed by ${outperformance.toFixed(1)}% due to:\n`);

console.log('1. SUPERIOR STOCK SELECTION');
console.log(`   • Higher win ratio: ${metrics.top100.winRatio.toFixed(1)}% vs ${metrics.all1500.winRatio.toFixed(1)}%`);
console.log(`   • Better trade timing with ${(metrics.top100.trades - metrics.all1500.trades).toFixed(0)} more trades on average`);

console.log('\n2. PORTFOLIO CONCENTRATION');
console.log(`   • More concentrated in top holdings: ${top100Concentration.top10.toFixed(1)}% vs ${all1500Concentration.top10.toFixed(1)}%`);
console.log(`   • Fewer unique instruments: ${metrics.top100.uniqueInstruments.toFixed(0)} vs ${metrics.all1500.uniqueInstruments.toFixed(0)}`);

console.log('\n3. RISK MANAGEMENT');
console.log(`   • Similar cash positions: ${metrics.top100.cashPercentage.toFixed(1)}% vs ${metrics.all1500.cashPercentage.toFixed(1)}%`);
console.log(`   • Comparable risk scores: ${metrics.top100.riskScore.toFixed(1)} vs ${metrics.all1500.riskScore.toFixed(1)}`);

if (allocationDiffs.filter(s => s.diff > 0.5).length > 0) {
  console.log('\n4. STRATEGIC OVERWEIGHTS');
  allocationDiffs.slice(0, 3).forEach(stock => {
    if (stock.diff > 0.5) {
      console.log(`   • ${stock.symbol}: +${stock.diff.toFixed(1)}% overweight`);
    }
  });
}

console.log('\n=====================================');