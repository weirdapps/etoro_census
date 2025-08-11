const fs = require('fs');

// Configuration
const LATEST_DATA_FILE = '/Users/plessas/SourceCode/etoro_census/public/data/etoro-data-2025-08-11-02-07.json';
const OUTPUT_DIR = '/Users/plessas/SourceCode/etoro_census/public/analysis-results/';

console.log('🚀 eToro Top 100 Performance Analysis & Stock Recommendations');
console.log('===============================================================');

// Load latest data
let data;
try {
    data = JSON.parse(fs.readFileSync(LATEST_DATA_FILE, 'utf8'));
    console.log(`✅ Loaded data from ${data.metadata.collectedAtUTC}`);
    console.log(`📊 Total investors: ${data.metadata.totalInvestors}`);
} catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
}

// Get top 100 investors (they're already sorted by copiers)
const top100 = data.investors.slice(0, 100);
console.log(`\n🎯 Analyzing top 100 investors by copier count...`);

// Performance Analysis Functions
function calculateRiskAdjustedScore(investor) {
    // Higher score = better risk-adjusted performance
    // Formula: (YTD Gain / Risk Score) * (Win Ratio / 100) * log(Copiers/1000)
    const gainFactor = investor.gain / Math.max(investor.riskScore, 1);
    const winRatioFactor = (investor.winRatio || 70) / 100;
    const trustFactor = Math.log(Math.max(investor.copiers, 1000) / 1000);
    
    return gainFactor * winRatioFactor * trustFactor;
}

function calculateCashPercentage(portfolio) {
    if (!portfolio || !portfolio.positions) return 0;
    
    const totalInvestment = portfolio.positions.reduce((sum, pos) => 
        sum + (pos.investmentPct || 0), 0);
    return Math.max(0, 100 - totalInvestment);
}

function getTopHoldings(portfolios, instruments) {
    const instrumentMap = new Map();
    
    // Create instrument lookup
    const instLookup = new Map();
    if (instruments && instruments.details) {
        instruments.details.forEach(inst => {
            instLookup.set(inst.instrumentId, {
                name: inst.instrumentDisplayName,
                symbol: inst.symbol || `ID${inst.instrumentId}`,
                imageUrl: inst.images?.[0]?.imageUrl || ''
            });
        });
    }
    
    // Aggregate holdings
    portfolios.forEach(portfolio => {
        if (!portfolio.positions) return;
        
        portfolio.positions.forEach(position => {
            const id = position.instrumentId;
            if (!instrumentMap.has(id)) {
                const instInfo = instLookup.get(id) || {
                    name: `Unknown Asset ${id}`,
                    symbol: `ID${id}`,
                    imageUrl: ''
                };
                
                instrumentMap.set(id, {
                    instrumentId: id,
                    ...instInfo,
                    holders: 0,
                    totalAllocation: 0,
                    positions: []
                });
            }
            
            const holding = instrumentMap.get(id);
            holding.holders++;
            holding.totalAllocation += position.investmentPct || 0;
            holding.positions.push(position);
        });
    });
    
    // Convert to array and sort
    return Array.from(instrumentMap.values())
        .sort((a, b) => b.holders - a.holders)
        .slice(0, 20)
        .map(holding => ({
            ...holding,
            averageAllocation: holding.totalAllocation / holding.holders,
            holdersPercentage: (holding.holders / portfolios.length) * 100
        }));
}

// 1. Performance Metrics Analysis
console.log('\n📈 PERFORMANCE METRICS ANALYSIS');
console.log('=====================================');

const performanceMetrics = {
    avgYtdGain: 0,
    avgRiskScore: 0,
    avgWinRatio: 0,
    avgTrades: 0,
    avgCopiers: 0,
    totalTrades: 0,
    bestPerformers: [],
    worstPerformers: []
};

// Calculate metrics
let totalGain = 0, totalRisk = 0, totalWinRatio = 0, totalTrades = 0, totalCopiers = 0;
let validGainCount = 0, validRiskCount = 0, validWinRatioCount = 0, validTradesCount = 0;

top100.forEach(investor => {
    if (investor.gain != null) {
        totalGain += investor.gain;
        validGainCount++;
    }
    if (investor.riskScore != null) {
        totalRisk += investor.riskScore;
        validRiskCount++;
    }
    if (investor.winRatio != null) {
        totalWinRatio += investor.winRatio;
        validWinRatioCount++;
    }
    if (investor.trades != null) {
        totalTrades += investor.trades;
        validTradesCount++;
    }
    totalCopiers += investor.copiers || 0;
});

