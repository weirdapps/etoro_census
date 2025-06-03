const fs = require('fs');
const path = require('path');

// Bitcoin's instrument ID
const BTC_ID = 100000;

// Get all JSON files
const dataDir = path.join(__dirname, '..', '..', 'public', 'data');
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort();

console.log('Analyzing Bitcoin holdings over time...\n');

const results = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const date = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
  
  // Count investors holding BTC
  let btcHolders = 0;
  let totalAllocation = 0;
  const allocations = [];
  
  for (const investor of data.investors) {
    if (investor.portfolio && investor.portfolio.positions) {
      const btcPositions = investor.portfolio.positions.filter(p => p.instrumentId === BTC_ID);
      if (btcPositions.length > 0) {
        btcHolders++;
        const investorBtcAllocation = btcPositions.reduce((sum, p) => sum + (p.investmentPct || 0), 0);
        totalAllocation += investorBtcAllocation;
        allocations.push(investorBtcAllocation);
      }
    }
  }
  
  const avgAllocation = btcHolders > 0 ? totalAllocation / btcHolders : 0;
  
  // Find BTC in analyses for more data
  let btcInTopHoldings = null;
  if (data.analyses && data.analyses.length > 0) {
    // Check the 1500 investor analysis (last one)
    const analysis = data.analyses[data.analyses.length - 1];
    if (analysis.topHoldings) {
      btcInTopHoldings = analysis.topHoldings.find(h => h.instrumentId === BTC_ID);
    }
  }
  
  results.push({
    date,
    totalInvestors: data.metadata.totalInvestors,
    btcHolders,
    btcHoldersPercentage: (btcHolders / data.metadata.totalInvestors * 100).toFixed(1),
    averageAllocation: avgAllocation.toFixed(2),
    totalAllocation: totalAllocation.toFixed(2),
    topHoldingsData: btcInTopHoldings ? {
      rank: data.analyses[data.analyses.length - 1].topHoldings.indexOf(btcInTopHoldings) + 1,
      holdersCount: btcInTopHoldings.holdersCount,
      holdersPercentage: btcInTopHoldings.holdersPercentage,
      averageAllocation: btcInTopHoldings.averageAllocation
    } : null
  });
}

// Display results
console.log('Date       | Total PIs | BTC Holders | % Holding | Avg Alloc % | Rank');
console.log('-----------|-----------|-------------|-----------|-------------|------');

for (const r of results) {
  const rank = r.topHoldingsData ? `#${r.topHoldingsData.rank}` : 'N/A';
  console.log(
    `${r.date} | ${r.totalInvestors.toString().padStart(9)} | ${r.btcHolders.toString().padStart(11)} | ${r.btcHoldersPercentage.padStart(8)}% | ${r.averageAllocation.padStart(10)}% | ${rank.padStart(5)}`
  );
}

// Calculate trends
if (results.length >= 2) {
  const first = results[0];
  const last = results[results.length - 1];
  const holderChange = last.btcHolders - first.btcHolders;
  const percentageChange = ((last.btcHolders - first.btcHolders) / first.btcHolders * 100).toFixed(1);
  
  console.log('\nTrend Analysis:');
  console.log(`Period: ${first.date} to ${last.date}`);
  console.log(`BTC Holders: ${first.btcHolders} → ${last.btcHolders} (${holderChange > 0 ? '+' : ''}${holderChange}, ${percentageChange}%)`);
  console.log(`Holding %: ${first.btcHoldersPercentage}% → ${last.btcHoldersPercentage}%`);
  console.log(`Avg Allocation: ${first.averageAllocation}% → ${last.averageAllocation}%`);
}