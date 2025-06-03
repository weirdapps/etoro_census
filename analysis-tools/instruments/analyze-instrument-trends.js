const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const searchTerm = args[0];

if (!searchTerm) {
  console.log('Usage: node analyze-instrument-trends.js <instrument-name-or-symbol>');
  console.log('Example: node analyze-instrument-trends.js bitcoin');
  console.log('Example: node analyze-instrument-trends.js NVDA');
  process.exit(1);
}

// Get all JSON files
const dataDir = path.join(__dirname, "..", "..", "public", "data");
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort();

console.log(`Searching for instruments matching: "${searchTerm}"...\n`);

// First, find matching instruments
const latestFile = files[files.length - 1];
const latestData = JSON.parse(fs.readFileSync(path.join(dataDir, latestFile), 'utf8'));
const matchingInstruments = [];

// Search in instruments.details array
if (latestData.instruments && latestData.instruments.details) {
  for (const inst of latestData.instruments.details) {
    if (inst.instrumentDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.symbolFull?.toLowerCase().includes(searchTerm.toLowerCase())) {
      matchingInstruments.push({
        id: inst.instrumentId,
        name: inst.instrumentDisplayName,
        symbol: inst.symbolFull
      });
    }
  }
}

// Also search in top holdings for more instruments
if (latestData.analyses && latestData.analyses.length > 0) {
  const topHoldings = latestData.analyses[latestData.analyses.length - 1].topHoldings || [];
  for (const holding of topHoldings) {
    if ((holding.instrumentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         holding.symbol?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !matchingInstruments.find(i => i.id === holding.instrumentId)) {
      matchingInstruments.push({
        id: holding.instrumentId,
        name: holding.instrumentName,
        symbol: holding.symbol
      });
    }
  }
}

if (matchingInstruments.length === 0) {
  console.log('No matching instruments found.');
  process.exit(0);
}

console.log('Found instruments:');
matchingInstruments.forEach((inst, i) => {
  console.log(`${i + 1}. ${inst.name} (${inst.symbol}) - ID: ${inst.id}`);
});

// Analyze each matching instrument
for (const instrument of matchingInstruments) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analyzing: ${instrument.name} (${instrument.symbol})`);
  console.log(`${'='.repeat(80)}\n`);

  const results = [];
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    const date = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
    const time = file.match(/(\d{2}-\d{2})\.json$/)[1].replace('-', ':');
    
    // Count investors holding this instrument
    let holders = 0;
    let totalAllocation = 0;
    const allocations = [];
    const investorDetails = [];
    
    for (const investor of data.investors) {
      if (investor.portfolio && investor.portfolio.positions) {
        const positions = investor.portfolio.positions.filter(p => p.instrumentId === instrument.id);
        if (positions.length > 0) {
          holders++;
          const investorAllocation = positions.reduce((sum, p) => sum + (p.investmentPct || 0), 0);
          totalAllocation += investorAllocation;
          allocations.push(investorAllocation);
          
          // Store top holders (if allocation > 10%)
          if (investorAllocation > 10) {
            investorDetails.push({
              username: investor.userName,
              allocation: investorAllocation,
              copiers: investor.copiers
            });
          }
        }
      }
    }
    
    const avgAllocation = holders > 0 ? totalAllocation / holders : 0;
    
    // Find in top holdings analysis
    let topHoldingsData = null;
    if (data.analyses && data.analyses.length > 0) {
      const analysis = data.analyses[data.analyses.length - 1];
      if (analysis.topHoldings) {
        topHoldingsData = analysis.topHoldings.find(h => h.instrumentId === instrument.id);
      }
    }
    
    results.push({
      date,
      time,
      totalInvestors: data.metadata.totalInvestors,
      holders,
      holdersPercentage: (holders / data.metadata.totalInvestors * 100).toFixed(1),
      averageAllocation: avgAllocation.toFixed(2),
      totalAllocation: totalAllocation.toFixed(2),
      topHoldingsData,
      topInvestors: investorDetails.sort((a, b) => b.allocation - a.allocation).slice(0, 3)
    });
  }
  
  // Display results
  console.log('Date       Time  | PIs  | Holders | % Hold | Avg % | Rank | Yesterday | Week TD | Month TD');
  console.log('-----------------|------|---------|--------|-------|------|-----------|---------|----------');
  
  for (const r of results) {
    const rank = r.topHoldingsData ? `#${results[0].topHoldingsData.topHoldings ? results[0].topHoldingsData.topHoldings.indexOf(r.topHoldingsData) + 1 : 'N/A'}` : 'N/A';
    const returns = r.topHoldingsData ? {
      yesterday: r.topHoldingsData.yesterdayReturn?.toFixed(1) || 'N/A',
      weekTD: r.topHoldingsData.weekTDReturn?.toFixed(1) || 'N/A',
      monthTD: r.topHoldingsData.monthTDReturn?.toFixed(1) || 'N/A'
    } : { yesterday: 'N/A', weekTD: 'N/A', monthTD: 'N/A' };
    
    console.log(
      `${r.date} ${r.time} | ${r.totalInvestors.toString().padStart(4)} | ${r.holders.toString().padStart(7)} | ${r.holdersPercentage.padStart(6)}% | ${r.averageAllocation.padStart(5)}% | ${rank.padStart(5)} | ${returns.yesterday.padStart(8)}% | ${returns.weekTD.padStart(6)}% | ${returns.monthTD.padStart(7)}%`
    );
  }
  
  // Trend analysis
  if (results.length >= 2) {
    const first = results[0];
    const last = results[results.length - 1];
    const holderChange = last.holders - first.holders;
    const percentageChange = first.holders > 0 ? ((last.holders - first.holders) / first.holders * 100).toFixed(1) : 'N/A';
    
    console.log('\nTrend Summary:');
    console.log(`Period: ${first.date} to ${last.date}`);
    console.log(`Holders: ${first.holders} → ${last.holders} (${holderChange > 0 ? '+' : ''}${holderChange}, ${percentageChange}%)`);
    console.log(`Holding %: ${first.holdersPercentage}% → ${last.holdersPercentage}%`);
    console.log(`Avg Allocation: ${first.averageAllocation}% → ${last.averageAllocation}%`);
    
    // Show consistent top holders
    console.log('\nTop Holders (latest):');
    if (last.topInvestors.length > 0) {
      last.topInvestors.forEach((inv, i) => {
        console.log(`  ${i + 1}. @${inv.username}: ${inv.allocation.toFixed(1)}% (${inv.copiers} copiers)`);
      });
    } else {
      console.log('  No investors with >10% allocation');
    }
  }
}