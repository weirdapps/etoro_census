const fs = require('fs');
const path = require('path');

// Example queries you can run on the JSON data

// Get all JSON files
const dataDir = path.join(__dirname, "..", "..", "public", "data");
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort();

console.log('=== EXAMPLE QUERIES ===\n');

// Query 1: Top 5 most held instruments today
console.log('1. TOP 5 MOST HELD INSTRUMENTS (latest):');
const latestData = JSON.parse(fs.readFileSync(path.join(dataDir, files[files.length - 1]), 'utf8'));
const topHoldings = latestData.analyses[latestData.analyses.length - 1].topHoldings.slice(0, 5);
topHoldings.forEach((h, i) => {
  console.log(`   ${i + 1}. ${h.instrumentName} (${h.symbol}): ${h.holdersPercentage}% of investors, avg ${h.averageAllocation}%`);
});

// Query 2: Biggest gainers in holdings (comparing first vs last file)
console.log('\n2. BIGGEST CHANGES IN HOLDINGS:');
const firstData = JSON.parse(fs.readFileSync(path.join(dataDir, files[0]), 'utf8'));
const firstHoldings = firstData.analyses[firstData.analyses.length - 1].topHoldings;
const latestHoldings = latestData.analyses[latestData.analyses.length - 1].topHoldings;

const changes = [];
latestHoldings.forEach(latest => {
  const first = firstHoldings.find(h => h.instrumentId === latest.instrumentId);
  if (first) {
    const change = latest.holdersPercentage - first.holdersPercentage;
    if (Math.abs(change) > 0.5) { // Only show changes > 0.5%
      changes.push({
        name: latest.instrumentName,
        symbol: latest.symbol,
        change: change,
        from: first.holdersPercentage,
        to: latest.holdersPercentage
      });
    }
  }
});

changes.sort((a, b) => b.change - a.change);
console.log('   Gainers:');
changes.filter(c => c.change > 0).forEach(c => {
  console.log(`   ↑ ${c.name}: ${c.from}% → ${c.to}% (+${c.change.toFixed(1)}%)`);
});
console.log('   Losers:');
changes.filter(c => c.change < 0).slice(0, 5).forEach(c => {
  console.log(`   ↓ ${c.name}: ${c.from}% → ${c.to}% (${c.change.toFixed(1)}%)`);
});

// Query 3: Cash allocation trends
console.log('\n3. CASH ALLOCATION TREND:');
const cashTrend = [];
files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const date = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
  const avgCash = data.analyses[data.analyses.length - 1].averages.cashPercentage;
  cashTrend.push({ date, avgCash });
});
cashTrend.forEach(t => {
  console.log(`   ${t.date}: ${t.avgCash.toFixed(1)}% average cash`);
});

// Query 4: Most volatile instruments (biggest return swings)
console.log('\n4. MOST VOLATILE INSTRUMENTS (by return range):');
const volatility = [];
latestHoldings.forEach(h => {
  if (h.yesterdayReturn !== undefined && h.weekTDReturn !== undefined && h.monthTDReturn !== undefined) {
    const returns = [h.yesterdayReturn, h.weekTDReturn, h.monthTDReturn];
    const range = Math.max(...returns) - Math.min(...returns);
    if (range > 5) { // Show instruments with >5% range
      volatility.push({
        name: h.instrumentName,
        symbol: h.symbol,
        range: range,
        returns: returns
      });
    }
  }
});
volatility.sort((a, b) => b.range - a.range).slice(0, 5).forEach(v => {
  console.log(`   ${v.name}: ${v.range.toFixed(1)}% range (Y: ${v.returns[0].toFixed(1)}%, W: ${v.returns[1].toFixed(1)}%, M: ${v.returns[2].toFixed(1)}%)`);
});

// Query 5: Investor diversity trends
console.log('\n5. PORTFOLIO DIVERSITY TREND:');
files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const date = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
  const avgInstruments = data.analyses[data.analyses.length - 1].averages.uniqueInstruments;
  console.log(`   ${date}: ${avgInstruments.toFixed(1)} average instruments per investor`);
});

console.log('\n=== Run specific analysis scripts for detailed insights ===');
console.log('- node analyze-btc-holdings.js');
console.log('- node analyze-instrument-trends.js <instrument>');