const fs = require('fs');

// Configuration
const LATEST_DATA_FILE = '/Users/plessas/SourceCode/etoro_census/public/data/etoro-data-2025-08-11-02-07.json';
const OUTPUT_DIR = '/Users/plessas/SourceCode/etoro_census/public/analysis-results/';

console.log('🔧 CORRECTED STOCK ANALYSIS - Fixing Algorithm Flaws');
console.log('====================================================');

// Load latest data
let data;
try {
    data = JSON.parse(fs.readFileSync(LATEST_DATA_FILE, 'utf8'));
    console.log(`✅ Loaded data from ${data.metadata.collectedAtUTC}`);
} catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
}

// Get top 100 investors (already sorted by copiers)
const top100 = data.investors.slice(0, 100);

// Risk-adjusted scoring function
function calculateRiskAdjustedScore(investor) {
    const gainFactor = investor.gain / Math.max(investor.riskScore, 1);
    const winRatioFactor = (investor.winRatio || 70) / 100;
    const trustFactor = Math.log(Math.max(investor.copiers, 1000) / 1000);
    return gainFactor * winRatioFactor * trustFactor;
}

// Get top 10 risk-adjusted performers
const rankedInvestors = top100.map(investor => ({
    ...investor,
    riskAdjustedScore: calculateRiskAdjustedScore(investor)
})).sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);

const top10Performers = rankedInvestors.slice(0, 10);

console.log('\n🏆 Top 10 Risk-Adjusted Performers:');
top10Performers.forEach((investor, i) => {
    console.log(`${i + 1}. @${investor.userName}: ${investor.gain}% YTD, ${investor.copiers.toLocaleString()} copiers`);
});

// CORRECTED ALGORITHM: Count unique investors per stock
console.log('\n🔍 CORRECTED STOCK ANALYSIS');
console.log('============================');

// Create instrument lookup
const instrumentMap = new Map();
if (data.instruments && data.instruments.details) {
    data.instruments.details.forEach(inst => {
        instrumentMap.set(inst.instrumentId, {
            name: inst.instrumentDisplayName,
            symbol: inst.symbol || `ETORO:${inst.instrumentId}`,
            type: inst.instrumentTypeID === 5 ? 'Stock' : 
                  inst.instrumentTypeID === 10 ? 'Crypto' : 
                  inst.instrumentTypeID === 14 ? 'ETF' : 'Other'
        });
    });
}

function getAssetInfo(instrumentId) {
    return instrumentMap.get(instrumentId) || {
        name: `Unknown Asset ${instrumentId}`,
        symbol: `ID${instrumentId}`,
        type: 'Unknown'
    };
}

// FIXED: Track unique investors per stock
const stockHoldings = new Map();

top10Performers.forEach(investor => {
    if (!investor.portfolio?.positions) return;
    
    // Get unique instruments held by this investor (combine multiple positions of same stock)
    const investorStocks = new Map();
    
    investor.portfolio.positions.forEach(position => {
        const id = position.instrumentId;
        const currentAllocation = investorStocks.get(id) || 0;
        investorStocks.set(id, currentAllocation + (position.investmentPct || 0));
    });
    
    // Now add this investor's holdings to the overall analysis
    investorStocks.forEach((totalAllocation, instrumentId) => {
        if (!stockHoldings.has(instrumentId)) {
            stockHoldings.set(instrumentId, {
                instrumentId,
                uniqueInvestors: new Set(),
                totalAllocation: 0,
                investorPerformances: []
            });
        }
        
        const holding = stockHoldings.get(instrumentId);
        holding.uniqueInvestors.add(investor.userName);
        holding.totalAllocation += totalAllocation;
        holding.investorPerformances.push(investor.gain);
    });
});

// Convert to analysis results with CORRECTED counting
const correctedRecommendations = Array.from(stockHoldings.values())
    .filter(holding => holding.uniqueInvestors.size >= 3) // At least 3 unique investors
    .map(holding => {
        const assetInfo = getAssetInfo(holding.instrumentId);
        const avgPerformance = holding.investorPerformances.reduce((sum, perf) => sum + perf, 0) / holding.investorPerformances.length;
        const avgAllocation = holding.totalAllocation / holding.uniqueInvestors.size;
        
        return {
            instrumentId: holding.instrumentId,
            ...assetInfo,
            uniqueInvestorsCount: holding.uniqueInvestors.size,
            investorsList: Array.from(holding.uniqueInvestors),
            avgAllocationPerInvestor: avgAllocation,
            avgPerformanceOfHolders: avgPerformance,
            convictionLevel: holding.uniqueInvestors.size >= 7 ? 'HIGH' : 
                           holding.uniqueInvestors.size >= 5 ? 'MEDIUM' : 'LOW',
            // More conservative scoring
            score: (holding.uniqueInvestors.size * 0.5) + (avgAllocation * 0.3) + (avgPerformance * 0.2)
        };
    })
    .sort((a, b) => b.uniqueInvestorsCount - a.uniqueInvestorsCount); // Sort by actual investor count

console.log('\n📊 CORRECTED RECOMMENDATIONS (Sorted by # of Unique Investors):');
console.log('================================================================');

