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

console.log('=== INVESTOR HOLDINGS vs POSITION ANALYSIS ===\n');

// Get first and last data files
const firstData = JSON.parse(fs.readFileSync(path.join(dataDir, files[0]), 'utf8'));
const lastData = JSON.parse(fs.readFileSync(path.join(dataDir, files[files.length - 1]), 'utf8'));

const firstDate = files[0].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
const lastDate = files[files.length - 1].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];

console.log(`Period: ${firstDate} to ${lastDate} (${files.length} data points)\n`);

// Analyze both investors and positions
const instrumentAnalysis = new Map();

// Process each file
files.forEach((file, fileIndex) => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const date = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
  
  // Track unique investors and total positions per instrument
  const instrumentData = new Map();
  
  data.investors.forEach(investor => {
    if (investor.portfolio?.positions) {
      // Group positions by instrument
      const investorInstruments = new Map();
      
      investor.portfolio.positions.forEach(position => {
        const id = position.instrumentId;
        
        if (!investorInstruments.has(id)) {
          investorInstruments.set(id, {
            positions: [],
            totalAllocation: 0
          });
        }
        
        investorInstruments.get(id).positions.push(position);
        investorInstruments.get(id).totalAllocation += position.investmentPct || 0;
      });
      
      // Now record data for each instrument this investor holds
      investorInstruments.forEach((data, instrumentId) => {
        if (!instrumentData.has(instrumentId)) {
          instrumentData.set(instrumentId, {
            uniqueInvestors: new Set(),
            totalPositions: 0,
            totalAllocation: 0,
            positionsPerInvestor: []
          });
        }
        
        const inst = instrumentData.get(instrumentId);
        inst.uniqueInvestors.add(investor.userName);
        inst.totalPositions += data.positions.length;
        inst.totalAllocation += data.totalAllocation;
        inst.positionsPerInvestor.push({
          investor: investor.userName,
          positionCount: data.positions.length,
          totalAllocation: data.totalAllocation
        });
      });
    }
  });
  
  // Store analysis for this date
  instrumentData.forEach((data, instrumentId) => {
    if (!instrumentAnalysis.has(instrumentId)) {
      instrumentAnalysis.set(instrumentId, {
        id: instrumentId,
        name: null,
        symbol: null,
        dataPoints: []
      });
    }
    
    const uniqueInvestorCount = data.uniqueInvestors.size;
    const avgPositionsPerInvestor = data.totalPositions / uniqueInvestorCount;
    const avgAllocationPerInvestor = data.totalAllocation / uniqueInvestorCount;
    
    instrumentAnalysis.get(instrumentId).dataPoints.push({
      date,
      fileIndex,
      uniqueInvestors: uniqueInvestorCount,
      totalPositions: data.totalPositions,
      avgPositionsPerInvestor,
      avgAllocationPerInvestor,
      multiPositionInvestors: data.positionsPerInvestor.filter(p => p.positionCount > 1).length
    });
  });
});

// Get instrument names
const instrumentDetails = new Map();
if (lastData.instruments?.details) {
  lastData.instruments.details.forEach(inst => {
    instrumentDetails.set(inst.instrumentId, {
      name: inst.instrumentDisplayName,
      symbol: inst.symbolFull
    });
  });
}

// Also check analyses for more names
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

// Update names in analysis
instrumentAnalysis.forEach((analysis, id) => {
  const details = instrumentDetails.get(id);
  if (details) {
    analysis.name = details.name;
    analysis.symbol = details.symbol;
  }
});

