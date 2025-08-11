const fs = require('fs');

// Configuration
const LATEST_DATA_FILE = '/Users/plessas/SourceCode/etoro_census/public/data/etoro-data-2025-08-11-02-07.json';
const OUTPUT_DIR = '/Users/plessas/SourceCode/etoro_census/public/analysis-results/';

console.log('🔥 HOT HANDS ANALYSIS - Recent Additions by Top Performers');
console.log('===========================================================');

// Load latest data
let data;
try {
    data = JSON.parse(fs.readFileSync(LATEST_DATA_FILE, 'utf8'));
    console.log(`✅ Loaded data from ${data.metadata.collectedAtUTC}`);
} catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
}

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
    const recentMomentum = (investor.dailyGain || 0) * 10 + (investor.gain || 0) * 0.1; // Weight recent performance
    
    return {
        ...investor,
        riskAdjustedScore,
        recentMomentum,
        hotHandsScore: riskAdjustedScore * 0.7 + recentMomentum * 0.3
    };
}).sort((a, b) => b.hotHandsScore - a.hotHandsScore);

const hotHands = hotHandsCandidates.slice(0, 15); // Top 15 hot hands

console.log('\n🔥 TOP 15 HOT HANDS INVESTORS (Recent + Overall Performance):');
console.log('=============================================================');

hotHands.forEach((investor, i) => {
    console.log(`${i + 1}. @${investor.userName} (${investor.fullName})`);
    console.log(`   🎯 YTD: ${investor.gain}% | Daily: ${investor.dailyGain}% | Win Rate: ${investor.winRatio}%`);
    console.log(`   👥 Copiers: ${investor.copiers.toLocaleString()} | Risk: ${investor.riskScore}`);
    console.log(`   🔥 Hot Hands Score: ${investor.hotHandsScore.toFixed(3)}\n`);
});

// Define "recent" as last 3 months (since May 11, 2025)
const recentThreshold = new Date('2025-05-11T00:00:00Z');
const veryRecentThreshold = new Date('2025-07-01T00:00:00Z'); // Last 1.5 months

console.log(`\n📅 ANALYZING RECENT ADDITIONS:`);
console.log(`Recent threshold: ${recentThreshold.toISOString().split('T')[0]}`);
console.log(`Very recent threshold: ${veryRecentThreshold.toISOString().split('T')[0]}`);

// Analyze recent additions
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
            daysSinceOpen: Math.floor((new Date() - openDate) / (1000 * 60 * 60 * 24))
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

console.log(`\n📊 RECENT ADDITIONS SUMMARY:`);
console.log(`Total recent positions (last 3 months): ${recentAdditions.length}`);
console.log(`Very recent positions (last 1.5 months): ${veryRecentAdditions.length}`);

// Analyze most recent additions (last 1.5 months)
console.log('\n🚀 VERY RECENT ADDITIONS (Last 1.5 Months):');
console.log('==============================================');

veryRecentAdditions.slice(0, 20).forEach((pos, i) => {
    console.log(`${i + 1}. ${pos.symbol} - ${pos.name}`);
    console.log(`   👤 Investor: @${pos.investor} (${pos.investorGain}% YTD)`);
    console.log(`   📅 Opened: ${pos.openDate.toISOString().split('T')[0]} (${pos.daysSinceOpen} days ago)`);
    console.log(`   💼 Allocation: ${pos.allocation.toFixed(1)}%`);
    console.log(`   💰 P&L: ${pos.netProfit.toFixed(2)}%`);
    console.log(`   📊 Type: ${pos.type}\n`);
});

// Aggregate recent additions by asset
const recentAssetMap = new Map();

veryRecentAdditions.forEach(pos => {
    if (!recentAssetMap.has(pos.instrumentId)) {
        recentAssetMap.set(pos.instrumentId, {
            instrumentId: pos.instrumentId,
            symbol: pos.symbol,
            name: pos.name,
            type: pos.type,
            additionCount: 0,
            investors: new Set(),
            totalAllocation: 0,
            avgPerformance: 0,
            performanceSum: 0,
            positions: []
        });
    }
    
    const asset = recentAssetMap.get(pos.instrumentId);
    asset.additionCount++;
    asset.investors.add(pos.investor);
    asset.totalAllocation += pos.allocation;
    asset.performanceSum += pos.investorGain;
    asset.positions.push(pos);
});

// Convert to array and calculate averages
const trendingAssets = Array.from(recentAssetMap.values())
    .map(asset => ({
        ...asset,
        uniqueInvestors: asset.investors.size,
        investorsList: Array.from(asset.investors),
        avgAllocation: asset.totalAllocation / asset.additionCount,
        avgInvestorPerformance: asset.performanceSum / asset.additionCount
    }))
    .sort((a, b) => b.additionCount - a.additionCount);

console.log('\n📈 TRENDING ASSETS (Most Recent Additions):');
console.log('============================================');