if (correctedRecommendations.length === 0) {
    console.log('❌ NO stocks held by 3+ top performers found!');
    console.log('This suggests top performers have very diverse/unique portfolios.');
} else {
    correctedRecommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.symbol} - ${rec.name}`);
        console.log(`   👥 Held by ${rec.uniqueInvestorsCount}/10 top performers (${rec.convictionLevel} conviction)`);
        console.log(`   🎯 Investors: ${rec.investorsList.join(', ')}`);
        console.log(`   📊 Avg allocation: ${rec.avgAllocationPerInvestor.toFixed(1)}%`);
        console.log(`   📈 Avg holder performance: ${rec.avgPerformanceOfHolders.toFixed(1)}%`);
        console.log(`   🏆 Score: ${rec.score.toFixed(2)}\n`);
    });
}

// Analyze what top performers actually hold in common
console.log('\n🔍 WHAT DO TOP PERFORMERS ACTUALLY HOLD?');
console.log('=========================================');

const allHoldings = Array.from(stockHoldings.values())
    .sort((a, b) => b.uniqueInvestors.size - a.uniqueInvestors.size);

console.log('📋 All Holdings by Top 10 Performers (descending by investor count):');
allHoldings.slice(0, 20).forEach((holding, i) => {
    const assetInfo = getAssetInfo(holding.instrumentId);
    console.log(`${i + 1}. ${assetInfo.symbol} (${assetInfo.name})`);
    console.log(`   👥 ${holding.uniqueInvestors.size}/10 investors: ${Array.from(holding.uniqueInvestors).join(', ')}`);
    console.log(`   💼 Avg allocation: ${(holding.totalAllocation / holding.uniqueInvestors.size).toFixed(1)}%`);
    console.log(`   📊 Type: ${assetInfo.type}\n`);
});

// Core holdings analysis (most popular among ALL top 100)
console.log('\n🌟 CORE HOLDINGS ANALYSIS (Top 100 Investors)');
console.log('==============================================');

const allTop100Holdings = new Map();

top100.forEach(investor => {
    if (!investor.portfolio?.positions) return;
    
    const investorStocks = new Map();
    investor.portfolio.positions.forEach(position => {
        const id = position.instrumentId;
        const currentAllocation = investorStocks.get(id) || 0;
        investorStocks.set(id, currentAllocation + (position.investmentPct || 0));
    });
    
    investorStocks.forEach((totalAllocation, instrumentId) => {
        if (!allTop100Holdings.has(instrumentId)) {
            allTop100Holdings.set(instrumentId, {
                instrumentId,
                investors: new Set(),
                totalAllocation: 0
            });
        }
        
        const holding = allTop100Holdings.get(instrumentId);
        holding.investors.add(investor.userName);
        holding.totalAllocation += totalAllocation;
    });
});

const coreHoldings = Array.from(allTop100Holdings.values())
    .filter(holding => holding.investors.size >= 20) // Held by 20+ investors
    .map(holding => {
        const assetInfo = getAssetInfo(holding.instrumentId);
        return {
            ...assetInfo,
            investorCount: holding.investors.size,
            holdingPercentage: (holding.investors.size / 100) * 100,
            avgAllocation: holding.totalAllocation / holding.investors.size
        };
    })
    .sort((a, b) => b.investorCount - a.investorCount);

console.log('🏆 TRUE CORE HOLDINGS (20+ investors):');
coreHoldings.forEach((holding, i) => {
    console.log(`${i + 1}. ${holding.symbol} - ${holding.name}`);
    console.log(`   👥 ${holding.investorCount}/100 investors (${holding.holdingPercentage.toFixed(0)}%)`);
    console.log(`   💼 Avg allocation: ${holding.avgAllocation.toFixed(1)}%`);
    console.log(`   📊 Type: ${holding.type}\n`);
});

// Reality Check Summary
console.log('\n💡 REALITY CHECK SUMMARY');
console.log('========================');

console.log(`❌ Original algorithm error: Counted individual positions instead of unique investors`);
console.log(`✅ Corrected findings:`);
console.log(`   • Stocks held by 3+ top performers: ${correctedRecommendations.length}`);
console.log(`   • Most popular stock among top 10: ${allHoldings[0] ? getAssetInfo(allHoldings[0].instrumentId).symbol : 'None'} (${allHoldings[0]?.uniqueInvestors.size || 0}/10)`);
console.log(`   • True core holdings (20+ investors): ${coreHoldings.length}`);

if (correctedRecommendations.length < 5) {
    console.log('\n🎯 KEY INSIGHT: Top performers have VERY diverse portfolios!');
    console.log('Most "recommendations" were held by only 1-2 investors.');
    console.log('Focus on the proven core holdings instead of speculative picks.');
}

// Save corrected results
const correctedResults = {
    metadata: {
        analysisDate: new Date().toISOString(),
        correctionNote: "Fixed algorithm that was double-counting positions instead of unique investors",
        topPerformersAnalyzed: 10,
        algorithmError: "Previous recommendations inflated conviction levels due to position counting bug"
    },
    correctedRecommendations,
    coreHoldings,
    topPerformers: top10Performers.map(inv => ({
        userName: inv.userName,
        fullName: inv.fullName,
        gain: inv.gain,
        riskScore: inv.riskScore,
        copiers: inv.copiers,
        riskAdjustedScore: inv.riskAdjustedScore
    })),
    keyFindings: {
        stocksWith3PlusInvestors: correctedRecommendations.length,
        coreHoldingsCount: coreHoldings.length,
        mostCommonStock: allHoldings[0] ? {
            symbol: getAssetInfo(allHoldings[0].instrumentId).symbol,
            investors: allHoldings[0].uniqueInvestors.size
        } : null
    }
};

const outputFile = `${OUTPUT_DIR}corrected-analysis-${new Date().toISOString().split('T')[0]}.json`;
fs.writeFileSync(outputFile, JSON.stringify(correctedResults, null, 2));

console.log(`\n💾 Corrected analysis saved to: ${outputFile}`);
console.log('\n✅ CORRECTED Analysis Complete!');