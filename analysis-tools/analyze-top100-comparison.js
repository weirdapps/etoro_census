const fs = require('fs');

// Read the two data files
const earliestData = JSON.parse(fs.readFileSync('./public/data/etoro-data-2025-05-31-01-33.json', 'utf8'));
const latestData = JSON.parse(fs.readFileSync('./public/data/etoro-data-2025-06-09-21-08.json', 'utf8'));

// Extract top 100 investors from each
const earliestTop100 = earliestData.investors.slice(0, 100);
const latestTop100 = latestData.investors.slice(0, 100);

// Create maps for easier lookup
const earliestMap = new Map(earliestTop100.map(inv => [inv.userName, inv]));
const latestMap = new Map(latestTop100.map(inv => [inv.userName, inv]));

// Calculate average metrics
function calculateAverages(investors) {
  const count = investors.length;
  return {
    avgGain: investors.reduce((sum, inv) => sum + (inv.gain || 0), 0) / count,
    avgRiskScore: investors.reduce((sum, inv) => sum + (inv.riskScore || 0), 0) / count,
    avgCash: investors.reduce((sum, inv) => {
      // Calculate cash percentage from portfolio
      const portfolio = inv.portfolio;
      if (!portfolio) return sum;
      const totalValue = portfolio.totalValue || 0;
      const positions = portfolio.positions || [];
      const investedValue = positions.reduce((total, pos) => total + (pos.investmentPct || 0), 0);
      const cashPct = Math.max(0, 100 - investedValue);
      return sum + cashPct;
    }, 0) / count,
    avgCopiers: investors.reduce((sum, inv) => sum + (inv.copiers || 0), 0) / count,
    avgTrades: investors.reduce((sum, inv) => sum + (inv.trades || 0), 0) / count,
    avgWinRatio: investors.reduce((sum, inv) => sum + (inv.winRatio || 0), 0) / count
  };
}

const earliestMetrics = calculateAverages(earliestTop100);
const latestMetrics = calculateAverages(latestTop100);

console.log('=== TOP 100 INVESTORS COMPARISON (May 31 vs June 9, 2025) ===\n');

console.log('1. AVERAGE PERFORMANCE METRICS CHANGES:');
console.log('----------------------------------------');
console.log(`Average Gain (YTD):     ${earliestMetrics.avgGain.toFixed(2)}% → ${latestMetrics.avgGain.toFixed(2)}% (${(latestMetrics.avgGain - earliestMetrics.avgGain).toFixed(2)} pp)`);
console.log(`Average Risk Score:     ${earliestMetrics.avgRiskScore.toFixed(2)} → ${latestMetrics.avgRiskScore.toFixed(2)} (${(latestMetrics.avgRiskScore - earliestMetrics.avgRiskScore).toFixed(2)})`);
console.log(`Average Cash Position:  ${earliestMetrics.avgCash.toFixed(2)}% → ${latestMetrics.avgCash.toFixed(2)}% (${(latestMetrics.avgCash - earliestMetrics.avgCash).toFixed(2)} pp)`);
console.log(`Average Copiers:        ${Math.round(earliestMetrics.avgCopiers)} → ${Math.round(latestMetrics.avgCopiers)} (${Math.round(latestMetrics.avgCopiers - earliestMetrics.avgCopiers)})`);
console.log(`Average Trades:         ${Math.round(earliestMetrics.avgTrades)} → ${Math.round(latestMetrics.avgTrades)} (${Math.round(latestMetrics.avgTrades - earliestMetrics.avgTrades)})`);
console.log(`Average Win Ratio:      ${earliestMetrics.avgWinRatio.toFixed(2)}% → ${latestMetrics.avgWinRatio.toFixed(2)}% (${(latestMetrics.avgWinRatio - earliestMetrics.avgWinRatio).toFixed(2)} pp)`);

// Find investors who entered/left top 100
const earliestUsernames = new Set(earliestTop100.map(inv => inv.userName));
const latestUsernames = new Set(latestTop100.map(inv => inv.userName));

const newEntrants = latestTop100.filter(inv => !earliestUsernames.has(inv.userName));
const exitedInvestors = earliestTop100.filter(inv => !latestUsernames.has(inv.userName));

console.log('\n2. INVESTORS WHO ENTERED THE TOP 100:');
console.log('----------------------------------------');
if (newEntrants.length > 0) {
  newEntrants.forEach((inv, idx) => {
    const rank = latestTop100.findIndex(i => i.userName === inv.userName) + 1;
    console.log(`#${rank} ${inv.fullName} (@${inv.userName}) - Gain: ${inv.gain}%, Risk: ${inv.riskScore}, Copiers: ${inv.copiers}`);
  });
} else {
  console.log('No new entrants');
}

console.log('\n3. INVESTORS WHO LEFT THE TOP 100:');
console.log('----------------------------------------');
if (exitedInvestors.length > 0) {
  exitedInvestors.forEach((inv, idx) => {
    const oldRank = earliestTop100.findIndex(i => i.userName === inv.userName) + 1;
    console.log(`Was #${oldRank} ${inv.fullName} (@${inv.userName}) - Gain: ${inv.gain}%, Risk: ${inv.riskScore}, Copiers: ${inv.copiers}`);
  });
} else {
  console.log('No exits');
}

// Analyze significant portfolio changes for consistent top performers
console.log('\n4. SIGNIFICANT PORTFOLIO STRATEGY CHANGES (Top 20 consistent performers):');
console.log('----------------------------------------');

