/**
 * Hot Hands Recent Additions Analysis - REFACTORED VERSION
 * Uses shared utilities for common operations
 */

const fs = require('fs');
const path = require('path');
const utils = require('./lib/utils');

console.log('🔥 HOT HANDS RECENT ADDITIONS ANALYSIS');
console.log('=====================================');

// Use utilities to load latest data
const data = utils.loadLatestData();
console.log(`✅ Loaded data from ${data.metadata.collectedAtUTC}`);

// Get top 100 investors
const top100 = data.investors.slice(0, 100);

// Use utilities to create instrument map
const instrumentMap = utils.createInstrumentMap(data);

// Override getAssetInfo to match original format
function getAssetInfo(instrumentId) {
    const utilAsset = utils.getAssetInfo(instrumentId, instrumentMap);
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
    const recentMomentum = (investor.dailyGain || 0) * 10 + (investor.gain || 0) * 0.1; // Weight recent performance
    
    return {
        ...investor,
        riskAdjustedScore,
        recentMomentum,
        hotHandsScore: riskAdjustedScore * 0.7 + recentMomentum * 0.3
    };
}).sort((a, b) => b.hotHandsScore - a.hotHandsScore);

const hotHands = hotHandsCandidates.slice(0, 20); // Top 20 hot hands

console.log('\n🎯 TOP 20 HOT HANDS INVESTORS:');
console.log('================================');

hotHands.forEach((investor, index) => {
    const displayName = investor.fullName || investor.userName;
    console.log(`${index + 1}. @${investor.userName} (${displayName})`);
    console.log(`   Gain: ${investor.gain.toFixed(1)}% | Daily: ${investor.dailyGain?.toFixed(2) || '0.00'}%`);
    console.log(`   Copiers: ${utils.formatNumber(investor.copiers)} | Risk: ${investor.riskScore}`);
    console.log(`   Hot Score: ${investor.hotHandsScore.toFixed(2)}\n`);
});

// Analyze recent additions across all hot hands portfolios
console.log('\n🆕 ANALYZING RECENT POSITION ADDITIONS:');
console.log('=========================================');

const today = new Date();
const recentThreshold = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
const veryRecentThreshold = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)); // 3 days ago

const recentAdditions = new Map();
const veryRecentAdditions = new Map();

hotHands.forEach(investor => {
    if (investor.portfolio && investor.portfolio.positions) {
        investor.portfolio.positions.forEach(position => {
            if (position.openDateTime) {
                const openDate = new Date(position.openDateTime);
                
                // Track 7-day additions
                if (openDate >= recentThreshold) {
                    if (!recentAdditions.has(position.instrumentId)) {
                        recentAdditions.set(position.instrumentId, {
                            count: 0,
                            investors: [],
                            totalAllocation: 0,
                            avgGain: 0,
                            totalGain: 0
                        });
                    }
                    const addition = recentAdditions.get(position.instrumentId);
                    addition.count++;
                    addition.investors.push({
                        name: investor.userName,
                        allocation: position.netInvestmentPercentage || 0,
                        gain: position.netRealizedGainPercentage || 0,
                        openDate: openDate.toISOString().split('T')[0]
                    });
                    addition.totalAllocation += position.netInvestmentPercentage || 0;
                    addition.totalGain += position.netRealizedGainPercentage || 0;
                }
                
                // Track 3-day additions (very recent)
                if (openDate >= veryRecentThreshold) {
                    if (!veryRecentAdditions.has(position.instrumentId)) {
                        veryRecentAdditions.set(position.instrumentId, {
                            count: 0,
                            investors: [],
                            totalAllocation: 0
                        });
                    }
                    const veryRecent = veryRecentAdditions.get(position.instrumentId);
                    veryRecent.count++;
                    veryRecent.investors.push({
                        name: investor.userName,
                        allocation: position.netInvestmentPercentage || 0,
                        openDate: openDate.toISOString().split('T')[0]
                    });
                    veryRecent.totalAllocation += position.netInvestmentPercentage || 0;
                }
            }
        });
    }
});

