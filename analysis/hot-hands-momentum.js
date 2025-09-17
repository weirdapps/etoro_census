/**
 * Enhanced Hot Hands Analysis with Momentum & Trend Detection
 * Tracks asset momentum across multiple timeframes and generates trading signals
 */

const fs = require('fs');
const path = require('path');
const utils = require('./lib/utils');

console.log('🔥 ENHANCED HOT HANDS WITH MOMENTUM DETECTION');
console.log('='.repeat(70));

// Load historical data for comparison
function loadHistoricalData(daysBack) {
    const files = utils.getAllDataFiles();
    const historicalData = {};

    // Get data for specific days back
    const targetDays = [0, 1, 3, 7, 14, 30];

    targetDays.forEach(days => {
        if (days < files.length) {
            const filePath = path.join(utils.getDataDirectory(), files[days]);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                historicalData[`day_${days}`] = data;
                console.log(`📁 Loaded data from ${days} days ago: ${files[days]}`);
            } catch (error) {
                console.log(`⚠️  Could not load data from ${days} days ago`);
            }
        }
    });

    return historicalData;
}

// Calculate momentum for an asset
function calculateAssetMomentum(assetId, historicalData) {
    const momentum = {};
    const currentData = historicalData['day_0'];

    if (!currentData) return null;

    // Find current holder count
    const currentHoldings = findAssetHolders(assetId, currentData);

    // Calculate changes over different periods
    [1, 3, 7, 30].forEach(days => {
        const historicalDay = historicalData[`day_${days}`];
        if (historicalDay) {
            const pastHoldings = findAssetHolders(assetId, historicalDay);
            momentum[`change_${days}d`] = currentHoldings.count - pastHoldings.count;
            momentum[`percent_${days}d`] = pastHoldings.count > 0
                ? ((currentHoldings.count - pastHoldings.count) / pastHoldings.count * 100)
                : 0;
        }
    });

    // Calculate velocity (acceleration)
    if (momentum.change_1d !== undefined && momentum.change_3d !== undefined) {
        momentum.velocity = momentum.change_1d - (momentum.change_3d - momentum.change_1d) / 2;
    }

    // Generate signal
    momentum.signal = generateSignal(momentum);
    momentum.phase = determinePhase(currentHoldings.count, momentum);

    return { ...currentHoldings, momentum };
}

// Find how many investors hold an asset
function findAssetHolders(assetId, data) {
    const result = {
        count: 0,
        totalAllocation: 0,
        investors: []
    };

    // Check top 100 investors
    const top100 = data.investors.slice(0, 100);

    top100.forEach(investor => {
        if (investor.portfolio && investor.portfolio.positions) {
            const position = investor.portfolio.positions.find(p => p.instrumentId === assetId);
            if (position) {
                result.count++;
                result.totalAllocation += position.netInvestmentPercentage || 0;
                result.investors.push({
                    userName: investor.userName,
                    allocation: position.netInvestmentPercentage || 0
                });
            }
        }
    });

    result.avgAllocation = result.count > 0 ? result.totalAllocation / result.count : 0;
    result.penetration = result.count; // Out of 100

    return result;
}

// Generate trading signal based on momentum
function generateSignal(momentum) {
    const velocity = momentum.velocity || 0;
    const change3d = momentum.change_3d || 0;
    const change7d = momentum.change_7d || 0;
    const percent3d = momentum.percent_3d || 0;

    // More sensitive thresholds for current market conditions
    if (velocity > 1.5 && change3d > 3) return '🟢 STRONG BUY';
    if (velocity > 0.5 && change3d > 1) return '🟢 BUY';
    if (change3d > 0 && change7d > 2) return '🟢 ACCUMULATE';
    if (velocity < -1.5 && change3d < -3) return '🔴 STRONG SELL';
    if (velocity < -0.5 && change3d < -1) return '🔴 SELL';
    if (change3d < 0 && change7d < -2) return '🔴 REDUCE';
    if (Math.abs(change3d) === 0 && Math.abs(change7d) < 1) return '🟡 HOLD';
    return '🟡 WATCH';
}

