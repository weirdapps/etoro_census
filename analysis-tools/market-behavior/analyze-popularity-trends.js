const fs = require('fs');
const path = require('path');

// Get all JSON files
const dataDir = path.join(__dirname, "..", "..", "public", "data");
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort();

if (files.length < 2) {
  console.log('Need at least 2 data files to analyze trends');
  process.exit(1);
}

console.log('=== ASSET POPULARITY TRENDS ===\n');

// Get first and last data files
const firstData = JSON.parse(fs.readFileSync(path.join(dataDir, files[0]), 'utf8'));
const lastData = JSON.parse(fs.readFileSync(path.join(dataDir, files[files.length - 1]), 'utf8'));

const firstDate = files[0].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
const lastDate = files[files.length - 1].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];

console.log(`Period: ${firstDate} to ${lastDate} (${files.length} data points)\n`);

// Count holders for each instrument across all dates
const instrumentTrends = new Map();

// Process each file to build complete trend data
files.forEach((file, fileIndex) => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const date = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
  
  // Create a map of instrument holdings for this date
  const holdingsMap = new Map();
  
  // Count holders for each instrument
  data.investors.forEach(investor => {
    if (investor.portfolio?.positions) {
      investor.portfolio.positions.forEach(position => {
        const id = position.instrumentId;
        if (!holdingsMap.has(id)) {
          holdingsMap.set(id, {
            holders: 0,
            totalAllocation: 0,
            positions: []
          });
        }
        const holding = holdingsMap.get(id);
        holding.holders++;
        holding.totalAllocation += position.investmentPct || 0;
        holding.positions.push({
          username: investor.userName,
          allocation: position.investmentPct || 0
        });
      });
    }
  });
  
  // Update instrument trends
  holdingsMap.forEach((holding, instrumentId) => {
    if (!instrumentTrends.has(instrumentId)) {
      instrumentTrends.set(instrumentId, {
        id: instrumentId,
        name: null,
        symbol: null,
        dataPoints: []
      });
    }
    
    const trend = instrumentTrends.get(instrumentId);
    trend.dataPoints.push({
      date,
      fileIndex,
      holders: holding.holders,
      holdersPercentage: (holding.holders / data.metadata.totalInvestors) * 100,
      averageAllocation: holding.totalAllocation / holding.holders
    });
  });
});

// Get instrument names from the latest data
const instrumentDetails = new Map();
if (lastData.instruments?.details) {
  lastData.instruments.details.forEach(inst => {
    instrumentDetails.set(inst.instrumentId, {
      name: inst.instrumentDisplayName,
      symbol: inst.symbolFull
    });
  });
}

// Also check analyses for more instrument names
if (lastData.analyses && lastData.analyses.length > 0) {
  const topHoldings = lastData.analyses[lastData.analyses.length - 1].topHoldings || [];
  topHoldings.forEach(holding => {
    if (!instrumentDetails.has(holding.instrumentId)) {
      instrumentDetails.set(holding.instrumentId, {
        name: holding.instrumentName,
        symbol: holding.symbol
      });
    }
  });
}

// Update instrument names in trends
instrumentTrends.forEach((trend, id) => {
  const details = instrumentDetails.get(id);
  if (details) {
    trend.name = details.name;
    trend.symbol = details.symbol;
  }
});

// Calculate changes for each instrument
const changes = [];
instrumentTrends.forEach((trend, id) => {
  // Need data from both first and last dates
  const firstPoint = trend.dataPoints.find(p => p.fileIndex === 0);
  const lastPoint = trend.dataPoints.find(p => p.fileIndex === files.length - 1);
  
  if (firstPoint && lastPoint && trend.name) {
    const holderChange = lastPoint.holders - firstPoint.holders;
    const percentageChange = lastPoint.holdersPercentage - firstPoint.holdersPercentage;
    
    // Only include if there's meaningful change or significant holding
    if (Math.abs(percentageChange) > 0.1 || lastPoint.holdersPercentage > 5) {
      changes.push({
        name: trend.name,
        symbol: trend.symbol,
        firstHolders: firstPoint.holders,
        lastHolders: lastPoint.holders,
        holderChange,
        firstPercentage: firstPoint.holdersPercentage,
        lastPercentage: lastPoint.holdersPercentage,
        percentageChange,
        firstAvgAllocation: firstPoint.averageAllocation,
        lastAvgAllocation: lastPoint.averageAllocation,
        trend: trend.dataPoints
      });
    }
  }
});