// Display 7-day additions
console.log('\n📈 POSITIONS ADDED IN LAST 7 DAYS:');
console.log('------------------------------------');

if (recentAdditions.size > 0) {
    const sortedAdditions = Array.from(recentAdditions.entries())
        .map(([instrumentId, data]) => ({
            instrumentId,
            ...data,
            avgAllocation: data.totalAllocation / data.count,
            avgGain: data.totalGain / data.count
        }))
        .sort((a, b) => b.count - a.count);
    
    console.log(`Found ${sortedAdditions.length} different assets added by hot hands investors\n`);
    
    sortedAdditions.slice(0, 15).forEach((addition, index) => {
        const assetInfo = getAssetInfo(addition.instrumentId);
        console.log(`${index + 1}. ${assetInfo.symbol} - ${assetInfo.name} (${assetInfo.type})`);
        console.log(`   Added by: ${addition.count} investors`);
        console.log(`   Avg allocation: ${addition.avgAllocation.toFixed(2)}%`);
        if (addition.avgGain !== 0) {
            console.log(`   Avg gain: ${addition.avgGain.toFixed(2)}%`);
        }
        console.log(`   Investors: ${addition.investors.slice(0, 3).map(i => '@' + i.name).join(', ')}${addition.investors.length > 3 ? ` +${addition.investors.length - 3} more` : ''}`);
        console.log('');
    });
} else {
    console.log('No new positions opened by hot hands investors in the last 7 days.\n');
}

// Display 3-day additions (very recent/hot)
console.log('\n🔥 HOT ADDITIONS (LAST 3 DAYS):');
console.log('--------------------------------');

if (veryRecentAdditions.size > 0) {
    const sortedVeryRecent = Array.from(veryRecentAdditions.entries())
        .map(([instrumentId, data]) => ({
            instrumentId,
            ...data,
            avgAllocation: data.totalAllocation / data.count
        }))
        .sort((a, b) => b.count - a.count);
    
    console.log(`Found ${sortedVeryRecent.length} assets with very recent activity\n`);
    
    sortedVeryRecent.slice(0, 10).forEach((addition, index) => {
        const assetInfo = getAssetInfo(addition.instrumentId);
        console.log(`${index + 1}. 🔥 ${assetInfo.symbol} - ${assetInfo.name}`);
        console.log(`   Added by: ${addition.count} investors in last 3 days`);
        console.log(`   Avg allocation: ${addition.avgAllocation.toFixed(2)}%`);
        console.log(`   Latest adds:`);
        addition.investors.slice(0, 5).forEach(inv => {
            console.log(`   - @${inv.name}: ${inv.allocation.toFixed(2)}% (${inv.openDate})`);
        });
        console.log('');
    });
} else {
    console.log('No significant new positions in the last 3 days.\n');
}

// Momentum analysis - which assets are being accumulated
console.log('\n📊 ACCUMULATION PATTERNS:');
console.log('==========================');

const accumulationMap = new Map();

// Count how many hot hands hold each asset
hotHands.forEach(investor => {
    if (investor.portfolio && investor.portfolio.positions) {
        investor.portfolio.positions.forEach(position => {
            if (!accumulationMap.has(position.instrumentId)) {
                accumulationMap.set(position.instrumentId, {
                    holders: 0,
                    totalAllocation: 0,
                    recentAdds: 0
                });
            }
            const accumulation = accumulationMap.get(position.instrumentId);
            accumulation.holders++;
            accumulation.totalAllocation += position.netInvestmentPercentage || 0;
            
            // Check if recently added
            if (position.openDateTime) {
                const openDate = new Date(position.openDateTime);
                if (openDate >= recentThreshold) {
                    accumulation.recentAdds++;
                }
            }
        });
    }
});

