const fs = require('fs');

// Get all data files from May 31 to July 31
const dataFiles = [
    'etoro-data-2025-05-31-01-33.json',
    'etoro-data-2025-06-01-02-33.json', 
    'etoro-data-2025-06-02-02-01.json',
    'etoro-data-2025-06-03-01-32.json',
    'etoro-data-2025-06-04-01-32.json',
    'etoro-data-2025-06-05-01-30.json',
    'etoro-data-2025-06-06-01-32.json',
    'etoro-data-2025-06-07-01-57.json',
    'etoro-data-2025-06-08-01-37.json',
    'etoro-data-2025-06-09-01-36.json',
    'etoro-data-2025-06-10-01-32.json',
    'etoro-data-2025-06-11-01-32.json',
    'etoro-data-2025-06-12-01-32.json',
    'etoro-data-2025-06-13-01-31.json',
    'etoro-data-2025-06-14-01-55.json',
    'etoro-data-2025-06-15-02-05.json',
    'etoro-data-2025-06-16-02-01.json',
    'etoro-data-2025-06-17-01-57.json',
    'etoro-data-2025-06-18-01-58.json',
    'etoro-data-2025-06-19-01-58.json',
    'etoro-data-2025-06-20-01-58.json',
    'etoro-data-2025-06-21-01-58.json',
    'etoro-data-2025-06-22-02-04.json',
    'etoro-data-2025-06-23-02-02.json',
    'etoro-data-2025-06-24-02-00.json',
    'etoro-data-2025-06-25-02-01.json',
    'etoro-data-2025-06-26-02-01.json',
    'etoro-data-2025-06-27-01-59.json',
    'etoro-data-2025-06-28-01-57.json',
    'etoro-data-2025-06-29-02-05.json',
    'etoro-data-2025-06-30-02-03.json',
    'etoro-data-2025-07-01-02-07.json',
    'etoro-data-2025-07-02-02-00.json',
    'etoro-data-2025-07-03-02-01.json',
    'etoro-data-2025-07-04-02-00.json',
    'etoro-data-2025-07-05-01-57.json',
    'etoro-data-2025-07-06-02-05.json',
    'etoro-data-2025-07-07-02-04.json',
    'etoro-data-2025-07-08-02-00.json',
    'etoro-data-2025-07-09-02-02.json',
    'etoro-data-2025-07-10-08-23.json',
    'etoro-data-2025-07-11-02-03.json',
    'etoro-data-2025-07-12-02-03.json',
    'etoro-data-2025-07-13-02-08.json',
    'etoro-data-2025-07-14-02-05.json',
    'etoro-data-2025-07-15-02-04.json',
    'etoro-data-2025-07-16-02-03.json',
    'etoro-data-2025-07-17-02-04.json',
    'etoro-data-2025-07-18-02-03.json',
    'etoro-data-2025-07-19-02-01.json',
    'etoro-data-2025-07-20-02-09.json',
    'etoro-data-2025-07-21-02-08.json',
    'etoro-data-2025-07-22-02-02.json',
    'etoro-data-2025-07-23-02-05.json',
    'etoro-data-2025-07-24-02-03.json',
    'etoro-data-2025-07-25-02-05.json',
    'etoro-data-2025-07-26-02-02.json',
    'etoro-data-2025-07-27-02-08.json',
    'etoro-data-2025-07-28-02-08.json',
    'etoro-data-2025-07-29-02-10.json',
    'etoro-data-2025-07-30-02-05.json',
    'etoro-data-2025-07-31-02-05.json'
];

const dataPath = '/Users/plessas/SourceCode/etoro_census/public/data/';

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
console.log('// Risk = Daily average over May 31 - July 31');  
console.log('// Return = Total period return (end - start)');
console.log('const realInvestorData = [');

top100.forEach(inv => {
    const needsLabel = inv.copiers > 20000 || inv.periodReturn > 15 || inv.periodReturn < -5;
    const labelStr = needsLabel ? `, label: '@${inv.username}'` : '';
    
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
- Period: May 31 - July 31, 2025 (${filesProcessed} daily data points)
- Ranking: Top 100 by copier count
- Risk calculation: Daily average over ${filesProcessed} days
- Return calculation: Total period return (end gain - start gain)
- Average Risk: ${avgRisk}
- Average Return: ${avgReturn}%
- Return Range: ${minReturn}% to ${maxReturn}%
- Risk Range: ${minRisk} to ${maxRisk}
- Data points per investor: ~${Math.round(top100.reduce((sum, inv) => sum + inv.dataPoints, 0) / 100)}`);