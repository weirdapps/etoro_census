const fs = require('fs');

// Load the latest analysis results
const ANALYSIS_FILE = '/Users/plessas/SourceCode/etoro_census/public/analysis-results/top100-analysis-2025-08-11.json';
const DATA_FILE = '/Users/plessas/SourceCode/etoro_census/public/data/etoro-data-2025-08-11-02-07.json';

console.log('📊 DETAILED STOCK RECOMMENDATIONS REPORT');
console.log('==========================================');

let analysisData, rawData;
try {
    analysisData = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf8'));
    rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('✅ Data loaded successfully\n');
} catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
}

// Create instrument mapping for better asset identification
const instrumentMap = new Map();
if (rawData.instruments && rawData.instruments.details) {
    rawData.instruments.details.forEach(inst => {
        instrumentMap.set(inst.instrumentId, {
            name: inst.instrumentDisplayName,
            symbol: inst.symbol || `ETORO:${inst.instrumentId}`,
            exchange: inst.exchangeName || 'Unknown',
            type: inst.instrumentTypeID === 5 ? 'Stock' : 
                  inst.instrumentTypeID === 10 ? 'Crypto' : 
                  inst.instrumentTypeID === 14 ? 'ETF' : 'Other'
        });
    });
}

function getAssetInfo(instrumentId) {
    return instrumentMap.get(instrumentId) || {
        name: `Unknown Asset`,
        symbol: `ID${instrumentId}`,
        exchange: 'Unknown',
        type: 'Unknown'
    };
}

// Analyze the top recommended stocks with proper details
console.log('🏆 TOP STOCK RECOMMENDATIONS WITH DETAILED ANALYSIS');
console.log('====================================================\n');

const detailedRecommendations = analysisData.recommendations.slice(0, 10).map(rec => {
    const assetInfo = getAssetInfo(rec.instrumentId);
    return {
        ...rec,
        ...assetInfo,
        confidenceLevel: rec.topPerformersCount >= 5 ? 'HIGH' : rec.topPerformersCount >= 3 ? 'MEDIUM' : 'LOW'
    };
});

detailedRecommendations.forEach((stock, i) => {
    console.log(`${i + 1}. ${stock.symbol} - ${stock.name}`);
    console.log(`   🏢 Exchange: ${stock.exchange} | Type: ${stock.type}`);
    console.log(`   ⭐ Confidence: ${stock.confidenceLevel} (${stock.topPerformersCount}/10 top performers)`);
    console.log(`   📊 Suggested allocation: ${stock.avgAllocationPerHolder.toFixed(1)}%`);
    console.log(`   📈 Average holder YTD performance: ${stock.avgPerformanceOfHolders.toFixed(1)}%`);
    console.log(`   🏆 Recommendation score: ${stock.score.toFixed(2)}/10\n`);
});

// Analyze core holdings vs emerging opportunities
console.log('📋 CORE HOLDINGS vs EMERGING OPPORTUNITIES');
console.log('===========================================\n');

const coreHoldings = analysisData.topHoldings.slice(0, 10).map(holding => {
    const assetInfo = getAssetInfo(holding.instrumentId);
    return { ...holding, ...assetInfo };
});

console.log('🔥 CORE HOLDINGS (Most Popular):');
coreHoldings.forEach((stock, i) => {
    console.log(`${i + 1}. ${stock.symbol} - ${stock.name}`);
    console.log(`   👥 ${stock.holders} investors (${stock.holdersPercentage.toFixed(1)}%)`);
    console.log(`   💼 Average allocation: ${stock.averageAllocation.toFixed(1)}%`);
    console.log(`   📊 Type: ${stock.type || 'Stock'}\n`);
});

// Risk analysis for recommendations
console.log('🛡️ RISK ANALYSIS FOR RECOMMENDATIONS');
console.log('====================================\n');

const riskAnalysis = {
    lowRisk: detailedRecommendations.filter(stock => stock.avgPerformanceOfHolders < 30),
    mediumRisk: detailedRecommendations.filter(stock => 
        stock.avgPerformanceOfHolders >= 30 && stock.avgPerformanceOfHolders < 50),
    highRisk: detailedRecommendations.filter(stock => stock.avgPerformanceOfHolders >= 50)
};

console.log(`🟢 LOW RISK (< 30% holder performance): ${riskAnalysis.lowRisk.length} stocks`);
riskAnalysis.lowRisk.forEach(stock => {
    console.log(`   • ${stock.symbol}: ${stock.avgPerformanceOfHolders.toFixed(1)}% avg performance`);
});