// Sort by percentage change
changes.sort((a, b) => b.percentageChange - a.percentageChange);

// Show gainers
console.log('🚀 TOP GAINERS (by holder percentage increase):');
console.log('─'.repeat(90));
console.log('Asset                                          | Holders Change      | % Change     | Avg Alloc');
console.log('───────────────────────────────────────────────┼────────────────────┼──────────────┼───────────');
const gainers = changes.filter(c => c.percentageChange > 0).slice(0, 20);
gainers.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 46).padEnd(46);
  const holdersStr = `${asset.firstHolders} → ${asset.lastHolders} (${asset.holderChange > 0 ? '+' : ''}${asset.holderChange})`.padEnd(19);
  const percentStr = `${asset.firstPercentage.toFixed(1)}% → ${asset.lastPercentage.toFixed(1)}%`.padEnd(13);
  const allocStr = `${asset.firstAvgAllocation.toFixed(1)}% → ${asset.lastAvgAllocation.toFixed(1)}%`;
  
  console.log(`${nameStr} | ${holdersStr} | ${percentStr} | ${allocStr}`);
});

// Show losers
console.log('\n📉 TOP LOSERS (by holder percentage decrease):');
console.log('─'.repeat(90));
console.log('Asset                                          | Holders Change      | % Change     | Avg Alloc');
console.log('───────────────────────────────────────────────┼────────────────────┼──────────────┼───────────');
const losers = changes.filter(c => c.percentageChange < 0).slice(0, 20);
losers.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 46).padEnd(46);
  const holdersStr = `${asset.firstHolders} → ${asset.lastHolders} (${asset.holderChange > 0 ? '+' : ''}${asset.holderChange})`.padEnd(19);
  const percentStr = `${asset.firstPercentage.toFixed(1)}% → ${asset.lastPercentage.toFixed(1)}%`.padEnd(13);
  const allocStr = `${asset.firstAvgAllocation.toFixed(1)}% → ${asset.lastAvgAllocation.toFixed(1)}%`;
  
  console.log(`${nameStr} | ${holdersStr} | ${percentStr} | ${allocStr}`);
});

// Show most popular overall
console.log('\n🏆 MOST POPULAR ASSETS (by current holders):');
console.log('─'.repeat(90));
console.log('Asset                                          | Current Holders | % of PIs  | Change      | Avg Alloc');
console.log('───────────────────────────────────────────────┼─────────────────┼───────────┼─────────────┼──────────');
const mostPopular = changes
  .filter(c => c.lastPercentage > 10)
  .sort((a, b) => b.lastPercentage - a.lastPercentage)
  .slice(0, 15);

mostPopular.forEach((asset, i) => {
  const trend = asset.percentageChange > 0 ? '↑' : asset.percentageChange < 0 ? '↓' : '→';
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 46).padEnd(46);
  const holdersStr = asset.lastHolders.toString().padStart(15);
  const percentStr = `${asset.lastPercentage.toFixed(1)}%`.padStart(9);
  const changeStr = `${trend} ${asset.percentageChange > 0 ? '+' : ''}${asset.percentageChange.toFixed(1)}%`.padStart(12);
  const allocStr = `${asset.lastAvgAllocation.toFixed(1)}%`.padStart(9);
  
  console.log(`${nameStr} | ${holdersStr} | ${percentStr} | ${changeStr} | ${allocStr}`);
});

console.log('\n─'.repeat(80));
console.log(`Analysis based on ${files.length} snapshots from ${firstDate} to ${lastDate}`);