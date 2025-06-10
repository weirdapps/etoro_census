#!/usr/bin/env node

/**
 * eToro Census - Cash Position Trends Analysis
 * 
 * Deep dive analysis of cash holding patterns across investor bands
 * and identification of defensive vs aggressive positioning trends.
 * 
 * Usage: node analysis-tools/market-behavior/analyze-cash-trends.js [band]
 * 
 * Examples:
 *   node analysis-tools/market-behavior/analyze-cash-trends.js 100
 *   node analysis-tools/market-behavior/analyze-cash-trends.js all
 * 
 * Outputs:
 * - Cash position distribution analysis (0-100% of equity)
 * - Individual investor cash changes
 * - Risk sentiment indicators
 * - Correlation with performance metrics
 * 
 * Cash Calculation: 100% - (sum of all position investment percentages)
 * This represents the percentage of investor's equity held in cash vs invested positions.
 */

const fs = require('fs');
const path = require('path');

// Get all JSON data files
function getDataFiles() {
    const dataDir = path.join(__dirname, '../../public/data');
    const files = fs.readdirSync(dataDir)
        .filter(file => file.startsWith('etoro-data-') && file.endsWith('.json'))
        .sort();
    
    if (files.length < 2) {
        console.error('❌ Need at least 2 data files for comparison');
        process.exit(1);
    }
    
    return files;
}

// Load and parse JSON data
function loadData(filename) {
    const filepath = path.join(__dirname, '../../public/data', filename);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return data;
}

// Calculate cash position for investor (percentage of equity not invested in positions)
function calculateCash(investor) {
    if (!investor.portfolio || !investor.portfolio.positions) {
        return 0;
    }
    
    // Sum all position investments
    const totalInvested = investor.portfolio.positions.reduce((sum, position) => {
        return sum + (position.investmentPct || 0);
    }, 0);
    
    // Cash is the percentage not invested in positions
    const cashPct = Math.max(0, 100 - totalInvested);
    return cashPct;
}

