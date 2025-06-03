const fs = require('fs');
const path = require('path');

// Get instrument name from command line
const searchTerm = process.argv[2];
if (!searchTerm) {
  console.log('Usage: node find-top-holders.js <instrument-name>');
  process.exit(1);
}

// Use latest data file
const dataDir = path.join(__dirname, "..", "..", "public", "data");
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort();

const latestData = JSON.parse(fs.readFileSync(path.join(dataDir, files[files.length - 1]), 'utf8'));

// Find matching instrument
let instrumentId = null;
let instrumentName = null;

for (const inst of latestData.instruments.details || []) {
  if (inst.instrumentDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.symbolFull?.toLowerCase().includes(searchTerm.toLowerCase())) {
    instrumentId = inst.instrumentId;
    instrumentName = inst.instrumentDisplayName;
    break;
  }
}

if (!instrumentId) {
  console.log(`No instrument found matching: ${searchTerm}`);
  process.exit(1);
}

console.log(`\nTop holders of ${instrumentName}:\n`);

// Find all holders
const holders = [];
for (const investor of latestData.investors) {
  if (investor.portfolio?.positions) {
    const positions = investor.portfolio.positions.filter(p => p.instrumentId === instrumentId);
    if (positions.length > 0) {
      const totalAllocation = positions.reduce((sum, p) => sum + (p.investmentPct || 0), 0);
      holders.push({
        username: investor.userName,
        fullName: investor.fullName,
        allocation: totalAllocation,
        copiers: investor.copiers,
        gain: investor.gain,
        riskScore: investor.riskScore
      });
    }
  }
}

// Sort by allocation and show top 10
holders.sort((a, b) => b.allocation - a.allocation);
holders.slice(0, 10).forEach((h, i) => {
  console.log(`${i + 1}. @${h.username} (${h.fullName})`);
  console.log(`   Allocation: ${h.allocation.toFixed(1)}%`);
  console.log(`   Copiers: ${h.copiers} | Gain: ${h.gain.toFixed(1)}% | Risk: ${h.riskScore}/10`);
  console.log('');
});

console.log(`Total holders: ${holders.length} out of ${latestData.metadata.totalInvestors} investors (${(holders.length / latestData.metadata.totalInvestors * 100).toFixed(1)}%)`);