trendingAssets.slice(0, 15).forEach((asset, i) => {
    console.log(`${i + 1}. ${asset.symbol} - ${asset.name}`);
    console.log(`   🔥 ${asset.additionCount} recent positions by ${asset.uniqueInvestors} investors`);
    console.log(`   👤 Investors: ${asset.investorsList.join(', ')}`);
    console.log(`   💼 Avg allocation: ${asset.avgAllocation.toFixed(1)}%`);
    console.log(`   📊 Avg investor YTD: ${asset.avgInvestorPerformance.toFixed(1)}%`);
    console.log(`   📊 Type: ${asset.type}\n`);
});

// Identify sector trends
const sectorTrends = {};
veryRecentAdditions.forEach(pos => {
    let sector;
    if (pos.type === 'Crypto') sector = 'Crypto';
    else if (pos.name.includes('Tesla') || pos.name.includes('NIO') || pos.name.includes('Ford')) sector = 'EV/Auto';
    else if (pos.name.includes('Meta') || pos.name.includes('Alphabet') || pos.name.includes('Microsoft') || pos.name.includes('Apple') || pos.name.includes('Amazon') || pos.name.includes('Netflix') || pos.name.includes('NVIDIA')) sector = 'Big Tech';
    else if (pos.name.includes('Defense') || pos.name.includes('Rheinmetall') || pos.name.includes('Raytheon') || pos.name.includes('Lockheed')) sector = 'Defense';
    else if (pos.name.includes('Bank') || pos.name.includes('Goldman') || pos.name.includes('JPMorgan') || pos.name.includes('Financial')) sector = 'Finance';
    else if (pos.name.includes('Energy') || pos.name.includes('Oil')) sector = 'Energy';
    else sector = 'Other';
    
    if (!sectorTrends[sector]) sectorTrends[sector] = [];
    sectorTrends[sector].push(pos);
});

console.log('\n🏭 SECTOR TRENDS IN RECENT ADDITIONS:');
console.log('=====================================');

Object.entries(sectorTrends)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([sector, positions]) => {
        const uniqueInvestors = new Set(positions.map(p => p.investor)).size;
        console.log(`${sector}: ${positions.length} positions by ${uniqueInvestors} investors`);
    });

// Performance analysis of recent additions
const profitableRecentAdditions = veryRecentAdditions.filter(pos => pos.netProfit > 0);
const unprofitableRecentAdditions = veryRecentAdditions.filter(pos => pos.netProfit <= 0);

console.log('\n💹 PERFORMANCE OF RECENT ADDITIONS:');
console.log('===================================');
console.log(`Profitable recent positions: ${profitableRecentAdditions.length}/${veryRecentAdditions.length} (${((profitableRecentAdditions.length / veryRecentAdditions.length) * 100).toFixed(1)}%)`);

if (profitableRecentAdditions.length > 0) {
    console.log('\n🏆 BEST PERFORMING RECENT ADDITIONS:');
    profitableRecentAdditions
        .sort((a, b) => b.netProfit - a.netProfit)
        .slice(0, 10)
        .forEach((pos, i) => {
            console.log(`${i + 1}. ${pos.symbol} by @${pos.investor}: +${pos.netProfit.toFixed(2)}% (${pos.daysSinceOpen} days)`);
        });
}

// Save results
const hotHandsResults = {
    metadata: {
        analysisDate: new Date().toISOString(),
        recentThreshold: recentThreshold.toISOString(),
        veryRecentThreshold: veryRecentThreshold.toISOString()
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
    recentAdditionsCount: veryRecentAdditions.length,
    trendingAssets: trendingAssets.slice(0, 10),
    sectorTrends,
    performanceStats: {
        totalRecentPositions: veryRecentAdditions.length,
        profitablePositions: profitableRecentAdditions.length,
        winRate: ((profitableRecentAdditions.length / veryRecentAdditions.length) * 100).toFixed(1)
    },
    topRecentAdditions: veryRecentAdditions.slice(0, 20)
};

const outputFile = `${OUTPUT_DIR}hot-hands-analysis-${new Date().toISOString().split('T')[0]}.json`;
fs.writeFileSync(outputFile, JSON.stringify(hotHandsResults, null, 2));

console.log(`\n💾 Hot hands analysis saved to: ${outputFile}`);

// Key insights summary
console.log('\n🎯 KEY INSIGHTS - RECENT ADDITIONS:');
console.log('===================================');
console.log(`🔥 Top hot hands investor: @${hotHands[0]?.userName} (${hotHands[0]?.gain}% YTD)`);
console.log(`📈 Most added recent asset: ${trendingAssets[0]?.symbol} (${trendingAssets[0]?.additionCount} additions)`);
console.log(`🏭 Hot sector: ${Object.entries(sectorTrends).sort((a, b) => b[1].length - a[1].length)[0]?.[0]} (${Object.entries(sectorTrends).sort((a, b) => b[1].length - a[1].length)[0]?.[1].length} positions)`);
console.log(`💹 Recent additions win rate: ${((profitableRecentAdditions.length / veryRecentAdditions.length) * 100).toFixed(1)}%`);

console.log('\n✅ Hot Hands Analysis Complete!');