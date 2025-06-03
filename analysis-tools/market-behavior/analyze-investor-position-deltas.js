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

console.log('=== KEY INSIGHTS: INVESTOR & POSITION DELTAS ANALYSIS ===\n');

// Get first and last data files
const firstData = JSON.parse(fs.readFileSync(path.join(dataDir, files[0]), 'utf8'));
const lastData = JSON.parse(fs.readFileSync(path.join(dataDir, files[files.length - 1]), 'utf8'));

const firstDate = files[0].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
const lastDate = files[files.length - 1].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];

console.log(`Period: ${firstDate} to ${lastDate}\n`);

// Analyze deltas for all instruments
const instrumentDeltas = new Map();

// Process first and last files to get deltas
[
  { data: firstData, label: 'first' },
  { data: lastData, label: 'last' }
].forEach(({ data, label }) => {
  // Track unique investors and positions per instrument
  const instrumentStats = new Map();
  
  data.investors.forEach(investor => {
    if (investor.portfolio?.positions) {
      // Track positions by instrument for this investor
      const investorInstruments = new Map();
      
      investor.portfolio.positions.forEach(position => {
        const id = position.instrumentId;
        if (!investorInstruments.has(id)) {
          investorInstruments.set(id, []);
        }
        investorInstruments.get(id).push({
          allocation: position.investmentPct || 0,
          value: position.currentValue || 0
        });
      });
      
      // Record stats for each instrument
      investorInstruments.forEach((positions, instrumentId) => {
        if (!instrumentStats.has(instrumentId)) {
          instrumentStats.set(instrumentId, {
            investors: new Set(),
            totalPositions: 0,
            totalAllocation: 0
          });
        }
        
        const stats = instrumentStats.get(instrumentId);
        stats.investors.add(investor.userName);
        stats.totalPositions += positions.length;
        stats.totalAllocation += positions.reduce((sum, p) => sum + p.allocation, 0);
      });
    }
  });
  
  // Store results
  instrumentStats.forEach((stats, instrumentId) => {
    if (!instrumentDeltas.has(instrumentId)) {
      instrumentDeltas.set(instrumentId, {});
    }
    
    instrumentDeltas.get(instrumentId)[label] = {
      investors: stats.investors.size,
      positions: stats.totalPositions,
      totalAllocation: stats.totalAllocation
    };
  });
});

// Get instrument names
const instrumentNames = new Map();
[lastData.instruments?.details || [], 
 ...(lastData.analyses?.map(a => a.topHoldings || []) || [])]
  .flat()
  .forEach(inst => {
    if (inst.instrumentId && inst.instrumentDisplayName) {
      instrumentNames.set(inst.instrumentId, {
        name: inst.instrumentDisplayName || inst.instrumentName,
        symbol: inst.symbolFull || inst.symbol
      });
    }
  });

// Calculate deltas and categorize
const categories = {
  strongBullish: [],      // ↑ investors, ↑ positions (both growing)
  accumulation: [],       // → investors, ↑ positions (same investors buying more)
  newInterest: [],        // ↑ investors, → positions (new investors, cautious)
  profitTaking: [],       // ↑ investors, ↓ positions (new investors but old ones selling)
  distribution: [],       // → investors, ↓ positions (same investors reducing)
  bearish: [],           // ↓ investors, ↓ positions (exodus)
  mixedSignals: []       // Other patterns
};

