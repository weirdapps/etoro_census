const fs = require('fs');
const path = require('path');

console.log('🔥 DYNAMIC HOT HANDS ANALYSIS - Auto-Updates for Any Date');
console.log('==========================================================');

// DYNAMIC: Auto-find latest data file
const dataDir = '/Users/plessas/SourceCode/etoro_census/public/data/';
let dataFiles;
try {
    dataFiles = fs.readdirSync(dataDir)
        .filter(file => file.startsWith('etoro-data-') && file.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first
} catch (error) {
    console.error('❌ Error reading data directory:', error);
    process.exit(1);
}

if (dataFiles.length === 0) {
    console.error('❌ No data files found in', dataDir);
    process.exit(1);
}

const LATEST_DATA_FILE = path.join(dataDir, dataFiles[0]);
const OUTPUT_DIR = '/Users/plessas/SourceCode/etoro_census/public/analysis-results/';

console.log(`📁 Using latest file: ${dataFiles[0]}`);

// Load latest data
let data;
try {
    data = JSON.parse(fs.readFileSync(LATEST_DATA_FILE, 'utf8'));
    console.log(`✅ Loaded data from ${data.metadata.collectedAtUTC}`);
} catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
}

// DYNAMIC: Calculate thresholds based on current date
const today = new Date();
const recentThreshold = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
const veryRecentThreshold = new Date(today.getTime() - (45 * 24 * 60 * 60 * 1000)); // 45 days ago

console.log(`📅 DYNAMIC DATE THRESHOLDS:`);
console.log(`Recent threshold (90 days ago): ${recentThreshold.toISOString().split('T')[0]}`);
console.log(`Very recent threshold (45 days ago): ${veryRecentThreshold.toISOString().split('T')[0]}`);
console.log(`Analysis date: ${today.toISOString().split('T')[0]}`);

// Get top 100 investors
const top100 = data.investors.slice(0, 100);

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

// Risk-adjusted scoring function
function calculateRiskAdjustedScore(investor) {
    const gainFactor = investor.gain / Math.max(investor.riskScore, 1);
    const winRatioFactor = (investor.winRatio || 70) / 100;
    const trustFactor = Math.log(Math.max(investor.copiers, 1000) / 1000);
    return gainFactor * winRatioFactor * trustFactor;
}

// Identify hot hands investors (strong recent + overall performance)
const hotHandsCandidates = top100.map(investor => {
    const riskAdjustedScore = calculateRiskAdjustedScore(investor);
    const recentMomentum = (investor.dailyGain || 0) * 10 + (investor.gain || 0) * 0.1;
    
    return {
        ...investor,
        riskAdjustedScore,
        recentMomentum,
        hotHandsScore: riskAdjustedScore * 0.7 + recentMomentum * 0.3
    };
}).sort((a, b) => b.hotHandsScore - a.hotHandsScore);

const hotHands = hotHandsCandidates.slice(0, 15);

console.log('\n🔥 TOP 15 HOT HANDS INVESTORS (Current Rankings):');
console.log('==================================================');

hotHands.forEach((investor, i) => {
    console.log(`${i + 1}. @${investor.userName} (${investor.fullName})`);
    console.log(`   🎯 YTD: ${investor.gain}% | Daily: ${investor.dailyGain}% | Win Rate: ${investor.winRatio}%`);
    console.log(`   👥 Copiers: ${investor.copiers.toLocaleString()} | Risk: ${investor.riskScore}`);
    console.log(`   🔥 Hot Hands Score: ${investor.hotHandsScore.toFixed(3)}\n`);
});

// Analyze recent additions with DYNAMIC date filtering
const recentAdditions = [];
const veryRecentAdditions = [];

hotHands.forEach(investor => {
    if (!investor.portfolio?.positions) return;
    
    investor.portfolio.positions.forEach(position => {
        const openDate = new Date(position.openTimestamp);
        const assetInfo = getAssetInfo(position.instrumentId);
        
        const positionData = {
            investor: investor.userName,
            investorGain: investor.gain,
            investorCopiers: investor.copiers,
            instrumentId: position.instrumentId,
            ...assetInfo,
            allocation: position.investmentPct || 0,
            netProfit: position.netProfit || 0,
            openDate: openDate,
            openTimestamp: position.openTimestamp,
            daysSinceOpen: Math.floor((today - openDate) / (1000 * 60 * 60 * 24))
        };
        
        if (openDate >= recentThreshold) {
            recentAdditions.push(positionData);
            
            if (openDate >= veryRecentThreshold) {
                veryRecentAdditions.push(positionData);
            }
        }
    });
});

// Sort by date (newest first)
recentAdditions.sort((a, b) => new Date(b.openTimestamp) - new Date(a.openTimestamp));
veryRecentAdditions.sort((a, b) => new Date(b.openTimestamp) - new Date(a.openTimestamp));

console.log(`\n📊 DYNAMIC ANALYSIS RESULTS:`);
console.log(`Total recent positions (last 90 days): ${recentAdditions.length}`);
console.log(`Very recent positions (last 45 days): ${veryRecentAdditions.length}`);

// Show most recent additions
console.log('\n🚀 MOST RECENT ADDITIONS (Last 45 Days):');
console.log('=========================================');