performanceMetrics.avgYtdGain = validGainCount > 0 ? totalGain / validGainCount : 0;
performanceMetrics.avgRiskScore = validRiskCount > 0 ? totalRisk / validRiskCount : 0;
performanceMetrics.avgWinRatio = validWinRatioCount > 0 ? totalWinRatio / validWinRatioCount : 0;
performanceMetrics.avgTrades = validTradesCount > 0 ? totalTrades / validTradesCount : 0;
performanceMetrics.avgCopiers = totalCopiers / top100.length;
performanceMetrics.totalTrades = totalTrades;

console.log(`📊 Average YTD Gain: ${performanceMetrics.avgYtdGain.toFixed(2)}%`);
console.log(`⚡ Average Risk Score: ${performanceMetrics.avgRiskScore.toFixed(2)}`);
console.log(`🎯 Average Win Ratio: ${performanceMetrics.avgWinRatio.toFixed(2)}%`);
console.log(`🔄 Average Trades: ${performanceMetrics.avgTrades.toFixed(0)}`);
console.log(`👥 Average Copiers: ${Math.round(performanceMetrics.avgCopiers).toLocaleString()}`);

// 2. Risk-Adjusted Performance Ranking
console.log('\n🏆 TOP RISK-ADJUSTED PERFORMERS');
console.log('==================================');

const rankedInvestors = top100.map(investor => ({
    ...investor,
    riskAdjustedScore: calculateRiskAdjustedScore(investor),
    cashPercentage: calculateCashPercentage(investor.portfolio)
})).sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);

performanceMetrics.bestPerformers = rankedInvestors.slice(0, 10);
performanceMetrics.worstPerformers = rankedInvestors.slice(-5);

console.log('🥇 Top 10 Risk-Adjusted Performers:');
performanceMetrics.bestPerformers.forEach((investor, i) => {
    console.log(`${i + 1}. @${investor.userName} (${investor.fullName})`);
    console.log(`   📈 YTD: ${investor.gain}% | 🎯 Win Rate: ${investor.winRatio}% | ⚡ Risk: ${investor.riskScore}`);
    console.log(`   👥 Copiers: ${investor.copiers.toLocaleString()} | 💰 Cash: ${investor.cashPercentage.toFixed(1)}%`);
    console.log(`   🏆 Risk-Adj Score: ${investor.riskAdjustedScore.toFixed(3)}\n`);
});

// 3. Portfolio Holdings Analysis
console.log('\n📋 PORTFOLIO HOLDINGS ANALYSIS');
console.log('================================');

const portfolios = top100.map(inv => inv.portfolio).filter(p => p && p.positions);
const topHoldings = getTopHoldings(portfolios, data.instruments);

console.log('🔝 Top Holdings among Top 100 Investors:');
topHoldings.slice(0, 15).forEach((holding, i) => {
    console.log(`${i + 1}. ${holding.symbol} (${holding.name})`);
    console.log(`   👥 ${holding.holders} investors (${holding.holdersPercentage.toFixed(1)}%)`);
    console.log(`   💼 Avg allocation: ${holding.averageAllocation.toFixed(1)}%\n`);
});

// 4. Generate Stock Recommendations
console.log('\n💡 STOCK RECOMMENDATIONS');
console.log('=========================');

// Analyze holdings of top performers
const topPerformerHoldings = new Map();
const top10Performers = performanceMetrics.bestPerformers.slice(0, 10);

top10Performers.forEach(investor => {
    if (!investor.portfolio?.positions) return;
    
    investor.portfolio.positions.forEach(position => {
        const id = position.instrumentId;
        if (!topPerformerHoldings.has(id)) {
            topPerformerHoldings.set(id, {
                instrumentId: id,
                topPerformersCount: 0,
                totalAllocation: 0,
                avgPerformance: 0,
                investors: []
            });
        }
        
        const holding = topPerformerHoldings.get(id);
        holding.topPerformersCount++;
        holding.totalAllocation += position.investmentPct || 0;
        holding.investors.push({
            userName: investor.userName,
            gain: investor.gain,
            allocation: position.investmentPct
        });
    });
});