// Calculate changes
const changes = [];
instrumentAnalysis.forEach((analysis, id) => {
  const firstPoint = analysis.dataPoints.find(p => p.fileIndex === 0);
  const lastPoint = analysis.dataPoints.find(p => p.fileIndex === files.length - 1);
  
  if (firstPoint && lastPoint && analysis.name && lastPoint.uniqueInvestors >= 50) {
    const investorChange = lastPoint.uniqueInvestors - firstPoint.uniqueInvestors;
    const positionChange = lastPoint.totalPositions - firstPoint.totalPositions;
    const avgPositionsChange = lastPoint.avgPositionsPerInvestor - firstPoint.avgPositionsPerInvestor;
    
    changes.push({
      name: analysis.name,
      symbol: analysis.symbol,
      // Investor metrics
      firstInvestors: firstPoint.uniqueInvestors,
      lastInvestors: lastPoint.uniqueInvestors,
      investorChange,
      investorChangePercent: (investorChange / firstPoint.uniqueInvestors * 100),
      // Position metrics
      firstPositions: firstPoint.totalPositions,
      lastPositions: lastPoint.totalPositions,
      positionChange,
      positionChangePercent: (positionChange / firstPoint.totalPositions * 100),
      // Avg positions per investor
      firstAvgPositions: firstPoint.avgPositionsPerInvestor,
      lastAvgPositions: lastPoint.avgPositionsPerInvestor,
      avgPositionsChange,
      // Allocation
      firstAvgAllocation: firstPoint.avgAllocationPerInvestor,
      lastAvgAllocation: lastPoint.avgAllocationPerInvestor,
      // Multi-position holders
      lastMultiPositionInvestors: lastPoint.multiPositionInvestors
    });
  }
});

// Show assets where investors are ADDING positions (accumulating)
console.log('📈 ACCUMULATION: Assets where investors are ADDING MORE POSITIONS:');
console.log('─'.repeat(110));
console.log('Asset                           | Investors      | Positions       | Avg Pos/Inv | Multi-Pos | Insight');
console.log('────────────────────────────────┼────────────────┼─────────────────┼─────────────┼───────────┼─────────');

const accumulating = changes
  .filter(c => c.avgPositionsChange > 0.02) // At least 0.02 more positions per investor
  .sort((a, b) => b.avgPositionsChange - a.avgPositionsChange)
  .slice(0, 15);

accumulating.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 31).padEnd(31);
  const investorStr = `${asset.firstInvestors} → ${asset.lastInvestors}`.padEnd(15);
  const positionStr = `${asset.firstPositions} → ${asset.lastPositions}`.padEnd(16);
  const avgPosStr = `${asset.firstAvgPositions.toFixed(2)} → ${asset.lastAvgPositions.toFixed(2)}`.padEnd(12);
  const multiPosStr = asset.lastMultiPositionInvestors.toString().padStart(10);
  
  let insight = '';
  if (asset.investorChange > 0 && asset.avgPositionsChange > 0) {
    insight = 'Growing & Accumulating';
  } else if (asset.investorChange <= 0 && asset.avgPositionsChange > 0) {
    insight = 'Core holders adding';
  } else {
    insight = 'Position building';
  }
  
  console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${avgPosStr} | ${multiPosStr} | ${insight}`);
});

// Show assets where investors are REDUCING positions
console.log('\n📉 REDUCTION: Assets where investors are REDUCING POSITIONS:');
console.log('─'.repeat(110));
console.log('Asset                           | Investors      | Positions       | Avg Pos/Inv | Multi-Pos | Insight');
console.log('────────────────────────────────┼────────────────┼─────────────────┼─────────────┼───────────┼─────────');

const reducing = changes
  .filter(c => c.avgPositionsChange < -0.02)
  .sort((a, b) => a.avgPositionsChange - b.avgPositionsChange)
  .slice(0, 15);

reducing.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 31).padEnd(31);
  const investorStr = `${asset.firstInvestors} → ${asset.lastInvestors}`.padEnd(15);
  const positionStr = `${asset.firstPositions} → ${asset.lastPositions}`.padEnd(16);
  const avgPosStr = `${asset.firstAvgPositions.toFixed(2)} → ${asset.lastAvgPositions.toFixed(2)}`.padEnd(12);
  const multiPosStr = asset.lastMultiPositionInvestors.toString().padStart(10);
  
  let insight = '';
  if (asset.investorChange < 0 && asset.avgPositionsChange < 0) {
    insight = 'Exodus & Selling';
  } else if (asset.investorChange >= 0 && asset.avgPositionsChange < 0) {
    insight = 'Profit taking';
  } else {
    insight = 'Position trimming';
  }
  
  console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${avgPosStr} | ${multiPosStr} | ${insight}`);
});

