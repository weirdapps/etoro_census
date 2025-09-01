/**
 * Shared utilities for eToro Census analysis scripts
 * Consolidates common functions to reduce duplication
 */

const fs = require('fs');
const path = require('path');

/**
 * Intelligently resolves the data directory path
 * Works from both project root and analysis subdirectory
 */
function getDataDirectory() {
  // Check multiple possible locations
  const possiblePaths = [
    './public/data',
    '../public/data',
    path.join(process.cwd(), 'public/data'),
    path.join(__dirname, '../../public/data')
  ];
  
  for (const dataPath of possiblePaths) {
    if (fs.existsSync(dataPath)) {
      return dataPath;
    }
  }
  
  throw new Error('Unable to locate data directory. Please run from project root or analysis directory.');
}

/**
 * Gets all data files sorted by date (newest first)
 */
function getAllDataFiles() {
  const dataDir = getDataDirectory();
  return fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
}

/**
 * Gets the most recent data file
 */
function getLatestDataFile() {
  const files = getAllDataFiles();
  if (files.length === 0) {
    throw new Error('No data files found in data directory');
  }
  const dataDir = getDataDirectory();
  return {
    filename: files[0],
    filepath: path.join(dataDir, files[0])
  };
}

/**
 * Gets the two most recent data files for comparison
 */
function getLatestDataFiles() {
  const files = getAllDataFiles();
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  const dataDir = getDataDirectory();
  return {
    today: files[0],
    yesterday: files[1],
    todayPath: path.join(dataDir, files[0]),
    yesterdayPath: path.join(dataDir, files[1])
  };
}

/**
 * Gets reports ~7 days apart for weekly analysis
 */
function getWeeklyDataFiles() {
  const dataDir = getDataDirectory();
  const files = getAllDataFiles();
  
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  // Get the latest file
  const latestFile = files[0];
  const latestDateMatch = latestFile.match(/(\d{4}-\d{2}-\d{2})/);
  if (!latestDateMatch) {
    throw new Error('Cannot parse date from latest file');
  }
  
  const latestDate = new Date(latestDateMatch[1]);
  const targetDate = new Date(latestDate);
  targetDate.setDate(targetDate.getDate() - 7); // 7 days ago
  
  // Find the file closest to 7 days ago
  let weekAgoFile = null;
  let minDiff = Infinity;
  
  for (const file of files) {
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const fileDate = new Date(dateMatch[1]);
      const diffDays = Math.abs((targetDate - fileDate) / (1000 * 60 * 60 * 24));
      
      // Look for files within 1 day of the target (6-8 days ago)
      if (diffDays < minDiff && diffDays <= 1) {
        minDiff = diffDays;
        weekAgoFile = file;
      }
    }
  }
  
  if (!weekAgoFile) {
    // Fallback: just get a file that's at least 6 days old
    for (const file of files) {
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const fileDate = new Date(dateMatch[1]);
        const diffDays = (latestDate - fileDate) / (1000 * 60 * 60 * 24);
        if (diffDays >= 6 && diffDays <= 8) {
          weekAgoFile = file;
          break;
        }
      }
    }
  }
  
  if (!weekAgoFile) {
    throw new Error('No data file found from approximately 7 days ago');
  }
  
  return {
    latest: latestFile,
    weekAgo: weekAgoFile,
    latestPath: path.join(dataDir, latestFile),
    weekAgoPath: path.join(dataDir, weekAgoFile),
    allFiles: files
  };
}

/**
 * Gets first-of-month reports for monthly analysis
 */
function getMonthlyDataFiles() {
  const dataDir = getDataDirectory();
  const files = getAllDataFiles();
  
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  // Find first-of-month reports, prioritizing day 1, then day 2-3 for weekends
  const firstOfMonthFiles = files.filter(file => {
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      const dayOfMonth = date.getDate();
      return dayOfMonth >= 1 && dayOfMonth <= 3; // First 3 days of month
    }
    return false;
  });
  
  if (firstOfMonthFiles.length < 2) {
    throw new Error('Need at least 2 first-of-month reports to compare');
  }
  
  // Group by month and pick the earliest day in each month
  const monthlyFiles = {};
  firstOfMonthFiles.forEach(file => {
    const dateMatch = file.match(/(\d{4}-\d{2})/);
    if (dateMatch) {
      const monthKey = dateMatch[1]; // YYYY-MM
      if (!monthlyFiles[monthKey] || file < monthlyFiles[monthKey]) {
        monthlyFiles[monthKey] = file; // Keep earliest file in month (lowest day)
      }
    }
  });
  
  const monthKeys = Object.keys(monthlyFiles).sort().reverse();
  if (monthKeys.length < 2) {
    throw new Error('Need at least 2 months of first-of-month reports to compare');
  }
  
  const currentMonthFirst = monthlyFiles[monthKeys[0]]; // Most recent month
  const previousMonthFirst = monthlyFiles[monthKeys[1]]; // Previous month
  
  return {
    latest: currentMonthFirst,
    monthAgo: previousMonthFirst,
    latestPath: path.join(dataDir, currentMonthFirst),
    monthAgoPath: path.join(dataDir, previousMonthFirst),
    allFiles: Object.values(monthlyFiles)
  };
}

/**
 * Loads a data file with error handling
 */