// Find assets with high accumulation
const highAccumulation = Array.from(accumulationMap.entries())
    .map(([instrumentId, data]) => ({
        instrumentId,
        ...data,
        avgAllocation: data.totalAllocation / data.holders,
        recentRatio: data.recentAdds / data.holders
    }))
    .filter(a => a.holders >= 5) // At least 5 hot hands investors
    .sort((a, b) => b.recentRatio - a.recentRatio);

if (highAccumulation.length > 0) {
    console.log('Assets with strongest accumulation (recent adds / total holders):\n');
    
    highAccumulation.slice(0, 10).forEach((asset, index) => {
        const assetInfo = getAssetInfo(asset.instrumentId);
        const recentPercent = (asset.recentRatio * 100).toFixed(1);
        console.log(`${index + 1}. ${assetInfo.symbol} - ${assetInfo.name}`);
        console.log(`   Held by: ${asset.holders}/20 hot hands (${(asset.holders/20*100).toFixed(0)}%)`);
        console.log(`   Recent adds: ${asset.recentAdds} (${recentPercent}% are new positions)`);
        console.log(`   Avg allocation: ${asset.avgAllocation.toFixed(2)}%`);
        console.log('');
    });
}

// Summary insights
console.log('\n💡 KEY INSIGHTS:');
console.log('================');

// Calculate statistics
const totalRecentAdds = recentAdditions.size;
const totalVeryRecentAdds = veryRecentAdditions.size;
const avgAdditionsPerInvestor = Array.from(recentAdditions.values()).reduce((sum, a) => sum + a.count, 0) / hotHands.length;

console.log(`• ${totalRecentAdds} different assets added in last 7 days`);
console.log(`• ${totalVeryRecentAdds} assets added in last 3 days (hot momentum)`);
console.log(`• Average ${avgAdditionsPerInvestor.toFixed(1)} new positions per hot hands investor`);

if (veryRecentAdditions.size > 0) {
    const topVeryRecent = Array.from(veryRecentAdditions.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3);
    
    console.log('\n🔥 Hottest picks (most adds in 3 days):');
    topVeryRecent.forEach(([instrumentId, data]) => {
        const assetInfo = getAssetInfo(instrumentId);
        console.log(`  • ${assetInfo.symbol}: ${data.count} investors`);
    });
}

// Save analysis results
const analysisDate = new Date();
const analysisResults = {
    metadata: {
        analysisDate: analysisDate.toISOString(),
        dataCollectedAt: data.metadata.collectedAtUTC,
        thresholds: {
            recent: recentThreshold.toISOString(),
            veryRecent: veryRecentThreshold.toISOString()
        }
    },
    hotHands: hotHands.slice(0, 20).map(inv => ({
        userName: inv.userName,
        fullName: inv.fullName,
        gain: inv.gain,
        dailyGain: inv.dailyGain,
        copiers: inv.copiers,
        riskScore: inv.riskScore,
        hotHandsScore: inv.hotHandsScore
    })),
    recentAdditions: Array.from(recentAdditions.entries()).map(([instrumentId, data]) => ({
        ...getAssetInfo(instrumentId),
        instrumentId,
        count: data.count,
        avgAllocation: data.totalAllocation / data.count,
        investors: data.investors
    })),
    veryRecentAdditions: Array.from(veryRecentAdditions.entries()).map(([instrumentId, data]) => ({
        ...getAssetInfo(instrumentId),
        instrumentId,
        count: data.count,
        avgAllocation: data.totalAllocation / data.count,
        investors: data.investors
    })),
    accumulationPatterns: highAccumulation.slice(0, 20)
};

// Save using utilities
const outputFilename = `hot-hands-analysis-${analysisDate.toISOString().split('T')[0]}.json`;
const savedPath = utils.saveAnalysisResult(outputFilename, analysisResults);

console.log(`\n💾 Analysis saved to: ${outputFilename}`);
console.log('\n✅ Hot Hands Recent Additions Analysis Complete!');
console.log('📊 Monitor these assets for momentum continuation');