// Show NEW ADOPTION (more investors, but not necessarily more positions per investor)
console.log('\n🆕 NEW ADOPTION: Assets gaining NEW INVESTORS:');
console.log('─'.repeat(100));
console.log('Asset                           | Investor Change        | Position Change      | Adoption Type');
console.log('────────────────────────────────┼────────────────────────┼──────────────────────┼──────────────');

const newAdoption = changes
  .filter(c => c.investorChange > 10)
  .sort((a, b) => b.investorChange - a.investorChange)
  .slice(0, 15);

newAdoption.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 31).padEnd(31);
  const investorStr = `+${asset.investorChange} (${asset.investorChangePercent > 0 ? '+' : ''}${asset.investorChangePercent.toFixed(1)}%)`.padEnd(23);
  const positionStr = `+${asset.positionChange} (${asset.positionChangePercent > 0 ? '+' : ''}${asset.positionChangePercent.toFixed(1)}%)`.padEnd(21);
  
  let adoptionType = '';
  const posPerInvRatio = asset.positionChangePercent / asset.investorChangePercent;
  if (posPerInvRatio > 1.5) {
    adoptionType = 'Heavy accumulation';
  } else if (posPerInvRatio > 1.1) {
    adoptionType = 'Multi-position entry';
  } else if (posPerInvRatio > 0.9) {
    adoptionType = 'Standard adoption';
  } else {
    adoptionType = 'Cautious entry';
  }
  
  console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${adoptionType}`);
});

// Show CONCENTRATION metrics
console.log('\n🎯 HIGHEST CONCENTRATION: Assets with most multi-position holders:');
console.log('─'.repeat(100));
console.log('Asset                           | Total Investors | Multi-Pos | % Multi | Avg Pos/Inv | Avg Alloc');
console.log('────────────────────────────────┼─────────────────┼───────────┼─────────┼─────────────┼──────────');

const concentrated = changes
  .filter(c => c.lastMultiPositionInvestors > 20)
  .sort((a, b) => b.lastMultiPositionInvestors - a.lastMultiPositionInvestors)
  .slice(0, 10);

concentrated.forEach((asset, i) => {
  const nameStr = `${i + 1}. ${asset.name} (${asset.symbol})`.substring(0, 31).padEnd(31);
  const investorStr = asset.lastInvestors.toString().padStart(15);
  const multiPosStr = asset.lastMultiPositionInvestors.toString().padStart(10);
  const multiPercentStr = `${(asset.lastMultiPositionInvestors / asset.lastInvestors * 100).toFixed(0)}%`.padStart(8);
  const avgPosStr = asset.lastAvgPositions.toFixed(2).padStart(12);
  const avgAllocStr = `${asset.lastAvgAllocation.toFixed(1)}%`.padStart(9);
  
  console.log(`${nameStr} | ${investorStr} | ${multiPosStr} | ${multiPercentStr} | ${avgPosStr} | ${avgAllocStr}`);
});

console.log('\n─'.repeat(100));
console.log('Key Insights:');
console.log('- "Avg Pos/Inv" > 1.0 means investors hold multiple positions (different entry points, leverage, etc.)');
console.log('- Rising Avg Pos/Inv = accumulation behavior (building larger positions over time)');
console.log('- Falling Avg Pos/Inv = distribution/profit-taking (closing some positions)');
console.log('- High Multi-Pos count = active trading or dollar-cost averaging behavior');