const consistentTop20 = earliestTop100.slice(0, 20).filter(inv => latestUsernames.has(inv.userName));

consistentTop20.forEach(earliestInv => {
  const latestInv = latestMap.get(earliestInv.userName);
  if (!latestInv) return;

  // Calculate cash positions
  const earliestCash = earliestInv.portfolio ? 
    Math.max(0, 100 - earliestInv.portfolio.positions.reduce((sum, pos) => sum + (pos.investmentPct || 0), 0)) : 0;
  const latestCash = latestInv.portfolio ? 
    Math.max(0, 100 - latestInv.portfolio.positions.reduce((sum, pos) => sum + (pos.investmentPct || 0), 0)) : 0;

  const gainChange = latestInv.gain - earliestInv.gain;
  const riskChange = latestInv.riskScore - earliestInv.riskScore;
  const cashChange = latestCash - earliestCash;
  const positionsChange = (latestInv.portfolio?.positionsCount || 0) - (earliestInv.portfolio?.positionsCount || 0);

  // Only show investors with significant changes
  if (Math.abs(cashChange) > 5 || Math.abs(riskChange) > 1 || Math.abs(positionsChange) > 10) {
    console.log(`\n${earliestInv.fullName} (@${earliestInv.userName}):`);
    if (Math.abs(gainChange) > 0.5) console.log(`  Gain: ${earliestInv.gain.toFixed(2)}% → ${latestInv.gain.toFixed(2)}% (${gainChange > 0 ? '+' : ''}${gainChange.toFixed(2)}pp)`);
    if (Math.abs(riskChange) > 0) console.log(`  Risk Score: ${earliestInv.riskScore} → ${latestInv.riskScore} (${riskChange > 0 ? '+' : ''}${riskChange})`);
    if (Math.abs(cashChange) > 1) console.log(`  Cash Position: ${earliestCash.toFixed(1)}% → ${latestCash.toFixed(1)}% (${cashChange > 0 ? '+' : ''}${cashChange.toFixed(1)}pp)`);
    if (Math.abs(positionsChange) > 0) console.log(`  Open Positions: ${earliestInv.portfolio?.positionsCount || 0} → ${latestInv.portfolio?.positionsCount || 0} (${positionsChange > 0 ? '+' : ''}${positionsChange})`);
  }
});

// Cash position distribution analysis
console.log('\n5. CASH POSITION DISTRIBUTION ANALYSIS:');
console.log('----------------------------------------');

function getCashDistribution(investors) {
  const distribution = {
    '0-5%': 0,
    '5-10%': 0,
    '11-25%': 0,
    '26-50%': 0,
    '51-75%': 0,
    '76-100%': 0
  };

  investors.forEach(inv => {
    const cash = inv.portfolio ? 
      Math.max(0, 100 - inv.portfolio.positions.reduce((sum, pos) => sum + (pos.investmentPct || 0), 0)) : 0;
    
    if (cash <= 5) distribution['0-5%']++;
    else if (cash <= 10) distribution['5-10%']++;
    else if (cash <= 25) distribution['11-25%']++;
    else if (cash <= 50) distribution['26-50%']++;
    else if (cash <= 75) distribution['51-75%']++;
    else distribution['76-100%']++;
  });

  return distribution;
}

const earliestDist = getCashDistribution(earliestTop100);
const latestDist = getCashDistribution(latestTop100);

console.log('May 31 Distribution:');
Object.entries(earliestDist).forEach(([range, count]) => {
  console.log(`  ${range}: ${count} investors (${(count/100*100).toFixed(1)}%)`);
});

console.log('\nJune 9 Distribution:');
Object.entries(latestDist).forEach(([range, count]) => {
  console.log(`  ${range}: ${count} investors (${(count/100*100).toFixed(1)}%)`);
});

console.log('\n6. RISK SENTIMENT ANALYSIS:');
console.log('----------------------------------------');
const avgCashIncrease = latestMetrics.avgCash - earliestMetrics.avgCash;
const riskSentiment = avgCashIncrease > 2 ? 'MORE RISK-AVERSE' : 
                     avgCashIncrease < -2 ? 'MORE RISK-SEEKING' : 'STABLE';

console.log(`Overall Risk Sentiment: ${riskSentiment}`);
console.log(`Average cash position change: ${avgCashIncrease.toFixed(2)} pp`);

// Count how many investors increased vs decreased cash
let increasedCash = 0;
let decreasedCash = 0;
let stableCash = 0;

consistentTop20.forEach(earliestInv => {
  const latestInv = latestMap.get(earliestInv.userName);
  if (!latestInv) return;

  const earliestCash = earliestInv.portfolio ? 
    Math.max(0, 100 - earliestInv.portfolio.positions.reduce((sum, pos) => sum + (pos.investmentPct || 0), 0)) : 0;
  const latestCash = latestInv.portfolio ? 
    Math.max(0, 100 - latestInv.portfolio.positions.reduce((sum, pos) => sum + (pos.investmentPct || 0), 0)) : 0;

  const cashChange = latestCash - earliestCash;
  
  if (cashChange > 2) increasedCash++;
  else if (cashChange < -2) decreasedCash++;
  else stableCash++;
});

console.log(`\nTop 20 Investors Cash Position Changes:`);
console.log(`  Increased cash (>2pp): ${increasedCash} investors`);
console.log(`  Decreased cash (>2pp): ${decreasedCash} investors`);
console.log(`  Stable cash (±2pp): ${stableCash} investors`);