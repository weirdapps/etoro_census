/**
 * Dynamic Hot Hands Analysis - REFACTORED VERSION
 * Uses shared utilities for common operations
 */

const fs = require('fs');
const path = require('path');
const utils = require('./lib/utils');

console.log('🔥 DYNAMIC HOT HANDS ANALYSIS - Auto-Updates for Any Date');
console.log('==========================================================');

// Use utilities to get latest data file
const latestFile = utils.getLatestDataFile();
console.log(`📁 Using latest file: ${latestFile.filename}`);

// Use utilities to load data
const data = utils.loadLatestData();
console.log(`✅ Loaded data from ${data.metadata.collectedAtUTC}`);

// DYNAMIC: Calculate thresholds based on current date
const today = new Date();
const recentThreshold = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
const veryRecentThreshold = new Date(today.getTime() - (45 * 24 * 60 * 60 * 1000)); // 45 days ago
const hotActivityThreshold = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)); // 3 days ago - TREND CATCHING

console.log(`📅 DYNAMIC DATE THRESHOLDS:`);
console.log(`Recent threshold (90 days ago): ${recentThreshold.toISOString().split('T')[0]}`);
console.log(`Very recent threshold (45 days ago): ${veryRecentThreshold.toISOString().split('T')[0]}`);
console.log(`🔥 Hot Activity threshold (3 days ago): ${hotActivityThreshold.toISOString().split('T')[0]}`);
console.log(`Analysis date: ${today.toISOString().split('T')[0]}`);

// Get top 100 investors
const top100 = data.investors.slice(0, 100);

// Use utilities to create instrument map
const instrumentMap = utils.createInstrumentMap(data);

// Override getAssetInfo to match original format exactly
function getAssetInfo(instrumentId) {
    const utilAsset = utils.getAssetInfo(instrumentId, instrumentMap);
    // Need to match original format with symbol fallback
    const inst = instrumentMap.get(instrumentId);
    if (inst) {
        return {
            name: inst.name,
            symbol: inst.symbol || `ETORO:${instrumentId}`,
            type: inst.type === 5 ? 'Stock' : 
                  inst.type === 10 ? 'Crypto' : 
                  inst.type === 14 ? 'ETF' : 'Other'
        };
    }
    return utilAsset;
}

