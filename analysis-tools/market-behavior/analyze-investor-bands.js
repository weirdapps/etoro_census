#!/usr/bin/env node

/**
 * eToro Census - Multi-Band Investor Behavior Analysis
 * 
 * Analyzes investor behavior across different bands (100, 500, 1000, 1500)
 * to identify patterns in cash holdings, asset purchases/sales, and position changes.
 * 
 * Usage: node analysis-tools/market-behavior/analyze-investor-bands.js [band]
 * 
 * Examples:
 *   node analysis-tools/market-behavior/analyze-investor-bands.js 100
 *   node analysis-tools/market-behavior/analyze-investor-bands.js all
 * 
 * Outputs:
 * - Cash position changes by band (0-100% of equity)
 * - New asset adoptions by band (unique holders, not positions)
 * - Asset exits by band (unique holders, not positions)
 * - Holder increase/decrease analysis
 * - Behavioral differences between bands
 * 
 * Cash Calculation: 100% - (sum of all position investment percentages)
 * Holders: Unique investors holding an asset (deduplicated across multiple positions)
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

// Extract investors for specific band
function getInvestorBand(data, bandSize) {
    return data.investors.slice(0, bandSize);
}

// Calculate cash positions for band
function analyzeCashPositions(investors) {
    const cashData = investors.map(investor => {
        // Calculate cash as percentage not invested in positions
        let cash = 0;
        if (investor.portfolio && investor.portfolio.positions) {
            const totalInvested = investor.portfolio.positions.reduce((sum, position) => {
                return sum + (position.investmentPct || 0);
            }, 0);
            cash = Math.max(0, 100 - totalInvested);
        }
        
        return {
            userName: investor.userName,
            fullName: investor.fullName,
            cash: cash,
            copiers: investor.copiers,
            gain: investor.gain
        };
    });
    
    const avgCash = cashData.reduce((sum, inv) => sum + inv.cash, 0) / cashData.length;
    
    // Cash distribution
    const cashBands = {
        '0-5%': cashData.filter(inv => inv.cash >= 0 && inv.cash < 5).length,
        '5-10%': cashData.filter(inv => inv.cash >= 5 && inv.cash < 10).length,
        '11-25%': cashData.filter(inv => inv.cash >= 11 && inv.cash < 25).length,
        '26-50%': cashData.filter(inv => inv.cash >= 26 && inv.cash < 50).length,
        '51-75%': cashData.filter(inv => inv.cash >= 51 && inv.cash < 75).length,
        '76-100%': cashData.filter(inv => inv.cash >= 76).length
    };
    
    return {
        average: avgCash,
        distribution: cashBands,
        details: cashData
    };
}

// Get all unique assets held by band (HOLDERS not positions)
function getAssetHoldings(investors) {
    const assetHolders = new Map();
    
    investors.forEach((investor, index) => {
        const positions = investor.portfolio.positions || [];
        const uniqueAssetsHeldByInvestor = new Set();
        
        // First, get all unique assets this investor holds (regardless of multiple positions)
        positions.forEach(position => {
            uniqueAssetsHeldByInvestor.add(position.instrumentId);
        });
        
        // Then, for each unique asset this investor holds, add them as a holder
        uniqueAssetsHeldByInvestor.forEach(assetId => {
            if (!assetHolders.has(assetId)) {
                assetHolders.set(assetId, new Set());
            }
            assetHolders.get(assetId).add(investor.userName); // Use userName as unique identifier
        });
    });
    
    return assetHolders;
}

// Compare asset holdings between two periods
function compareAssetHoldings(oldHoldings, newHoldings, bandSize) {
    const results = {
        newAssets: [],      // Assets not held before but held now
        droppedAssets: [],  // Assets held before but not now
        gainedInvestors: [], // Assets that gained investors
        lostInvestors: []   // Assets that lost investors
    };
    
    // Find new and dropped assets
    const oldAssets = new Set(oldHoldings.keys());
    const newAssets = new Set(newHoldings.keys());
    
    newAssets.forEach(assetId => {
        if (!oldAssets.has(assetId)) {
            results.newAssets.push({
                assetId,
                holders: newHoldings.get(assetId).size,
                percentage: (newHoldings.get(assetId).size / bandSize * 100).toFixed(1)
            });
        }
    });
    
    oldAssets.forEach(assetId => {
        if (!newAssets.has(assetId)) {
            results.droppedAssets.push({
                assetId,
                holders: oldHoldings.get(assetId).size,
                percentage: (oldHoldings.get(assetId).size / bandSize * 100).toFixed(1)
            });
        }
    });
    
    // Find assets with changed holder counts
    oldAssets.forEach(assetId => {
        if (newAssets.has(assetId)) {
            const oldCount = oldHoldings.get(assetId).size;
            const newCount = newHoldings.get(assetId).size;
            const change = newCount - oldCount;
            
            if (change > 0) {
                results.gainedInvestors.push({
                    assetId,
                    oldHolders: oldCount,
                    newHolders: newCount,
                    change,
                    oldPercentage: (oldCount / bandSize * 100).toFixed(1),
                    newPercentage: (newCount / bandSize * 100).toFixed(1)
                });
            } else if (change < 0) {
                results.lostInvestors.push({
                    assetId,
                    oldHolders: oldCount,
                    newHolders: newCount,
                    change,
                    oldPercentage: (oldCount / bandSize * 100).toFixed(1),
                    newPercentage: (newCount / bandSize * 100).toFixed(1)
                });
            }
        }
    });
    
    // Sort by magnitude of change
    results.gainedInvestors.sort((a, b) => b.change - a.change);
    results.lostInvestors.sort((a, b) => a.change - b.change);
    
    return results;
}

// Get asset name mapping from latest data
function createAssetMapping(data) {
    const mapping = new Map();
    
    // Try to extract from instruments if available
    if (data.instruments && Array.isArray(data.instruments)) {
        data.instruments.forEach(inst => {
            mapping.set(inst.instrumentId, `${inst.displayName} (${inst.symbolFull})`);
        });
    }
    
    // Fallback: create basic mapping from position data
    if (mapping.size === 0 && data.investors) {
        const seenInstruments = new Set();
        data.investors.forEach(investor => {
            if (investor.portfolio && investor.portfolio.positions) {
                investor.portfolio.positions.forEach(position => {
                    if (!seenInstruments.has(position.instrumentId)) {
                        seenInstruments.add(position.instrumentId);
                        mapping.set(position.instrumentId, `Asset ID ${position.instrumentId}`);
                    }
                });
            }
        });
    }
    
    return mapping;
}

// Analyze a specific band
function analyzeBand(oldData, newData, bandSize, assetMapping) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 INVESTOR BAND ANALYSIS - TOP ${bandSize} INVESTORS`);
    console.log(`${'='.repeat(80)}`);
    
    const oldInvestors = getInvestorBand(oldData, bandSize);
    const newInvestors = getInvestorBand(newData, bandSize);
    
    // Analyze cash positions
    const oldCash = analyzeCashPositions(oldInvestors);
    const newCash = analyzeCashPositions(newInvestors);
    const cashChange = newCash.average - oldCash.average;
    
    console.log(`\n💰 CASH POSITION ANALYSIS:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Average Cash: ${oldCash.average.toFixed(2)}% → ${newCash.average.toFixed(2)}% (${cashChange >= 0 ? '+' : ''}${cashChange.toFixed(2)}pp)`);
    
    console.log(`\nCash Distribution:`);
    Object.entries(newCash.distribution).forEach(([range, count]) => {
        const oldCount = oldCash.distribution[range];
        const change = count - oldCount;
        const changeStr = change === 0 ? '±0' : (change > 0 ? `+${change}` : `${change}`);
        console.log(`  ${range.padEnd(8)}: ${count.toString().padStart(3)} investors (${changeStr})`);
    });
    
    // Analyze asset holdings
    const oldHoldings = getAssetHoldings(oldInvestors);
    const newHoldings = getAssetHoldings(newInvestors);
    const assetChanges = compareAssetHoldings(oldHoldings, newHoldings, bandSize);
    
    // New assets adopted
    if (assetChanges.newAssets.length > 0) {
        console.log(`\n🆕 NEW ASSETS ADOPTED (${assetChanges.newAssets.length} assets):`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        assetChanges.newAssets.slice(0, 10).forEach(asset => {
            const name = assetMapping.get(parseInt(asset.assetId)) || `Asset ID ${asset.assetId}`;
            console.log(`  ${asset.holders} holders (${asset.percentage}%) - ${name}`);
        });
        if (assetChanges.newAssets.length > 10) {
            console.log(`  ... and ${assetChanges.newAssets.length - 10} more assets`);
        }
    }
    
    // Dropped assets
    if (assetChanges.droppedAssets.length > 0) {
        console.log(`\n❌ ASSETS COMPLETELY DROPPED (${assetChanges.droppedAssets.length} assets):`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        assetChanges.droppedAssets.slice(0, 10).forEach(asset => {
            const name = assetMapping.get(parseInt(asset.assetId)) || `Asset ID ${asset.assetId}`;
            console.log(`  ${asset.holders} holders (${asset.percentage}%) - ${name}`);
        });
        if (assetChanges.droppedAssets.length > 10) {
            console.log(`  ... and ${assetChanges.droppedAssets.length - 10} more assets`);
        }
    }
    
    // Assets gaining holders
    if (assetChanges.gainedInvestors.length > 0) {
        console.log(`\n📈 TOP ASSETS GAINING HOLDERS:`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        assetChanges.gainedInvestors.slice(0, 15).forEach(asset => {
            const name = assetMapping.get(parseInt(asset.assetId)) || `Asset ID ${asset.assetId}`;
            console.log(`  +${asset.change} holders (${asset.oldPercentage}% → ${asset.newPercentage}%) - ${name}`);
        });
    }
    
    // Assets losing holders
    if (assetChanges.lostInvestors.length > 0) {
        console.log(`\n📉 TOP ASSETS LOSING HOLDERS:`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        assetChanges.lostInvestors.slice(0, 15).forEach(asset => {
            const name = assetMapping.get(parseInt(asset.assetId)) || `Asset ID ${asset.assetId}`;
            console.log(`  ${asset.change} holders (${asset.oldPercentage}% → ${asset.newPercentage}%) - ${name}`);
        });
    }
    
    // Summary statistics
    console.log(`\n📊 SUMMARY STATISTICS:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Total unique assets: ${oldHoldings.size} → ${newHoldings.size} (${newHoldings.size - oldHoldings.size >= 0 ? '+' : ''}${newHoldings.size - oldHoldings.size})`);
    console.log(`New assets adopted: ${assetChanges.newAssets.length}`);
    console.log(`Assets completely dropped: ${assetChanges.droppedAssets.length}`);
    console.log(`Assets gaining holders: ${assetChanges.gainedInvestors.length}`);
    console.log(`Assets losing holders: ${assetChanges.lostInvestors.length}`);
    
    return {
        bandSize,
        cashAnalysis: { old: oldCash, new: newCash, change: cashChange },
        assetChanges
    };
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    const requestedBand = args[0];
    
    console.log('🔍 eToro Census - Multi-Band Investor Behavior Analysis');
    console.log('══════════════════════════════════════════════════════════════════════════════════');
    
    const files = getDataFiles();
    console.log(`\nAnalyzing: ${files[0]} → ${files[files.length - 1]}`);
    
    const oldData = loadData(files[0]);
    const newData = loadData(files[files.length - 1]);
    const assetMapping = createAssetMapping(newData);
    
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
        results.push(analyzeBand(oldData, newData, band, assetMapping));
    }
    
    // Cross-band comparison if analyzing multiple bands
    if (results.length > 1) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔄 CROSS-BAND COMPARISON`);
        console.log(`${'='.repeat(80)}`);
        
        console.log(`\n💰 Cash Position Changes by Band:`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        results.forEach(result => {
            const change = result.cashAnalysis.change;
            const direction = change >= 0 ? '📈' : '📉';
            console.log(`  Top ${result.bandSize.toString().padStart(4)}: ${result.cashAnalysis.old.average.toFixed(2)}% → ${result.cashAnalysis.new.average.toFixed(2)}% (${change >= 0 ? '+' : ''}${change.toFixed(2)}pp) ${direction}`);
        });
        
        console.log(`\n📊 Asset Portfolio Diversity:`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        results.forEach(result => {
            const oldAssets = result.assetChanges.newAssets.length + result.assetChanges.droppedAssets.length + result.assetChanges.gainedInvestors.length + result.assetChanges.lostInvestors.length;
            console.log(`  Top ${result.bandSize.toString().padStart(4)}: ${result.assetChanges.newAssets.length} new, ${result.assetChanges.droppedAssets.length} dropped, ${result.assetChanges.gainedInvestors.length} gaining, ${result.assetChanges.lostInvestors.length} losing`);
        });
    }
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Analysis completed: ${new Date().toISOString()}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    analyzeBand,
    analyzeCashPositions,
    getAssetHoldings,
    compareAssetHoldings
};