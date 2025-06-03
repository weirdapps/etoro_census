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

console.log('=== ASSET POPULARITY TRENDS - TOP 100 INVESTORS ONLY ===\n');

// Get first and last data files
const firstData = JSON.parse(fs.readFileSync(path.join(dataDir, files[0]), 'utf8'));
const lastData = JSON.parse(fs.readFileSync(path.join(dataDir, files[files.length - 1]), 'utf8'));

const firstDate = files[0].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
const lastDate = files[files.length - 1].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];

console.log(`Period: ${firstDate} to ${lastDate} (${files.length} data points)\n`);

// Count holders for each instrument across all dates - TOP 100 ONLY
const instrumentTrends = new Map();

// Process each file to build complete trend data
files.forEach((file, fileIndex) => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const date = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
  
  // Get top 100 investors only
  const top100Investors = data.investors
    .sort((a, b) => b.copiers - a.copiers)
    .slice(0, 100);
  
  // Create a map of instrument holdings for this date
  const holdingsMap = new Map();
  
  // Count holders for each instrument among top 100
  top100Investors.forEach(investor => {
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
          allocation: position.investmentPct || 0,
          copiers: investor.copiers
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
      holdersPercentage: (holding.holders / 100) * 100, // Out of 100 investors
      averageAllocation: holding.totalAllocation / holding.holders,
      topHolders: holding.positions.sort((a, b) => b.allocation - a.allocation).slice(0, 3)
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
  // Use the 100 investor analysis (first one)
  const analysis = lastData.analyses[0];
  if (analysis.topHoldings) {
    analysis.topHoldings.forEach(holding => {
      if (!instrumentDetails.has(holding.instrumentId)) {
        instrumentDetails.set(holding.instrumentId, {
          name: holding.instrumentName,
          symbol: holding.symbol
        });
      }
    });
  }
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
    if (Math.abs(holderChange) >= 1 || lastPoint.holders >= 5) {
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
        trend: trend.dataPoints,
        topHoldersLatest: lastPoint.topHolders
      });
    }
  }
});

// Sort by holder change (absolute number)
changes.sort((a, b) => b.holderChange - a.holderChange);

// Show gainers
console.log('🚀 TOP GAINERS (by number of top-100 investors gained):');
console.log('─'.repeat(90));
console.log('Asset                                          | Holders Change      | % of Top 100 | Avg Alloc');
console.log('───────────────────────────────────────────────┼────────────────────┼──────────────┼───────────');
const gainers = changes.filter(c => c.holderChange > 0).slice(0, 20);
gainers.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 46).padEnd(46);
  const holdersStr = `${asset.firstHolders} → ${asset.lastHolders} (${asset.holderChange > 0 ? '+' : ''}${asset.holderChange})`.padEnd(19);
  const percentStr = `${asset.firstPercentage.toFixed(0)}% → ${asset.lastPercentage.toFixed(0)}%`.padEnd(13);
  const allocStr = `${asset.firstAvgAllocation.toFixed(1)}% → ${asset.lastAvgAllocation.toFixed(1)}%`;
  
  console.log(`${nameStr} | ${holdersStr} | ${percentStr} | ${allocStr}`);
});

// Show losers
console.log('\n📉 TOP LOSERS (by number of top-100 investors lost):');
console.log('─'.repeat(90));
console.log('Asset                                          | Holders Change      | % of Top 100 | Avg Alloc');
console.log('───────────────────────────────────────────────┼────────────────────┼──────────────┼───────────');
const losers = changes.filter(c => c.holderChange < 0).sort((a, b) => a.holderChange - b.holderChange).slice(0, 20);
losers.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 46).padEnd(46);
  const holdersStr = `${asset.firstHolders} → ${asset.lastHolders} (${asset.holderChange})`.padEnd(19);
  const percentStr = `${asset.firstPercentage.toFixed(0)}% → ${asset.lastPercentage.toFixed(0)}%`.padEnd(13);
  const allocStr = `${asset.firstAvgAllocation.toFixed(1)}% → ${asset.lastAvgAllocation.toFixed(1)}%`;
  
  console.log(`${nameStr} | ${holdersStr} | ${percentStr} | ${allocStr}`);
});

// Show most popular among top 100
console.log('\n🏆 MOST POPULAR ASSETS AMONG TOP 100 (by current holders):');
console.log('─'.repeat(105));
console.log('Asset                                          | Holders | % of Top 100 | Avg Alloc | Top Holder Examples');
console.log('───────────────────────────────────────────────┼─────────┼──────────────┼───────────┼────────────────────');
const mostPopular = changes
  .filter(c => c.lastHolders >= 10)
  .sort((a, b) => b.lastHolders - a.lastHolders)
  .slice(0, 15);

mostPopular.forEach((asset, i) => {
  const trend = asset.holderChange > 0 ? '↑' : asset.holderChange < 0 ? '↓' : '→';
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 46).padEnd(46);
  const holdersStr = asset.lastHolders.toString().padStart(7);
  const percentStr = `${asset.lastPercentage.toFixed(0)}%`.padStart(13);
  const allocStr = `${asset.lastAvgAllocation.toFixed(1)}%`.padStart(9);
  
  // Get top holder example
  const topHolder = asset.topHoldersLatest[0];
  const topHolderStr = topHolder ? 
    `@${topHolder.username} (${topHolder.allocation.toFixed(0)}%)`.substring(0, 20) : '';
  
  console.log(`${nameStr} | ${holdersStr} | ${percentStr} | ${allocStr} | ${topHolderStr}`);
});

// Show assets unique to top 100 (high concentration)
console.log('\n💎 HIGH CONCENTRATION ASSETS (popular with top 100 but not masses):');
console.log('─'.repeat(90));

// Get holdings from general population for comparison
const generalHoldings = new Map();
if (lastData.analyses && lastData.analyses.length > 0) {
  const generalAnalysis = lastData.analyses[lastData.analyses.length - 1]; // 1500 investors
  if (generalAnalysis.topHoldings) {
    generalAnalysis.topHoldings.forEach(h => {
      generalHoldings.set(h.instrumentId, h.holdersPercentage);
    });
  }
}

const concentrated = changes
  .filter(c => {
    const generalPercent = generalHoldings.get(c.id) || 0;
    const top100Percent = c.lastPercentage;
    // High concentration: >15% of top 100 hold it, but <30% of general population
    return top100Percent > 15 && generalPercent < 30 && generalPercent > 0;
  })
  .sort((a, b) => b.lastPercentage - a.lastPercentage)
  .slice(0, 10);

concentrated.forEach((asset, i) => {
  const generalPercent = generalHoldings.get(asset.id) || 0;
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 46).padEnd(46);
  const top100Str = `Top 100: ${asset.lastHolders} (${asset.lastPercentage.toFixed(0)}%)`.padEnd(20);
  const generalStr = `All PIs: ${generalPercent.toFixed(1)}%`.padEnd(15);
  const ratioStr = `Ratio: ${(asset.lastPercentage / generalPercent).toFixed(1)}x`;
  
  console.log(`${nameStr} | ${top100Str} | ${generalStr} | ${ratioStr}`);
});

console.log('\n─'.repeat(90));
console.log(`Analysis based on ${files.length} snapshots from ${firstDate} to ${lastDate}`);
console.log('Note: Percentages can exceed 100% as investors may hold multiple positions in the same asset');