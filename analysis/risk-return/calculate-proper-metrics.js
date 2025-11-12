const fs = require('fs');

// Get all data files from May 31 to November 11 (169 daily files)
const dataPath = '/Users/plessas/SourceCode/etoro_census/public/data/';
const dataFiles = fs.readdirSync(dataPath)
    .filter(f => f.startsWith('etoro-data-2025-') && f.endsWith('.json'))
    .sort();

// Track investors across all files
const investorData = new Map();

console.log(`Processing ${dataFiles.length} data files...`);

// Load data from all files
let filesProcessed = 0;
dataFiles.forEach(fileName => {
    try {
        const filePath = dataPath + fileName;
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            data.investors.forEach(investor => {
                const username = investor.userName;
                
                if (!investorData.has(username)) {
                    investorData.set(username, {
                        fullName: investor.fullName,
                        riskScores: [],
                        gains: [],
                        copiers: investor.copiers // Use latest copiers count
                    });
                }
                
                const investorRecord = investorData.get(username);
                investorRecord.riskScores.push(investor.riskScore || 4);
                investorRecord.gains.push(investor.gain || 0);
                investorRecord.copiers = investor.copiers; // Keep updating to latest
            });
            
            filesProcessed++;
        }
    } catch (error) {
        console.log(`Skipping file ${fileName}: ${error.message}`);
    }
});

console.log(`Successfully processed ${filesProcessed} files`);
console.log(`Found ${investorData.size} unique investors`);

// Calculate metrics for each investor
const chartData = [];

investorData.forEach((data, username) => {
    if (data.riskScores.length > 0 && data.gains.length > 0) {
        // Average risk score over the period
        const avgRisk = data.riskScores.reduce((sum, risk) => sum + risk, 0) / data.riskScores.length;
        
        // Total period return: final gain - initial gain
        const periodReturn = data.gains[data.gains.length - 1] - data.gains[0];
        
        chartData.push({
            username,
            fullName: data.fullName,
            avgRisk: Number(avgRisk.toFixed(2)),
            periodReturn: Number(periodReturn.toFixed(2)),
            copiers: data.copiers || 0,
            dataPoints: data.riskScores.length
        });
    }
});

// Sort by copiers (descending) and take top 100
chartData.sort((a, b) => b.copiers - a.copiers);
const top100 = chartData.slice(0, 100);

console.log('\n// Top 100 Popular Investors by Copier Count');
console.log('// Risk = Daily average over May 31 - November 11');
console.log('// Return = Total period return (end - start)');
console.log('const realInvestorData = [');

// Select top 10 for labeling: top 5 performers + top 2 copiers + 3 notable
const sortedByReturn = [...top100].sort((a, b) => b.periodReturn - a.periodReturn);
const labelSet = new Set();

// Top 5 performers
sortedByReturn.slice(0, 5).forEach(inv => labelSet.add(inv.username));

// Top 2 by copiers
top100.slice(0, 2).forEach(inv => labelSet.add(inv.username));

// Add 3 more notable performers (ranks 6-8 by return, if not already labeled)
for (let i = 5; i < sortedByReturn.length && labelSet.size < 10; i++) {
    if (!labelSet.has(sortedByReturn[i].username)) {
        labelSet.add(sortedByReturn[i].username);
    }
}

top100.forEach(inv => {
    const labelStr = labelSet.has(inv.username) ? `, label: '@${inv.username}'` : '';
    console.log(`  { x: ${inv.avgRisk}, y: ${inv.periodReturn}, username: '${inv.username}', fullName: '${inv.fullName}', copiers: ${inv.copiers}${labelStr} },`);
});

console.log('];');

// Calculate stats
const avgRisk = (top100.reduce((sum, inv) => sum + inv.avgRisk, 0) / 100).toFixed(2);
const avgReturn = (top100.reduce((sum, inv) => sum + inv.periodReturn, 0) / 100).toFixed(1);
const minReturn = Math.min(...top100.map(inv => inv.periodReturn)).toFixed(1);
const maxReturn = Math.max(...top100.map(inv => inv.periodReturn)).toFixed(1);
const minRisk = Math.min(...top100.map(inv => inv.avgRisk)).toFixed(1);
const maxRisk = Math.max(...top100.map(inv => inv.avgRisk)).toFixed(1);

console.log(`\nCorrect Statistics:
- Period: May 31 - November 11, 2025 (${filesProcessed} daily data points / ~5.5 months)
- Ranking: Top 100 by copier count
- Risk calculation: Daily average over ${filesProcessed} days
- Return calculation: Total period return (end gain - start gain)
- Average Risk: ${avgRisk}
- Average Return: ${avgReturn}%
- Return Range: ${minReturn}% to ${maxReturn}%
- Risk Range: ${minRisk} to ${maxRisk}
- Data points per investor: ~${Math.round(top100.reduce((sum, inv) => sum + inv.dataPoints, 0) / 100)}`);