instrumentDeltas.forEach((data, instrumentId) => {
  if (!data.first || !data.last) return;
  
  const info = instrumentNames.get(instrumentId);
  if (!info || data.last.investors < 50) return; // Only significant holdings
  
  const investorDelta = data.last.investors - data.first.investors;
  const positionDelta = data.last.positions - data.first.positions;
  const investorDeltaPct = (investorDelta / data.first.investors * 100);
  const positionDeltaPct = (positionDelta / data.first.positions * 100);
  const avgPositionsFirst = data.first.positions / data.first.investors;
  const avgPositionsLast = data.last.positions / data.last.investors;
  const avgAllocationFirst = data.first.totalAllocation / data.first.investors;
  const avgAllocationLast = data.last.totalAllocation / data.last.investors;
  
  const asset = {
    name: info.name,
    symbol: info.symbol,
    investorDelta,
    investorDeltaPct,
    positionDelta,
    positionDeltaPct,
    firstInvestors: data.first.investors,
    lastInvestors: data.last.investors,
    firstPositions: data.first.positions,
    lastPositions: data.last.positions,
    avgPositionsFirst,
    avgPositionsLast,
    avgAllocationFirst,
    avgAllocationLast
  };
  
  // Categorize based on deltas
  if (investorDelta > 5 && positionDelta > 10) {
    categories.strongBullish.push(asset);
  } else if (Math.abs(investorDelta) <= 2 && positionDelta > 10) {
    categories.accumulation.push(asset);
  } else if (investorDelta > 5 && Math.abs(positionDelta) <= 5) {
    categories.newInterest.push(asset);
  } else if (investorDelta > 0 && positionDelta < -10) {
    categories.profitTaking.push(asset);
  } else if (Math.abs(investorDelta) <= 2 && positionDelta < -10) {
    categories.distribution.push(asset);
  } else if (investorDelta < -2 && positionDelta < -5) {
    categories.bearish.push(asset);
  } else if (Math.abs(investorDelta) > 2 || Math.abs(positionDelta) > 5) {
    categories.mixedSignals.push(asset);
  }
});

// Display insights by category
console.log('🚀 STRONG BULLISH (↑ Investors AND ↑ Positions):');
console.log('─'.repeat(100));
if (categories.strongBullish.length > 0) {
  console.log('Asset                          | Investors        | Positions         | Avg Pos  | Sentiment');
  console.log('───────────────────────────────┼──────────────────┼───────────────────┼──────────┼───────────');
  categories.strongBullish
    .sort((a, b) => b.positionDelta - a.positionDelta)
    .slice(0, 10)
    .forEach(asset => {
      const nameStr = `${asset.name} (${asset.symbol})`.substring(0, 30).padEnd(30);
      const investorStr = `${asset.firstInvestors}→${asset.lastInvestors} (+${asset.investorDelta})`.padEnd(17);
      const positionStr = `${asset.firstPositions}→${asset.lastPositions} (+${asset.positionDelta})`.padEnd(18);
      const avgPosStr = `${asset.avgPositionsFirst.toFixed(1)}→${asset.avgPositionsLast.toFixed(1)}`.padEnd(9);
      console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${avgPosStr} | Growing momentum`);
    });
} else {
  console.log('No assets in this category');
}

console.log('\n💰 ACCUMULATION (Same investors buying MORE):');
console.log('─'.repeat(100));
if (categories.accumulation.length > 0) {
  console.log('Asset                          | Investors        | Positions         | Avg Pos  | Behavior');
  console.log('───────────────────────────────┼──────────────────┼───────────────────┼──────────┼───────────');
  categories.accumulation
    .sort((a, b) => b.positionDelta - a.positionDelta)
    .slice(0, 10)
    .forEach(asset => {
      const nameStr = `${asset.name} (${asset.symbol})`.substring(0, 30).padEnd(30);
      const investorStr = `${asset.firstInvestors}→${asset.lastInvestors} (${asset.investorDelta >= 0 ? '+' : ''}${asset.investorDelta})`.padEnd(17);
      const positionStr = `${asset.firstPositions}→${asset.lastPositions} (+${asset.positionDelta})`.padEnd(18);
      const avgPosStr = `${asset.avgPositionsFirst.toFixed(1)}→${asset.avgPositionsLast.toFixed(1)}`.padEnd(9);
      console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${avgPosStr} | Adding to winners`);
    });
} else {
  console.log('No assets in this category');
}