function loadDataFile(filepath) {
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to load data file ${filepath}: ${error.message}`);
  }
}

/**
 * Loads the most recent data file
 */
function loadLatestData() {
  const { filepath } = getLatestDataFile();
  return loadDataFile(filepath);
}

/**
 * Creates an instrument lookup map from data
 */
function createInstrumentMap(data) {
  const instrumentMap = new Map();
  
  if (data.instruments && data.instruments.details) {
    // Handle array format (newer data structure)
    if (Array.isArray(data.instruments.details)) {
      data.instruments.details.forEach(inst => {
        instrumentMap.set(inst.instrumentId, {
          name: inst.instrumentDisplayName,
          symbol: inst.symbolFull,
          type: inst.instrumentTypeID || 'Unknown'
        });
      });
    } 
    // Handle Map format (if it's already a Map)
    else if (data.instruments.details instanceof Map) {
      data.instruments.details.forEach((inst, key) => {
        instrumentMap.set(key, {
          name: inst.instrumentDisplayName,
          symbol: inst.symbolFull,
          type: inst.instrumentTypeID || 'Unknown'
        });
      });
    }
    // Handle object format
    else if (typeof data.instruments.details === 'object') {
      Object.entries(data.instruments.details).forEach(([key, inst]) => {
        const instrumentId = parseInt(key);
        instrumentMap.set(instrumentId, {
          name: inst.instrumentDisplayName,
          symbol: inst.symbolFull,
          type: inst.instrumentTypeID || 'Unknown'
        });
      });
    }
  }
  
  return instrumentMap;
}

/**
 * Gets asset information from instrument map
 */
function getAssetInfo(instrumentId, instrumentMap) {
  return instrumentMap.get(instrumentId) || {
    name: `Unknown Asset ${instrumentId}`,
    symbol: `ID${instrumentId}`,
    type: 'Unknown'
  };
}

/**
 * Calculates risk-adjusted score for an investor
 */
function calculateRiskAdjustedScore(investor) {
  const gainFactor = investor.gain / Math.max(investor.riskScore, 1);
  const winRatioFactor = (investor.winRatio || 70) / 100;
  const trustFactor = Math.log(Math.max(investor.copiers, 1000) / 1000);
  return gainFactor * winRatioFactor * trustFactor;
}

/**
 * Calculates Fear & Greed Index based on cash percentage
 * Linear mapping: 30% cash = 0 (Extreme Fear), 0% cash = 100 (Extreme Greed)
 */
function calculateFearGreedIndex(cashPercentage) {
  // Linear scale: 30% cash = 0, 0% cash = 100
  const indexValue = Math.round(100 - (cashPercentage / 30) * 100);
  const clampedValue = Math.max(0, Math.min(100, indexValue));
  
  // Determine status and emoji
  let status, emoji;
  if (clampedValue <= 20) {
    status = 'Extreme Fear';
    emoji = '😱';
  } else if (clampedValue <= 40) {
    status = 'Fear';
    emoji = '😟';
  } else if (clampedValue <= 60) {
    status = 'Neutral';
    emoji = '😐';
  } else if (clampedValue <= 80) {
    status = 'Greed';
    emoji = '😃';
  } else {
    status = 'Extreme Greed';
    emoji = '🤑';
  }
  
  return {
    value: clampedValue,
    status,
    emoji,
    cashPercentage
  };
}

/**
 * Finds top copier changes between two investor lists
 */
function findTopCopierChanges(currentInvestors, prevInvestors, threshold = 10) {
  const copierChanges = [];
  
  currentInvestors.slice(0, 100).forEach(currentInv => {
    const prevInv = prevInvestors.find(p => p.userName === currentInv.userName);
    if (prevInv) {
      const copierChange = currentInv.copiers - prevInv.copiers;
      if (Math.abs(copierChange) >= threshold) {
        copierChanges.push({
          investor: currentInv,
          change: copierChange,
          percentChange: (copierChange / prevInv.copiers) * 100
        });
      }
    }
  });
  
  return copierChanges.sort((a, b) => b.change - a.change);
}

/**
 * Finds biggest daily movers in holdings
 */
function findDailyMovers(currentHoldings, prevHoldings, threshold) {
  const movers = [];
  
  currentHoldings.slice(0, 50).forEach(h => {
    const prevHolding = prevHoldings.find(ph => ph.instrumentId === h.instrumentId);
    if (prevHolding) {
      const change = h.holdersCount - prevHolding.holdersCount;
      if (Math.abs(change) >= threshold) {
        const percentChange = ((change / prevHolding.holdersCount) * 100);
        movers.push({
          symbol: h.symbol,
          name: h.instrumentName,
          change: change,
          percentChange: percentChange,
          currentHolders: h.holdersCount
        });
      }
    }
  });
  
  return movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

/**
 * Formats a date for display
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a percentage with sign
 */
function formatPercentage(value, decimals = 1) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Formats a number with commas
 */
function formatNumber(value) {
  return value.toLocaleString('en-US');
}

/**
 * Ensures output directory exists
 */
function ensureOutputDirectory() {
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

/**
 * Saves analysis results to a file
 */
function saveAnalysisResult(filename, data) {
  const outputDir = ensureOutputDirectory();
  const filepath = path.join(outputDir, filename);
  
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, jsonData);
    return filepath;
  } catch (error) {
    throw new Error(`Failed to save analysis result to ${filename}: ${error.message}`);
  }
}

// Export all utilities
module.exports = {
  // Data access
  getDataDirectory,
  getLatestDataFile,
  getLatestDataFiles,
  getWeeklyDataFiles,
  getMonthlyDataFiles,
  getAllDataFiles,
  
  // Data loading
  loadDataFile,
  loadLatestData,
  
  // Asset/Instrument utilities
  createInstrumentMap,
  getAssetInfo,
  
  // Calculations
  calculateFearGreedIndex,
  
  // Investor analysis
  calculateRiskAdjustedScore,
  findTopCopierChanges,
  findDailyMovers,
  
  // Formatting helpers
  formatDate,
  formatPercentage,
  formatNumber,
  
  // File output
  saveAnalysisResult,
  ensureOutputDirectory
};