// Identify hot hands investors (strong recent + overall performance)
const hotHandsCandidates = top100.map(investor => {
    const riskAdjustedScore = utils.calculateRiskAdjustedScore(investor);
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
console.log('='.repeat(60));

hotHands.forEach((investor, index) => {
    const fullName = investor.fullName || investor.userName;
    const countryFlag = investor.countryCode || '🌍';
    const formattedGain = investor.gain > 0 ? `+${investor.gain.toFixed(1)}` : investor.gain.toFixed(1);
    const formattedDaily = investor.dailyGain > 0 ? `+${investor.dailyGain.toFixed(2)}` : investor.dailyGain.toFixed(2);
    
    console.log(`\n${index + 1}. ${fullName} (@${investor.userName}) ${countryFlag}`);
    console.log(`   📊 Performance: ${formattedGain}% YTD | ${formattedDaily}% Daily`);
    console.log(`   ⚖️ Risk Score: ${investor.riskScore} | Win Ratio: ${investor.winRatio?.toFixed(1) || 'N/A'}%`);
    console.log(`   👥 Copiers: ${utils.formatNumber(investor.copiers)} | 💰 Cash: ${investor.cashPercentage?.toFixed(1) || 'N/A'}%`);
    console.log(`   🔥 Hot Hands Score: ${investor.hotHandsScore.toFixed(2)}`);
});

// Analyze portfolio concentration among hot hands
console.log('\n\n📊 HOT HANDS PORTFOLIO CONCENTRATION:');
console.log('='.repeat(60));

const assetConcentration = new Map();

hotHands.forEach(investor => {
    if (investor.portfolio && investor.portfolio.positions) {
        investor.portfolio.positions.forEach(position => {
            if (!assetConcentration.has(position.instrumentId)) {
                assetConcentration.set(position.instrumentId, {
                    count: 0,
                    totalAllocation: 0,
                    investors: []
                });
            }
            const asset = assetConcentration.get(position.instrumentId);
            asset.count++;
            asset.totalAllocation += position.netInvestmentPercentage || 0;
            asset.investors.push(investor.userName);
        });
    }
});

// Sort by investor count
const topAssets = Array.from(assetConcentration.entries())
    .map(([instrumentId, data]) => ({
        instrumentId,
        ...data,
        avgAllocation: data.totalAllocation / data.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

console.log('\nTop 20 Holdings Among Hot Hands Investors:');
topAssets.forEach((asset, index) => {
    const assetInfo = getAssetInfo(asset.instrumentId);
    const percentage = (asset.count / hotHands.filter(h => h.portfolio).length * 100).toFixed(1);
    console.log(`${index + 1}. ${assetInfo.symbol} - ${assetInfo.name}`);
    console.log(`   Held by: ${asset.count}/${hotHands.filter(h => h.portfolio).length} investors (${percentage}%)`);
    console.log(`   Avg allocation: ${asset.avgAllocation.toFixed(2)}%`);
});

// Recent additions analysis - find assets added in the last 3 days
console.log('\n\n🆕 RECENT HOT ADDITIONS (Last 3 Days):');
console.log('='.repeat(60));

const recentAdditions = new Map();

hotHands.forEach(investor => {
    if (investor.portfolio && investor.portfolio.positions) {
        investor.portfolio.positions.forEach(position => {
            // Check if position was opened recently (within hotActivityThreshold)
            if (position.openDateTime) {
                const openDate = new Date(position.openDateTime);
                if (openDate >= hotActivityThreshold) {
                    if (!recentAdditions.has(position.instrumentId)) {
                        recentAdditions.set(position.instrumentId, {
                            count: 0,
                            investors: [],
                            totalAllocation: 0
                        });
                    }
                    const addition = recentAdditions.get(position.instrumentId);
                    addition.count++;
                    addition.investors.push({
                        name: investor.userName,
                        allocation: position.netInvestmentPercentage || 0,
                        openDate: openDate.toISOString().split('T')[0]
                    });
                    addition.totalAllocation += position.netInvestmentPercentage || 0;
                }
            }
        });
    }
});

if (recentAdditions.size > 0) {
    const sortedAdditions = Array.from(recentAdditions.entries())
        .map(([instrumentId, data]) => ({
            instrumentId,
            ...data,
            avgAllocation: data.totalAllocation / data.count
        }))
        .sort((a, b) => b.count - a.count);
    
    console.log(`\nFound ${sortedAdditions.length} assets with recent activity:`);
    sortedAdditions.slice(0, 10).forEach((addition, index) => {
        const assetInfo = getAssetInfo(addition.instrumentId);
        console.log(`\n${index + 1}. 🔥 ${assetInfo.symbol} - ${assetInfo.name}`);
        console.log(`   Added by ${addition.count} hot hands investors`);
        console.log(`   Average allocation: ${addition.avgAllocation.toFixed(2)}%`);
        console.log(`   Investors:`);
        addition.investors.slice(0, 5).forEach(inv => {
            console.log(`   - @${inv.name}: ${inv.allocation.toFixed(2)}% (${inv.openDate})`);
        });
        if (addition.investors.length > 5) {
            console.log(`   ... and ${addition.investors.length - 5} more`);
        }
    });
} else {
    console.log('\nNo significant new positions opened in the last 3 days.');
}

// Momentum analysis - investors with strongest recent performance
console.log('\n\n🚀 MOMENTUM LEADERS (Recent Gainers):');
console.log('='.repeat(60));

const momentumLeaders = hotHandsCandidates
    .filter(inv => inv.dailyGain > 0)
    .sort((a, b) => b.dailyGain - a.dailyGain)
    .slice(0, 10);

momentumLeaders.forEach((investor, index) => {
    const fullName = investor.fullName || investor.userName;
    console.log(`${index + 1}. @${investor.userName} (${fullName})`);
    console.log(`   Daily: ${utils.formatPercentage(investor.dailyGain, 2)} | YTD: ${utils.formatPercentage(investor.gain)}`);
    console.log(`   Momentum Score: ${investor.recentMomentum.toFixed(2)}`);
});

// Risk/Return analysis
console.log('\n\n⚖️ RISK-ADJUSTED LEADERS:');
console.log('='.repeat(60));

const riskAdjustedLeaders = hotHandsCandidates
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .slice(0, 10);

riskAdjustedLeaders.forEach((investor, index) => {
    const fullName = investor.fullName || investor.userName;
    const sharpeApprox = investor.gain / Math.max(investor.riskScore, 1);
    console.log(`${index + 1}. @${investor.userName} (${fullName})`);
    console.log(`   Gain: ${investor.gain.toFixed(1)}% | Risk: ${investor.riskScore} | Sharpe-like: ${sharpeApprox.toFixed(2)}`);
    console.log(`   Risk-Adjusted Score: ${investor.riskAdjustedScore.toFixed(2)}`);
});

// Save analysis results
const analysisResults = {
    metadata: {
        analysisDate: today.toISOString(),
        dataFile: latestFile.filename,
        dataCollectedAt: data.metadata.collectedAtUTC,
        thresholds: {
            recent: recentThreshold.toISOString(),
            veryRecent: veryRecentThreshold.toISOString(),
            hotActivity: hotActivityThreshold.toISOString()
        }
    },
    hotHands: hotHands.map(inv => ({
        userName: inv.userName,
        fullName: inv.fullName,
        gain: inv.gain,
        dailyGain: inv.dailyGain,
        riskScore: inv.riskScore,
        winRatio: inv.winRatio,
        copiers: inv.copiers,
        cashPercentage: inv.cashPercentage,
        hotHandsScore: inv.hotHandsScore,
        riskAdjustedScore: inv.riskAdjustedScore,
        recentMomentum: inv.recentMomentum
    })),
    topAssets: topAssets.map(asset => ({
        ...getAssetInfo(asset.instrumentId),
        instrumentId: asset.instrumentId,
        investorCount: asset.count,
        avgAllocation: asset.avgAllocation,
        investors: asset.investors
    })),
    recentAdditions: Array.from(recentAdditions.entries()).map(([instrumentId, data]) => ({
        ...getAssetInfo(instrumentId),
        instrumentId,
        count: data.count,
        avgAllocation: data.totalAllocation / data.count,
        investors: data.investors
    })),
    momentumLeaders: momentumLeaders.slice(0, 10).map(inv => ({
        userName: inv.userName,
        fullName: inv.fullName,
        dailyGain: inv.dailyGain,
        gain: inv.gain,
        recentMomentum: inv.recentMomentum
    })),
    riskAdjustedLeaders: riskAdjustedLeaders.slice(0, 10).map(inv => ({
        userName: inv.userName,
        fullName: inv.fullName,
        gain: inv.gain,
        riskScore: inv.riskScore,
        riskAdjustedScore: inv.riskAdjustedScore
    }))
};

// Save JSON results using utilities
const outputFilename = `dynamic-hot-hands-${today.toISOString().split('T')[0]}.json`;
const savedPath = utils.saveAnalysisResult(outputFilename, analysisResults);
console.log(`\n\n💾 Analysis saved to: ${outputFilename}`);

console.log('\n' + '='.repeat(60));
console.log('✅ Dynamic Hot Hands Analysis Complete!');
console.log('🔥 Monitor these investors for momentum trades');
console.log('📊 Full census at: weirdapps.github.io/etoro_census');