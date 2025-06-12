#!/usr/bin/env node

/**
 * eToro Census - New and Dropped Assets Identifier
 * 
 * Identifies specific assets (with names) that were completely new or dropped
 * by the top 100 investors between data collection periods.
 * 
 * Uses the investor-bands analysis logic to find assets then maps them to actual names.
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
            assetHolders.get(assetId).add(investor.userName);
        });
    });
    
    return assetHolders;
}

// Create comprehensive asset mapping from instruments data
function createAssetMapping(data) {
    const mapping = new Map();
    
    // Extract from instruments.details array
    if (data.instruments && data.instruments.details && Array.isArray(data.instruments.details)) {
        data.instruments.details.forEach(inst => {
            if (inst.instrumentId && inst.instrumentDisplayName) {
                mapping.set(inst.instrumentId, {
                    name: inst.instrumentDisplayName,
                    symbol: inst.symbolFull || inst.symbol || '',
                    typeID: inst.instrumentTypeID,
                    exchangeID: inst.exchangeID
                });
            }
        });
    }
    
    // Also check top holdings from analyses if available
    if (data.analyses && Array.isArray(data.analyses)) {
        data.analyses.forEach(analysis => {
            if (analysis.topHoldings && Array.isArray(analysis.topHoldings)) {
                analysis.topHoldings.forEach(holding => {
                    if (holding.instrumentId && holding.instrumentDisplayName && !mapping.has(holding.instrumentId)) {
                        mapping.set(holding.instrumentId, {
                            name: holding.instrumentDisplayName,
                            symbol: holding.symbolFull || holding.symbol || '',
                            typeID: holding.instrumentTypeID,
                            exchangeID: holding.exchangeID
                        });
                    }
                });
            }
        });
    }
    
    return mapping;
}

// Get asset type description based on typeID
function getAssetType(typeID) {
    const types = {
        5: 'Stock',
        6: 'ETF',
        10: 'Cryptocurrency',
        15: 'Commodity',
        17: 'Currency Pair',
        20: 'Index'
    };
    return types[typeID] || `Type ${typeID}`;
}

// Find new and dropped assets
function findAssetChanges(oldHoldings, newHoldings) {
    const oldAssets = new Set(oldHoldings.keys());
    const newAssets = new Set(newHoldings.keys());
    
    const newAssetIds = [];
    const droppedAssetIds = [];
    
    // Find completely new assets
    newAssets.forEach(assetId => {
        if (!oldAssets.has(assetId)) {
            newAssetIds.push({
                assetId,
                holders: newHoldings.get(assetId).size
            });
        }
    });
    
    // Find completely dropped assets
    oldAssets.forEach(assetId => {
        if (!newAssets.has(assetId)) {
            droppedAssetIds.push({
                assetId,
                holders: oldHoldings.get(assetId).size
            });
        }
    });
    
    return { newAssetIds, droppedAssetIds };
}

// Main analysis
function main() {
    console.log('🔍 eToro Census - New and Dropped Assets Analysis (Top 100 Investors)');
    console.log('═════════════════════════════════════════════════════════════════════════════════');
    
    const files = getDataFiles();
    const oldData = loadData(files[0]);
    const newData = loadData(files[files.length - 1]);
    
    const oldDate = files[0].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
    const newDate = files[files.length - 1].match(/etoro-data-(\d{4}-\d{2}-\d{2})/)[1];
    
    console.log(`\nPeriod: ${oldDate} → ${newDate}\n`);
    
    // Analyze top 100 investors
    const bandSize = 100;
    const oldInvestors = getInvestorBand(oldData, bandSize);
    const newInvestors = getInvestorBand(newData, bandSize);
    
    const oldHoldings = getAssetHoldings(oldInvestors);
    const newHoldings = getAssetHoldings(newInvestors);
    
    const { newAssetIds, droppedAssetIds } = findAssetChanges(oldHoldings, newHoldings);
    
    // Create asset mapping from both datasets
    const oldAssetMapping = createAssetMapping(oldData);
    const newAssetMapping = createAssetMapping(newData);
    
    // Combine mappings (new data takes precedence)
    const combinedMapping = new Map([...oldAssetMapping, ...newAssetMapping]);
    
    console.log(`📊 SUMMARY:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Total unique assets in May 31: ${oldHoldings.size}`);
    console.log(`Total unique assets in June 10: ${newHoldings.size}`);
    console.log(`Completely NEW assets: ${newAssetIds.length}`);
    console.log(`Completely DROPPED assets: ${droppedAssetIds.length}`);
    console.log(`Available asset mappings: ${combinedMapping.size}`);
    
    // Display new assets with names
    if (newAssetIds.length > 0) {
        console.log(`\n🆕 COMPLETELY NEW ASSETS (${newAssetIds.length} assets):`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        console.log(`Asset Name                           | Symbol    | Type           | Holders | Asset ID`);
        console.log(`─────────────────────────────────────┼───────────┼────────────────┼─────────┼─────────`);
        
        newAssetIds.sort((a, b) => b.holders - a.holders).forEach(asset => {
            const mapping = combinedMapping.get(asset.assetId);
            if (mapping) {
                const name = mapping.name.substring(0, 36).padEnd(36);
                const symbol = (mapping.symbol || '').substring(0, 9).padEnd(9);
                const type = getAssetType(mapping.typeID).substring(0, 14).padEnd(14);
                const holders = asset.holders.toString().padStart(7);
                const id = asset.assetId.toString().padStart(7);
                console.log(`${name} | ${symbol} | ${type} | ${holders} | ${id}`);
            } else {
                const name = `Unknown Asset`.padEnd(36);
                const symbol = ''.padEnd(9);
                const type = 'Unknown'.padEnd(14);
                const holders = asset.holders.toString().padStart(7);
                const id = asset.assetId.toString().padStart(7);
                console.log(`${name} | ${symbol} | ${type} | ${holders} | ${id}`);
            }
        });
    }
    
    // Display dropped assets with names
    if (droppedAssetIds.length > 0) {
        console.log(`\n❌ COMPLETELY DROPPED ASSETS (${droppedAssetIds.length} assets):`);
        console.log(`─────────────────────────────────────────────────────────────────────────────────`);
        console.log(`Asset Name                           | Symbol    | Type           | Holders | Asset ID`);
        console.log(`─────────────────────────────────────┼───────────┼────────────────┼─────────┼─────────`);
        
        droppedAssetIds.sort((a, b) => b.holders - a.holders).forEach(asset => {
            const mapping = combinedMapping.get(asset.assetId);
            if (mapping) {
                const name = mapping.name.substring(0, 36).padEnd(36);
                const symbol = (mapping.symbol || '').substring(0, 9).padEnd(9);
                const type = getAssetType(mapping.typeID).substring(0, 14).padEnd(14);
                const holders = asset.holders.toString().padStart(7);
                const id = asset.assetId.toString().padStart(7);
                console.log(`${name} | ${symbol} | ${type} | ${holders} | ${id}`);
            } else {
                const name = `Unknown Asset`.padEnd(36);
                const symbol = ''.padEnd(9);
                const type = 'Unknown'.padEnd(14);
                const holders = asset.holders.toString().padStart(7);
                const id = asset.assetId.toString().padStart(7);
                console.log(`${name} | ${symbol} | ${type} | ${holders} | ${id}`);
            }
        });
    }
    
    // Analyze patterns by asset type
    const newByType = new Map();
    const droppedByType = new Map();
    
    newAssetIds.forEach(asset => {
        const mapping = combinedMapping.get(asset.assetId);
        const type = mapping ? getAssetType(mapping.typeID) : 'Unknown';
        newByType.set(type, (newByType.get(type) || 0) + 1);
    });
    
    droppedAssetIds.forEach(asset => {
        const mapping = combinedMapping.get(asset.assetId);
        const type = mapping ? getAssetType(mapping.typeID) : 'Unknown';
        droppedByType.set(type, (droppedByType.get(type) || 0) + 1);
    });
    
    console.log(`\n📈 PATTERNS BY ASSET TYPE:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Asset Type         | New Assets | Dropped Assets | Net Change`);
    console.log(`───────────────────┼────────────┼────────────────┼───────────`);
    
    const allTypes = new Set([...newByType.keys(), ...droppedByType.keys()]);
    Array.from(allTypes).sort().forEach(type => {
        const newCount = newByType.get(type) || 0;
        const droppedCount = droppedByType.get(type) || 0;
        const netChange = newCount - droppedCount;
        const netStr = netChange === 0 ? '±0' : (netChange > 0 ? `+${netChange}` : `${netChange}`);
        
        const typeStr = type.substring(0, 17).padEnd(17);
        const newStr = newCount.toString().padStart(10);
        const droppedStr = droppedCount.toString().padStart(14);
        const netChangeStr = netStr.padStart(10);
        
        console.log(`${typeStr} | ${newStr} | ${droppedStr} | ${netChangeStr}`);
    });
    
    console.log(`\n💡 KEY INSIGHTS:`);
    console.log(`─────────────────────────────────────────────────────────────────────────────────`);
    
    if (newAssetIds.length > droppedAssetIds.length) {
        console.log(`• Portfolio EXPANSION: ${newAssetIds.length - droppedAssetIds.length} net new unique assets adopted`);
    } else if (droppedAssetIds.length > newAssetIds.length) {
        console.log(`• Portfolio CONSOLIDATION: ${droppedAssetIds.length - newAssetIds.length} net assets dropped`);
    } else {
        console.log(`• Portfolio ROTATION: Equal number of assets added and dropped`);
    }
    
    // Most popular new assets
    const popularNew = newAssetIds.filter(asset => asset.holders > 1);
    if (popularNew.length > 0) {
        console.log(`• ${popularNew.length} new assets adopted by multiple top-100 investors`);
    }
    
    // Most abandoned assets
    const popularDropped = droppedAssetIds.filter(asset => asset.holders > 1);
    if (popularDropped.length > 0) {
        console.log(`• ${popularDropped.length} dropped assets were held by multiple top-100 investors`);
    }
    
    console.log(`\n─────────────────────────────────────────────────────────────────────────────────`);
    console.log(`Analysis completed: ${new Date().toISOString()}`);
}

if (require.main === module) {
    main();
}

module.exports = { main, findAssetChanges, createAssetMapping };