console.log(`\n🟡 MEDIUM RISK (30-50% holder performance): ${riskAnalysis.mediumRisk.length} stocks`);
riskAnalysis.mediumRisk.forEach(stock => {
    console.log(`   • ${stock.symbol}: ${stock.avgPerformanceOfHolders.toFixed(1)}% avg performance`);
});

console.log(`\n🔴 HIGH RISK (>50% holder performance): ${riskAnalysis.highRisk.length} stocks`);
riskAnalysis.highRisk.forEach(stock => {
    console.log(`   • ${stock.symbol}: ${stock.avgPerformanceOfHolders.toFixed(1)}% avg performance`);
});

// Portfolio allocation strategy based on top performers
console.log('\n💼 SUGGESTED PORTFOLIO ALLOCATION STRATEGY');
console.log('===========================================\n');

const top3Performers = analysisData.performanceMetrics.bestPerformers.slice(0, 3);
console.log('📊 Based on top 3 risk-adjusted performers:');
top3Performers.forEach((investor, i) => {
    console.log(`${i + 1}. @${investor.userName}: ${investor.gain}% YTD, ${investor.riskScore} risk, ${investor.cashPercentage.toFixed(1)}% cash`);
});

const avgCashTop3 = top3Performers.reduce((sum, inv) => sum + inv.cashPercentage, 0) / 3;

console.log('\n🎯 RECOMMENDED PORTFOLIO STRUCTURE:');
console.log(`💰 Cash: ${avgCashTop3.toFixed(1)}% (based on top performers)`);
console.log('📈 Growth Stocks: 40-50%');
console.log('   • Core tech: AMZN, GOOG, MSFT, META, NVDA (30-35%)');
console.log('   • Emerging growth: Remaining recommendations (10-15%)');
console.log('🔄 Crypto: 15-25%');
console.log('   • BTC: 10-15%');
console.log('   • ETH, SOL: 5-10%');
console.log('🏦 Defensive: 20-30%');
console.log('   • ETFs/Bonds: 10-15%');
console.log('   • Dividend stocks: 10-15%');

// Trading insights from top performers
console.log('\n🎯 TRADING INSIGHTS FROM TOP PERFORMERS');
console.log('========================================\n');

const avgTrades = analysisData.performanceMetrics.avgTrades;
const avgWinRatio = analysisData.performanceMetrics.avgWinRatio;

console.log(`📊 Top 100 average metrics:`);
console.log(`   🔄 Trades per year: ${Math.round(avgTrades)}`);
console.log(`   🎯 Win ratio: ${avgWinRatio.toFixed(1)}%`);
console.log(`   ⚡ Risk score: ${analysisData.performanceMetrics.avgRiskScore.toFixed(1)}`);

console.log('\n💡 Key Insights:');
console.log('• Top performers maintain 4-6% cash for opportunities');
console.log('• Focus on tech stocks with strong fundamentals');
console.log('• Moderate trading frequency (200-400 trades/year)');
console.log('• Target 70%+ win ratio through careful position sizing');
console.log('• Keep risk scores between 3-5 for optimal risk-adjusted returns');

// Save detailed recommendations
const detailedReport = {
    metadata: {
        reportDate: new Date().toISOString(),
        basedOnAnalysis: ANALYSIS_FILE,
        topPerformersAnalyzed: analysisData.performanceMetrics.bestPerformers.length
    },
    recommendations: detailedRecommendations,
    coreHoldings: coreHoldings,
    riskAnalysis,
    portfolioStrategy: {
        suggestedCashAllocation: avgCashTop3,
        tradingFrequency: Math.round(avgTrades),
        targetWinRatio: avgWinRatio,
        optimalRiskScore: analysisData.performanceMetrics.avgRiskScore
    },
    keyInsights: [
        'Top performers maintain low cash positions (6.4% average)',
        'Tech stocks dominate successful portfolios',
        'Moderate trading frequency with high win ratios',
        'Risk scores between 3-5 provide best risk-adjusted returns'
    ]
};

const reportFile = '/Users/plessas/SourceCode/etoro_census/public/analysis-results/stock-recommendations-detailed-2025-08-11.json';
fs.writeFileSync(reportFile, JSON.stringify(detailedReport, null, 2));

console.log(`\n💾 Detailed report saved to: ${reportFile}`);
console.log('\n✅ Stock Recommendations Report Complete!');