// Analyze cash trends for a specific band
function analyzeCashTrends(oldData, newData, bandSize) {
    const oldInvestors = oldData.investors.slice(0, bandSize);
    const newInvestors = newData.investors.slice(0, bandSize);
    
    // Create investor mapping by username
    const oldInvestorMap = new Map();
    const newInvestorMap = new Map();
    
    oldInvestors.forEach(inv => oldInvestorMap.set(inv.userName, inv));
    newInvestors.forEach(inv => newInvestorMap.set(inv.userName, inv));
    
    // Analyze cash changes for consistent investors
    const cashChanges = [];
    const oldCashDistribution = { '0-5%': 0, '5-10%': 0, '11-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };
    const newCashDistribution = { '0-5%': 0, '5-10%': 0, '11-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };
    
    let totalOldCash = 0;
    let totalNewCash = 0;
    let consistentInvestors = 0;
    
    // Process old investors
    oldInvestors.forEach(investor => {
        const cash = calculateCash(investor);
        totalOldCash += cash;
        
        // Cash distribution
        if (cash < 5) oldCashDistribution['0-5%']++;
        else if (cash < 10) oldCashDistribution['5-10%']++;
        else if (cash < 25) oldCashDistribution['11-25%']++;
        else if (cash < 50) oldCashDistribution['26-50%']++;
        else if (cash < 75) oldCashDistribution['51-75%']++;
        else oldCashDistribution['76-100%']++;
        
        // Check if investor exists in new data
        if (newInvestorMap.has(investor.userName)) {
            const newInvestor = newInvestorMap.get(investor.userName);
            const newCash = calculateCash(newInvestor);
            const cashChange = newCash - cash;
            
            cashChanges.push({
                userName: investor.userName,
                fullName: investor.fullName,
                oldCash: cash,
                newCash: newCash,
                change: cashChange,
                oldGain: investor.gain,
                newGain: newInvestor.gain,
                gainChange: newInvestor.gain - investor.gain,
                copiers: newInvestor.copiers,
                oldRiskScore: investor.riskScore,
                newRiskScore: newInvestor.riskScore,
                oldPositions: investor.portfolio.positionsCount,
                newPositions: newInvestor.portfolio.positionsCount
            });
            consistentInvestors++;
        }
    });
    
    // Process new investors
    newInvestors.forEach(investor => {
        const cash = calculateCash(investor);
        totalNewCash += cash;
        
        // Cash distribution
        if (cash < 5) newCashDistribution['0-5%']++;
        else if (cash < 10) newCashDistribution['5-10%']++;
        else if (cash < 25) newCashDistribution['11-25%']++;
        else if (cash < 50) newCashDistribution['26-50%']++;
        else if (cash < 75) newCashDistribution['51-75%']++;
        else newCashDistribution['76-100%']++;
    });
    
    // Sort cash changes
    cashChanges.sort((a, b) => b.change - a.change);
    
    const avgOldCash = totalOldCash / oldInvestors.length;
    const avgNewCash = totalNewCash / newInvestors.length;
    
    return {
        bandSize,
        consistentInvestors,
        avgOldCash,
        avgNewCash,
        avgCashChange: avgNewCash - avgOldCash,
        oldDistribution: oldCashDistribution,
        newDistribution: newCashDistribution,
        cashChanges,
        riskSentiment: calculateRiskSentiment(cashChanges)
    };
}

// Calculate risk sentiment indicators
function calculateRiskSentiment(cashChanges) {
    if (cashChanges.length === 0) return {};
    
    const increasing = cashChanges.filter(inv => inv.change > 2).length;
    const decreasing = cashChanges.filter(inv => inv.change < -2).length;
    const stable = cashChanges.filter(inv => Math.abs(inv.change) <= 2).length;
    
    const avgCashChange = cashChanges.reduce((sum, inv) => sum + inv.change, 0) / cashChanges.length;
    const avgGainChange = cashChanges.reduce((sum, inv) => sum + inv.gainChange, 0) / cashChanges.length;
    
    // Calculate correlation between cash change and gain change
    const cashChanges_deviations = cashChanges.map(inv => inv.change - avgCashChange);
    const gainChanges_deviations = cashChanges.map(inv => inv.gainChange - avgGainChange);
    
    const numerator = cashChanges_deviations.reduce((sum, deviation, i) => 
        sum + deviation * gainChanges_deviations[i], 0);
    const denominatorCash = Math.sqrt(cashChanges_deviations.reduce((sum, d) => sum + d * d, 0));
    const denominatorGain = Math.sqrt(gainChanges_deviations.reduce((sum, d) => sum + d * d, 0));
    
    const correlation = denominatorCash && denominatorGain ? 
        numerator / (denominatorCash * denominatorGain) : 0;
    
    return {
        increasing,
        decreasing,
        stable,
        increasingPct: (increasing / cashChanges.length * 100).toFixed(1),
        decreasingPct: (decreasing / cashChanges.length * 100).toFixed(1),
        stablePct: (stable / cashChanges.length * 100).toFixed(1),
        avgCashChange,
        avgGainChange,
        cashGainCorrelation: correlation
    };
}

// Analyze and display results for a band
function analyzeBand(oldData, newData, bandSize) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`💰 CASH TRENDS ANALYSIS - TOP ${bandSize} INVESTORS`);
    console.log(`${'='.repeat(80)}`);
    
    const analysis = analyzeCashTrends(oldData, newData, bandSize);
    
    // Overall cash trend
    console.log(`\n📊 OVERALL CASH POSITION CHANGES:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Average Cash: ${analysis.avgOldCash.toFixed(2)}% → ${analysis.avgNewCash.toFixed(2)}% (${analysis.avgCashChange >= 0 ? '+' : ''}${analysis.avgCashChange.toFixed(2)}pp)`);
    console.log(`Consistent Investors: ${analysis.consistentInvestors}/${bandSize} (${(analysis.consistentInvestors/bandSize*100).toFixed(1)}%)`);
    
    // Cash distribution changes
    console.log(`\n📈 CASH DISTRIBUTION CHANGES:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    Object.keys(analysis.oldDistribution).forEach(range => {
        const oldCount = analysis.oldDistribution[range];
        const newCount = analysis.newDistribution[range];
        const change = newCount - oldCount;
        const changeStr = change === 0 ? '±0' : (change > 0 ? `+${change}` : `${change}`);
        const direction = change > 0 ? '📈' : change < 0 ? '📉' : '─';
        console.log(`  ${range.padEnd(8)}: ${oldCount.toString().padStart(3)} → ${newCount.toString().padStart(3)} (${changeStr.padStart(3)}) ${direction}`);
    });
    
    // Risk sentiment analysis
    const sentiment = analysis.riskSentiment;
    console.log(`\n🎯 RISK SENTIMENT ANALYSIS:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Cash Increasing (>2pp): ${sentiment.increasing} investors (${sentiment.increasingPct}%)`);
    console.log(`Cash Stable (±2pp):     ${sentiment.stable} investors (${sentiment.stablePct}%)`);
    console.log(`Cash Decreasing (<-2pp): ${sentiment.decreasing} investors (${sentiment.decreasingPct}%)`);
    console.log(`Average Cash Change:     ${sentiment.avgCashChange >= 0 ? '+' : ''}${sentiment.avgCashChange.toFixed(2)}pp`);
    console.log(`Average Gain Change:     ${sentiment.avgGainChange >= 0 ? '+' : ''}${sentiment.avgGainChange.toFixed(2)}pp`);
    console.log(`Cash-Gain Correlation:   ${sentiment.cashGainCorrelation.toFixed(3)} ${Math.abs(sentiment.cashGainCorrelation) > 0.3 ? '📊' : '─'}`);
    
    // Top cash increasers
    const topIncreasers = analysis.cashChanges.slice(0, 10);
    if (topIncreasers.length > 0) {
        console.log(`\n📈 TOP CASH INCREASERS (Defensive Moves):`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        topIncreasers.forEach((inv, i) => {
            const gainStr = inv.gainChange >= 0 ? `+${inv.gainChange.toFixed(1)}%` : `${inv.gainChange.toFixed(1)}%`;
            console.log(`${(i+1).toString().padStart(2)}. ${inv.fullName} (@${inv.userName})`);
            console.log(`    Cash: ${inv.oldCash.toFixed(1)}% → ${inv.newCash.toFixed(1)}% (+${inv.change.toFixed(1)}pp) | Gain: ${gainStr} | ${inv.copiers.toLocaleString()} copiers`);
        });
    }
    
    // Top cash decreasers
    const topDecreasers = analysis.cashChanges.slice(-10).reverse();
    if (topDecreasers.length > 0 && topDecreasers[0].change < -2) {
        console.log(`\n📉 TOP CASH DECREASERS (Aggressive Moves):`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        topDecreasers.forEach((inv, i) => {
            if (inv.change < -2) {
                const gainStr = inv.gainChange >= 0 ? `+${inv.gainChange.toFixed(1)}%` : `${inv.gainChange.toFixed(1)}%`;
                console.log(`${(i+1).toString().padStart(2)}. ${inv.fullName} (@${inv.userName})`);
                console.log(`    Cash: ${inv.oldCash.toFixed(1)}% → ${inv.newCash.toFixed(1)}% (${inv.change.toFixed(1)}pp) | Gain: ${gainStr} | ${inv.copiers.toLocaleString()} copiers`);
            }
        });
    }
    
    return analysis;
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    const requestedBand = args[0];
    
    console.log('💰 eToro Census - Cash Position Trends Analysis');
    console.log('══════════════════════════════════════════════════════════════════════════════════');
    
    const files = getDataFiles();
    console.log(`\nAnalyzing: ${files[0]} → ${files[files.length - 1]}`);
    
    const oldData = loadData(files[0]);
    const newData = loadData(files[files.length - 1]);
    
    // Determine which bands to analyze
    const bands = [];
    if (!requestedBand || requestedBand === 'all') {
        bands.push(100, 500, 1000, 1500);
    } else {
        const band = parseInt(requestedBand);
        if (![100, 500, 1000, 1500].includes(band)) {
            console.error('❌ Invalid band. Use: 100, 500, 1000, 1500, or "all"');
            process.exit(1);
        }
        bands.push(band);
    }
    
    const results = [];
    for (const band of bands) {
        results.push(analyzeBand(oldData, newData, band));
    }
    
    // Cross-band comparison
    if (results.length > 1) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔄 CROSS-BAND CASH BEHAVIOR COMPARISON`);
        console.log(`${'='.repeat(80)}`);
        
        console.log(`\n💰 Cash Changes by Investor Tier:`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        results.forEach(result => {
            const sentiment = result.riskSentiment;
            const trend = result.avgCashChange >= 0 ? '📈 Defensive' : '📉 Aggressive';
            console.log(`  Top ${result.bandSize.toString().padStart(4)}: ${result.avgCashChange >= 0 ? '+' : ''}${result.avgCashChange.toFixed(2)}pp | ${sentiment.increasingPct}% ↑ ${sentiment.decreasingPct}% ↓ | ${trend}`);
        });
        
        console.log(`\n🎯 Risk Appetite Indicators:`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        results.forEach(result => {
            const sentiment = result.riskSentiment;
            const riskAppetite = parseFloat(sentiment.decreasingPct) > parseFloat(sentiment.increasingPct) ? 'Risk-On' : 'Risk-Off';
            console.log(`  Top ${result.bandSize.toString().padStart(4)}: ${riskAppetite.padEnd(8)} | Cash-Gain Corr: ${sentiment.cashGainCorrelation.toFixed(3)}`);
        });
    }
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Analysis completed: ${new Date().toISOString()}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    analyzeCashTrends,
    calculateRiskSentiment
};