// Determine market phase for asset
function determinePhase(holderCount, momentum) {
    const penetration = holderCount; // out of 100
    const change7d = momentum.change_7d || 0;

    if (penetration < 20 && change7d > 0) return 'Accumulation ↗';
    if (penetration >= 20 && penetration < 50 && momentum.velocity > 0) return 'Momentum ↑↑';
    if (penetration >= 50 && penetration < 70) return 'Mature →';
    if (penetration >= 70 && change7d < 0) return 'Distribution ↘';
    if (change7d < -10) return 'Capitulation ↓↓';
    return 'Consolidation →';
}

// Main analysis
async function runEnhancedAnalysis() {
    console.log('\n📊 Loading Historical Data...\n');
    const historicalData = loadHistoricalData();

    if (!historicalData['day_0']) {
        console.error('❌ Could not load current data');
        return;
    }

    const currentData = historicalData['day_0'];
    const instrumentMap = utils.createInstrumentMap(currentData);

    // Get top 100 investors
    const top100 = currentData.investors.slice(0, 100);

    // Calculate hot hands investors
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

    console.log('\n🔥 TOP 15 HOT HANDS INVESTORS\n' + '='.repeat(70));

    hotHands.forEach((investor, index) => {
        const fullName = investor.fullName || investor.userName;
        const formattedGain = investor.gain > 0 ? `+${investor.gain.toFixed(1)}` : investor.gain.toFixed(1);

        console.log(`${index + 1}. ${fullName} (@${investor.userName})`);
        console.log(`   Performance: ${formattedGain}% YTD | Risk: ${investor.riskScore} | Copiers: ${utils.formatNumber(investor.copiers)}`);
    });

    // Analyze portfolio holdings with momentum
    console.log('\n\n📈 MOMENTUM ANALYSIS - TOP HOLDINGS\n' + '='.repeat(70));

    // Get all unique assets from hot hands portfolios
    const allAssets = new Set();
    hotHands.forEach(investor => {
        if (investor.portfolio && investor.portfolio.positions) {
            investor.portfolio.positions.forEach(position => {
                allAssets.add(position.instrumentId);
            });
        }
    });

    // Calculate momentum for each asset
    const assetMomentum = [];
    allAssets.forEach(assetId => {
        const momentum = calculateAssetMomentum(assetId, historicalData);
        if (momentum) {
            const assetInfo = utils.getAssetInfo(assetId, instrumentMap);
            assetMomentum.push({
                id: assetId,
                symbol: assetInfo.symbol,
                name: assetInfo.name,
                ...momentum
            });
        }
    });

    // Sort by holder count (most popular first)
    assetMomentum.sort((a, b) => b.count - a.count);

    // Display top 20 with momentum data
    console.log('\n📊 Top Holdings with Momentum Indicators:\n');
    console.log('Symbol'.padEnd(10) + 'Holders'.padEnd(10) + '1D Δ'.padEnd(8) + '3D Δ'.padEnd(8) + '7D Δ'.padEnd(8) + 'Signal'.padEnd(18) + 'Phase');
    console.log('-'.repeat(80));

    assetMomentum.slice(0, 20).forEach(asset => {
        const symbol = (asset.symbol || 'N/A').padEnd(10);
        const holders = `${asset.count}/100`.padEnd(10);
        const change1d = formatChange(asset.momentum.change_1d).padEnd(8);
        const change3d = formatChange(asset.momentum.change_3d).padEnd(8);
        const change7d = formatChange(asset.momentum.change_7d).padEnd(8);
        const signal = (asset.momentum.signal || '').padEnd(18);
        const phase = asset.momentum.phase || '';

        console.log(`${symbol}${holders}${change1d}${change3d}${change7d}${signal}${phase}`);
    });

    // Identify new entries (assets that are newly adopted)
    console.log('\n\n🆕 NEW ENTRIES (Fresh Positions)\n' + '='.repeat(70));

    const newEntries = assetMomentum.filter(a => {
        // Asset wasn't held 7 days ago but is now
        const wasNotHeld = !a.momentum.change_7d ||
                          (a.count > 0 && a.momentum.change_7d === a.count);
        return wasNotHeld && a.count >= 3; // At least 3 holders
    }).slice(0, 5);

    if (newEntries.length > 0) {
        newEntries.forEach((asset, index) => {
            console.log(`\n${index + 1}. ${asset.symbol} - ${asset.name}`);
            console.log(`   New holders: ${asset.count}/100`);
            console.log(`   Average allocation: ${asset.avgAllocation?.toFixed(2)}%`);
            console.log(`   📍 Fresh entry - potential early opportunity`);
        });
    } else {
        console.log('\nNo significant new entries detected.');
    }

    // Identify trending assets (strong momentum)
    console.log('\n\n🚀 TRENDING ASSETS (Strong Momentum)\n' + '='.repeat(70));

    const trending = assetMomentum.filter(a =>
        a.momentum.velocity > 0.5 ||
        (a.momentum.change_3d > 2 && a.momentum.change_7d > 3)
    ).slice(0, 10);

    if (trending.length > 0) {
        trending.forEach((asset, index) => {
            console.log(`\n${index + 1}. ${asset.symbol} - ${asset.name}`);
            console.log(`   Current holders: ${asset.count}/100 (${asset.count}% penetration)`);
            console.log(`   3-day change: ${formatChange(asset.momentum.change_3d)} holders`);
            console.log(`   7-day change: ${formatChange(asset.momentum.change_7d)} holders`);
            console.log(`   Momentum velocity: ${asset.momentum.velocity?.toFixed(2) || 'N/A'}`);
            console.log(`   📍 ${asset.momentum.signal} - ${asset.momentum.phase}`);
        });
    } else {
        console.log('\nNo strong trending assets detected in current period.');
    }

    // Identify assets losing momentum
    console.log('\n\n📉 LOSING MOMENTUM (Distribution Phase)\n' + '='.repeat(70));

    const declining = assetMomentum.filter(a =>
        a.momentum.change_3d < -1 ||
        a.momentum.change_7d < -2 ||
        (a.momentum.velocity < -0.5 && a.count > 20) // Popular assets losing steam
    ).slice(0, 10);

    if (declining.length > 0) {
        declining.forEach((asset, index) => {
            console.log(`\n${index + 1}. ${asset.symbol} - ${asset.name}`);
            console.log(`   Current holders: ${asset.count}/100`);
            console.log(`   3-day change: ${formatChange(asset.momentum.change_3d)} holders`);
            console.log(`   7-day change: ${formatChange(asset.momentum.change_7d)} holders`);
            console.log(`   📍 ${asset.momentum.signal} - ${asset.momentum.phase}`);
        });
    }

    // Divergence Analysis - Compare hot hands vs broad market
    console.log('\n\n🔄 DIVERGENCE ANALYSIS (Hot Hands vs Broad Market)\n' + '='.repeat(70));

    if (historicalData['day_0'] && historicalData['day_0'].analyses) {
        const top100Analysis = historicalData['day_0'].analyses[0]; // Top 100
        const broadAnalysis = historicalData['day_0'].analyses[3]; // Top 1500

        // Compare top holdings
        const top100Holdings = new Map(top100Analysis.topHoldings.slice(0, 20).map(h => [h.instrumentId, h]));
        const broadHoldings = new Map(broadAnalysis.topHoldings.slice(0, 20).map(h => [h.instrumentId, h]));

        console.log('\n📊 Assets Popular in Hot Hands but NOT in Broad Market:');
        let smartMoneyExclusive = [];

        top100Holdings.forEach((holding, instrumentId) => {
            const broadHolding = broadHoldings.get(instrumentId);
            if (!broadHolding || holding.holdersCount > broadHolding.holdersCount * 1.5) {
                const assetInfo = utils.getAssetInfo(instrumentId, instrumentMap);
                smartMoneyExclusive.push({
                    symbol: assetInfo.symbol,
                    name: assetInfo.name,
                    hotHandsCount: holding.holdersCount,
                    broadCount: broadHolding?.holdersCount || 0
                });
            }
        });

        if (smartMoneyExclusive.length > 0) {
            smartMoneyExclusive.slice(0, 5).forEach(asset => {
                console.log(`• ${asset.symbol}: Hot Hands ${asset.hotHandsCount} vs Broad ${asset.broadCount}`);
            });
        } else {
            console.log('No significant divergence detected.');
        }

        // Cash position divergence
        const cashDiff = top100Analysis.averages.cashPercentage - broadAnalysis.averages.cashPercentage;
        console.log(`\n💰 Cash Position Divergence:`);
        console.log(`Hot Hands: ${top100Analysis.averages.cashPercentage.toFixed(1)}%`);
        console.log(`Broad Market: ${broadAnalysis.averages.cashPercentage.toFixed(1)}%`);
        console.log(`Difference: ${cashDiff > 0 ? '+' : ''}${cashDiff.toFixed(1)}% ${cashDiff > 0 ? '(More Defensive)' : '(More Aggressive)'}`);
    }

    // Key Insights Summary
    console.log('\n\n💡 KEY MOMENTUM INSIGHTS\n' + '='.repeat(70));

    // Calculate overall market momentum
    const overallMomentum = assetMomentum.reduce((sum, a) => sum + (a.momentum.change_3d || 0), 0);
    const avgMomentum = overallMomentum / assetMomentum.length;

    console.log('\n📊 Market Momentum Overview:');
    console.log(`• Overall trend: ${avgMomentum > 0.5 ? '📈 Bullish' : avgMomentum < -0.5 ? '📉 Bearish' : '➡️ Neutral'}`);
    console.log(`• Assets gaining holders: ${assetMomentum.filter(a => (a.momentum.change_3d || 0) > 0).length}`);
    console.log(`• Assets losing holders: ${assetMomentum.filter(a => (a.momentum.change_3d || 0) < 0).length}`);
    console.log(`• Stable holdings: ${assetMomentum.filter(a => (a.momentum.change_3d || 0) === 0).length}`);

    // Sector insights
    const techAssets = ['NVDA', 'MSFT', 'AAPL', 'GOOG', 'META', 'AMZN', 'TSLA', 'AMD', 'TSM'];
    const techMomentum = assetMomentum.filter(a => techAssets.includes(a.symbol));
    const techAvgChange = techMomentum.reduce((sum, a) => sum + (a.momentum.change_7d || 0), 0) / techMomentum.length;

    console.log('\n🔍 Sector Analysis:');
    console.log(`• Tech sector momentum: ${techAvgChange > 0 ? '↑ Positive' : techAvgChange < 0 ? '↓ Negative' : '→ Neutral'} (${techAvgChange.toFixed(1)} avg change)`);

    // Top signals
    const buySignals = assetMomentum.filter(a => a.momentum.signal && a.momentum.signal.includes('BUY'));
    const sellSignals = assetMomentum.filter(a => a.momentum.signal && a.momentum.signal.includes('SELL'));

    console.log('\n🎯 Trading Signals Summary:');
    console.log(`• Buy signals: ${buySignals.length} assets`);
    console.log(`• Sell signals: ${sellSignals.length} assets`);
    console.log(`• Watch/Hold: ${assetMomentum.length - buySignals.length - sellSignals.length} assets`);

    if (buySignals.length > 0) {
        console.log('\n📈 Top Buy Opportunities:');
        buySignals.slice(0, 3).forEach(a => {
            console.log(`  • ${a.symbol}: ${a.momentum.signal}`);
        });
    }

    if (sellSignals.length > 0) {
        console.log('\n📉 Consider Reducing:');
        sellSignals.slice(0, 3).forEach(a => {
            console.log(`  • ${a.symbol}: ${a.momentum.signal}`);
        });
    }

    // Save analysis to JSON
    const outputData = {
        timestamp: new Date().toISOString(),
        hotHands: hotHands.map(h => ({
            userName: h.userName,
            fullName: h.fullName,
            gain: h.gain,
            riskScore: h.riskScore,
            hotHandsScore: h.hotHandsScore
        })),
        assetMomentum: assetMomentum.slice(0, 50),
        trending: trending,
        declining: declining,
        newEntries: newEntries,
        marketOverview: {
            overallMomentum: avgMomentum,
            gainers: assetMomentum.filter(a => (a.momentum.change_3d || 0) > 0).length,
            losers: assetMomentum.filter(a => (a.momentum.change_3d || 0) < 0).length,
            buySignals: buySignals.length,
            sellSignals: sellSignals.length
        },
        metadata: {
            dataFiles: Object.keys(historicalData).length,
            analyzedAssets: assetMomentum.length,
            topInvestors: hotHands.length
        }
    };

    const outputPath = path.join(__dirname, 'output', `hot-hands-momentum-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n\n✅ Analysis saved to: ${outputPath}`);
}

// Helper function to format change numbers
function formatChange(value) {
    if (value === undefined || value === null) return 'N/A';
    if (value === 0) return '→';
    return value > 0 ? `+${value}` : `${value}`;
}

// Run the analysis
runEnhancedAnalysis().catch(console.error);