veryRecentAdditions.slice(0, 15).forEach((pos, i) => {
    console.log(`${i + 1}. ${pos.symbol} - ${pos.name}`);
    console.log(`   👤 Investor: @${pos.investor} (${pos.investorGain}% YTD)`);
    console.log(`   📅 Opened: ${pos.openDate.toISOString().split('T')[0]} (${pos.daysSinceOpen} days ago)`);
    console.log(`   💼 Allocation: ${pos.allocation.toFixed(1)}%`);
    console.log(`   💰 P&L: ${pos.netProfit.toFixed(2)}%`);
    console.log(`   📊 Type: ${pos.type}\n`);
});

// Aggregate trending assets
const trendingAssetsMap = new Map();

veryRecentAdditions.forEach(pos => {
    if (!trendingAssetsMap.has(pos.instrumentId)) {
        trendingAssetsMap.set(pos.instrumentId, {
            instrumentId: pos.instrumentId,
            symbol: pos.symbol,
            name: pos.name,
            type: pos.type,
            additionCount: 0,
            investors: new Set(),
            totalAllocation: 0,
            performanceSum: 0,
            positions: []
        });
    }
    
    const asset = trendingAssetsMap.get(pos.instrumentId);
    asset.additionCount++;
    asset.investors.add(pos.investor);
    asset.totalAllocation += pos.allocation;
    asset.performanceSum += pos.investorGain;
    asset.positions.push(pos);
});

const trendingAssets = Array.from(trendingAssetsMap.values())
    .map(asset => ({
        ...asset,
        uniqueInvestors: asset.investors.size,
        investorsList: Array.from(asset.investors),
        avgAllocation: asset.totalAllocation / asset.additionCount,
        avgInvestorPerformance: asset.performanceSum / asset.additionCount
    }))
    .sort((a, b) => b.additionCount - a.additionCount);

console.log('\n📈 TRENDING ASSETS (Most Additions in Last 45 Days):');
console.log('====================================================');

trendingAssets.slice(0, 10).forEach((asset, i) => {
    console.log(`${i + 1}. ${asset.symbol} - ${asset.name}`);
    console.log(`   🔥 ${asset.additionCount} recent positions by ${asset.uniqueInvestors} investors`);
    console.log(`   👤 Investors: ${asset.investorsList.join(', ')}`);
    console.log(`   💼 Avg allocation: ${asset.avgAllocation.toFixed(1)}%`);
    console.log(`   📊 Avg investor YTD: ${asset.avgInvestorPerformance.toFixed(1)}%`);
    console.log(`   📊 Type: ${asset.type}\n`);
});

// Performance analysis
const profitableRecent = veryRecentAdditions.filter(pos => pos.netProfit > 0);
const winRate = veryRecentAdditions.length > 0 ? (profitableRecent.length / veryRecentAdditions.length) * 100 : 0;

console.log('\n💹 PERFORMANCE METRICS:');
console.log('=======================');
console.log(`Recent additions win rate: ${winRate.toFixed(1)}%`);
console.log(`Profitable positions: ${profitableRecent.length}/${veryRecentAdditions.length}`);

if (profitableRecent.length > 0) {
    console.log('\n🏆 BEST RECENT PERFORMERS:');
    profitableRecent
        .sort((a, b) => b.netProfit - a.netProfit)
        .slice(0, 10)
        .forEach((pos, i) => {
            console.log(`${i + 1}. ${pos.symbol} by @${pos.investor}: +${pos.netProfit.toFixed(2)}% (${pos.daysSinceOpen} days)`);
        });
}

// Save results with dynamic filename
const timestamp = today.toISOString().split('T')[0];
const results = {
    metadata: {
        analysisDate: today.toISOString(),
        dataFile: dataFiles[0],
        recentThresholdDays: 90,
        veryRecentThresholdDays: 45,
        dynamicThresholds: {
            recentThreshold: recentThreshold.toISOString(),
            veryRecentThreshold: veryRecentThreshold.toISOString()
        }
    },
    hotHandsInvestors: hotHands.map(inv => ({
        userName: inv.userName,
        fullName: inv.fullName,
        gain: inv.gain,
        dailyGain: inv.dailyGain,
        winRatio: inv.winRatio,
        copiers: inv.copiers,
        riskScore: inv.riskScore,
        hotHandsScore: inv.hotHandsScore
    })),
    trendingAssets: trendingAssets.slice(0, 15),
    performanceMetrics: {
        recentPositions: veryRecentAdditions.length,
        winRate: winRate,
        profitablePositions: profitableRecent.length
    },
    recentAdditions: veryRecentAdditions.slice(0, 20)
};

const outputFile = `${OUTPUT_DIR}dynamic-hot-hands-${timestamp}.json`;
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

console.log(`\n💾 Dynamic analysis saved to: ${outputFile}`);

// Summary
console.log('\n🎯 DYNAMIC ANALYSIS SUMMARY:');
console.log('=============================');
console.log(`📅 Auto-adjusted for current date: ${timestamp}`);
console.log(`🔥 Top current hot hands: @${hotHands[0]?.userName} (${hotHands[0]?.gain}% YTD)`);
console.log(`📈 Most trending asset: ${trendingAssets[0]?.symbol} (${trendingAssets[0]?.additionCount} additions)`);
console.log(`💹 Current win rate: ${winRate.toFixed(1)}%`);
console.log(`📁 Using data file: ${dataFiles[0]}`);

console.log('\n✅ DYNAMIC Hot Hands Analysis Complete!');
console.log('🔄 This script will auto-update for any future date!');