console.log('\n📊 PROFIT TAKING (New investors coming but old ones reducing):');
console.log('─'.repeat(100));
if (categories.profitTaking.length > 0) {
  console.log('Asset                          | Investors        | Positions         | Avg Pos  | Signal');
  console.log('───────────────────────────────┼──────────────────┼───────────────────┼──────────┼───────────');
  categories.profitTaking
    .sort((a, b) => a.positionDelta - b.positionDelta)
    .slice(0, 10)
    .forEach(asset => {
      const nameStr = `${asset.name} (${asset.symbol})`.substring(0, 30).padEnd(30);
      const investorStr = `${asset.firstInvestors}→${asset.lastInvestors} (+${asset.investorDelta})`.padEnd(17);
      const positionStr = `${asset.firstPositions}→${asset.lastPositions} (${asset.positionDelta})`.padEnd(18);
      const avgPosStr = `${asset.avgPositionsFirst.toFixed(1)}→${asset.avgPositionsLast.toFixed(1)}`.padEnd(9);
      console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${avgPosStr} | Distribution phase`);
    });
} else {
  console.log('No assets in this category');
}

console.log('\n📉 DISTRIBUTION (Same investors REDUCING positions):');
console.log('─'.repeat(100));
if (categories.distribution.length > 0) {
  console.log('Asset                          | Investors        | Positions         | Avg Pos  | Action');
  console.log('───────────────────────────────┼──────────────────┼───────────────────┼──────────┼───────────');
  categories.distribution
    .sort((a, b) => a.positionDelta - b.positionDelta)
    .slice(0, 10)
    .forEach(asset => {
      const nameStr = `${asset.name} (${asset.symbol})`.substring(0, 30).padEnd(30);
      const investorStr = `${asset.firstInvestors}→${asset.lastInvestors} (${asset.investorDelta >= 0 ? '+' : ''}${asset.investorDelta})`.padEnd(17);
      const positionStr = `${asset.firstPositions}→${asset.lastPositions} (${asset.positionDelta})`.padEnd(18);
      const avgPosStr = `${asset.avgPositionsFirst.toFixed(1)}→${asset.avgPositionsLast.toFixed(1)}`.padEnd(9);
      console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${avgPosStr} | Taking profits`);
    });
} else {
  console.log('No assets in this category');
}

console.log('\n🆕 NEW INTEREST (New investors entering cautiously):');
console.log('─'.repeat(100));
if (categories.newInterest.length > 0) {
  console.log('Asset                          | Investors        | Positions         | Avg Pos  | Entry Style');
  console.log('───────────────────────────────┼──────────────────┼───────────────────┼──────────┼───────────');
  categories.newInterest
    .sort((a, b) => b.investorDelta - a.investorDelta)
    .slice(0, 10)
    .forEach(asset => {
      const nameStr = `${asset.name} (${asset.symbol})`.substring(0, 30).padEnd(30);
      const investorStr = `${asset.firstInvestors}→${asset.lastInvestors} (+${asset.investorDelta})`.padEnd(17);
      const positionStr = `${asset.firstPositions}→${asset.lastPositions} (${asset.positionDelta >= 0 ? '+' : ''}${asset.positionDelta})`.padEnd(18);
      const avgPosStr = `${asset.avgPositionsFirst.toFixed(1)}→${asset.avgPositionsLast.toFixed(1)}`.padEnd(9);
      console.log(`${nameStr} | ${investorStr} | ${positionStr} | ${avgPosStr} | Testing waters`);
    });
} else {
  console.log('No assets in this category');
}

// Summary statistics
console.log('\n📈 MARKET SENTIMENT SUMMARY:');
console.log('─'.repeat(60));
const total = Object.values(categories).reduce((sum, cat) => sum + cat.length, 0);
Object.entries(categories).forEach(([category, assets]) => {
  if (assets.length > 0) {
    const percentage = (assets.length / total * 100).toFixed(1);
    console.log(`${category.padEnd(20)}: ${assets.length.toString().padStart(3)} assets (${percentage}%)`);
  }
});

console.log('\n💡 KEY INSIGHTS:');
console.log('─'.repeat(60));
console.log('• BULLISH SIGNALS: Assets with both investor and position growth');
console.log('• ACCUMULATION: Core holders adding to positions (high conviction)');
console.log('• PROFIT TAKING: Early investors reducing while new ones enter');
console.log('• DISTRIBUTION: Position reduction without investor exodus');
console.log('• NEW INTEREST: Fresh investors entering with small positions');