// Create recommendations
const recommendations = Array.from(topPerformerHoldings.values())
    .filter(holding => holding.topPerformersCount >= 3) // At least 3 top performers hold it
    .map(holding => {
        const avgPerformance = holding.investors.reduce((sum, inv) => sum + inv.gain, 0) / holding.investors.length;
        const instInfo = data.instruments?.details?.find(inst => inst.instrumentId === holding.instrumentId) || {};
        
        return {
            ...holding,
            name: instInfo.instrumentDisplayName || `Asset ${holding.instrumentId}`,
            symbol: instInfo.symbol || `ID${holding.instrumentId}`,
            avgAllocationPerHolder: holding.totalAllocation / holding.topPerformersCount,
            avgPerformanceOfHolders: avgPerformance,
            score: (holding.topPerformersCount * 0.4) + (avgPerformance * 0.4) + ((holding.totalAllocation / holding.topPerformersCount) * 0.2)
        };
    })
    .sort((a, b) => b.score - a.score);

console.log('🎯 Recommended Stocks Based on Top Performer Holdings:');
recommendations.slice(0, 10).forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.symbol} - ${rec.name}`);
    console.log(`   ⭐ Held by ${rec.topPerformersCount}/10 top performers`);
    console.log(`   📊 Avg allocation: ${rec.avgAllocationPerHolder.toFixed(1)}%`);
    console.log(`   📈 Avg holder performance: ${rec.avgPerformanceOfHolders.toFixed(1)}%`);
    console.log(`   🏆 Recommendation score: ${rec.score.toFixed(2)}\n`);
});

// 5. Risk Management Insights
console.log('\n🛡️ RISK MANAGEMENT INSIGHTS');
console.log('=============================');

const cashAnalysis = rankedInvestors.reduce((acc, investor) => {
    if (investor.cashPercentage > 20) acc.highCash++;
    else if (investor.cashPercentage > 10) acc.mediumCash++;
    else acc.lowCash++;
    return acc;
}, { highCash: 0, mediumCash: 0, lowCash: 0 });

console.log('💰 Cash Allocation Distribution:');
console.log(`   High Cash (>20%): ${cashAnalysis.highCash} investors`);
console.log(`   Medium Cash (10-20%): ${cashAnalysis.mediumCash} investors`);
console.log(`   Low Cash (<10%): ${cashAnalysis.lowCash} investors`);

const avgCashTop10 = performanceMetrics.bestPerformers.reduce((sum, inv) => sum + inv.cashPercentage, 0) / 10;
console.log(`\n💡 Top performers hold ${avgCashTop10.toFixed(1)}% cash on average`);

// 6. Save Results
const analysisResults = {
    metadata: {
        analysisDate: new Date().toISOString(),
        dataSource: LATEST_DATA_FILE,
        analyzedInvestors: 100
    },
    performanceMetrics,
    topHoldings: topHoldings.slice(0, 20),
    recommendations: recommendations.slice(0, 15),
    riskInsights: {
        cashAnalysis,
        avgCashTop10,
        riskScoreDistribution: {
            low: rankedInvestors.filter(inv => inv.riskScore <= 3).length,
            medium: rankedInvestors.filter(inv => inv.riskScore > 3 && inv.riskScore <= 5).length,
            high: rankedInvestors.filter(inv => inv.riskScore > 5).length
        }
    },
    detailedRankings: rankedInvestors.slice(0, 50)
};

const outputFile = `${OUTPUT_DIR}top100-analysis-${new Date().toISOString().split('T')[0]}.json`;
fs.writeFileSync(outputFile, JSON.stringify(analysisResults, null, 2));

console.log(`\n💾 Analysis saved to: ${outputFile}`);
console.log('\n✅ Analysis Complete! Check the output file for detailed data.');

// Final Summary
console.log('\n🎯 EXECUTIVE SUMMARY');
console.log('=====================');
console.log(`📊 Top performer: @${performanceMetrics.bestPerformers[0].userName} with ${performanceMetrics.bestPerformers[0].gain}% YTD`);
console.log(`🏆 Best risk-adjusted: Score of ${performanceMetrics.bestPerformers[0].riskAdjustedScore.toFixed(3)}`);
console.log(`📈 Top recommended stock: ${recommendations[0]?.symbol} (held by ${recommendations[0]?.topPerformersCount}/10 top performers)`);
console.log(`💰 Optimal cash level: ~${avgCashTop10.toFixed(0)}% based on top performers`);