const fs = require('fs');
const path = require('path');

/**
 * Risk vs Return Analysis for Top 100 eToro Investors
 * Analyzes historical data to create scatter chart of average risk vs YTD return
 */

// Get all data files in chronological order
function getDataFiles() {
  const dataDir = path.join(__dirname, '../../public/data');
  return fs.readdirSync(dataDir)
    .filter(file => file.startsWith('etoro-data-') && file.endsWith('.json'))
    .sort(); // Chronological order by filename
}

// Load and parse a data file
function loadDataFile(filename) {
  try {
    const filePath = path.join(__dirname, '../../public/data', filename);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
  } catch (error) {
    console.warn(`Failed to load ${filename}:`, error.message);
    return null;
  }
}

// Calculate average risk score and period returns across all available data points
function calculateAverageRiskScores(dataFiles) {
  const investorRiskData = new Map(); // username -> [risk scores]
  
  console.log(`Processing ${dataFiles.length} data files...`);
  
  dataFiles.forEach(filename => {
    const data = loadDataFile(filename);
    if (!data || !data.investors) return;
    
    const date = filename.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
    console.log(`Processing ${filename} (${date}) - ${data.investors.length} investors`);
    
    data.investors.forEach(investor => {
      if (!investorRiskData.has(investor.userName)) {
        investorRiskData.set(investor.userName, []);
      }
      investorRiskData.get(investor.userName).push({
        riskScore: investor.riskScore,
        date: date,
        copiers: investor.copiers,
        gain: investor.gain,
        fullName: investor.fullName
      });
    });
  });
  
  // Calculate averages and period returns
  const averages = new Map();
  investorRiskData.forEach((dataPoints, username) => {
    // Sort by date to ensure chronological order
    dataPoints.sort((a, b) => a.date.localeCompare(b.date));
    
    const avgRisk = dataPoints.reduce((sum, point) => sum + point.riskScore, 0) / dataPoints.length;
    const latestData = dataPoints[dataPoints.length - 1]; // Most recent data for other fields
    const firstData = dataPoints[0]; // First data point for period calculation
    
    // Calculate period return: difference between first and last YTD return
    const periodReturn = latestData.gain - firstData.gain;
    
    averages.set(username, {
      username,
      fullName: latestData.fullName,
      averageRiskScore: avgRisk,
      currentRiskScore: latestData.riskScore,
      copiers: latestData.copiers,
      ytdReturn: latestData.gain,
      periodReturn: periodReturn, // NEW: Return for the analysis period
      firstDate: firstData.date,
      lastDate: latestData.date,
      dataPoints: dataPoints.length
    });
  });
  
  console.log(`Calculated averages for ${averages.size} unique investors`);
  return averages;
}

// Get top 100 investors by copiers and prepare chart data
function prepareChartData(investorAverages) {
  const investors = Array.from(investorAverages.values())
    .sort((a, b) => b.copiers - a.copiers)
    .slice(0, 100);
  
  console.log(`\nTop 100 Investors by Copiers:`);
  console.log(`Risk Score Range: ${Math.min(...investors.map(i => i.averageRiskScore)).toFixed(1)} - ${Math.max(...investors.map(i => i.averageRiskScore)).toFixed(1)}`);
  console.log(`Period Return Range: ${Math.min(...investors.map(i => i.periodReturn)).toFixed(1)}% - ${Math.max(...investors.map(i => i.periodReturn)).toFixed(1)}%`);
  console.log(`YTD Return Range: ${Math.min(...investors.map(i => i.ytdReturn)).toFixed(1)}% - ${Math.max(...investors.map(i => i.ytdReturn)).toFixed(1)}%`);
  console.log(`Copiers Range: ${Math.min(...investors.map(i => i.copiers)).toLocaleString()} - ${Math.max(...investors.map(i => i.copiers)).toLocaleString()}`);
  console.log(`Period: ${investors[0].firstDate} to ${investors[0].lastDate}`);
  
  return investors;
}

// Identify notable investors for labeling
function identifyNotableInvestors(investors) {
  const notable = new Set();
  
  // Top 5 by copiers
  const topByCopiers = investors.slice(0, 5);
  topByCopiers.forEach(inv => notable.add(inv.username));
  
  // Extreme risk scores
  const sortedByRisk = [...investors].sort((a, b) => a.averageRiskScore - b.averageRiskScore);
  notable.add(sortedByRisk[0].username); // Lowest risk
  notable.add(sortedByRisk[sortedByRisk.length - 1].username); // Highest risk
  
  // Extreme period returns
  const sortedByReturn = [...investors].sort((a, b) => a.periodReturn - b.periodReturn);
  notable.add(sortedByReturn[0].username); // Lowest period return
  notable.add(sortedByReturn[sortedByReturn.length - 1].username); // Highest period return
  
  // Interesting combinations - using period return instead of YTD
  const lowRiskHighReturn = investors
    .filter(inv => inv.averageRiskScore < 4 && inv.periodReturn > 10)
    .sort((a, b) => b.periodReturn - a.periodReturn)[0];
  if (lowRiskHighReturn) notable.add(lowRiskHighReturn.username);
  
  const highRiskHighReturn = investors
    .filter(inv => inv.averageRiskScore > 7 && inv.periodReturn > 15)
    .sort((a, b) => b.periodReturn - a.periodReturn)[0];
  if (highRiskHighReturn) notable.add(highRiskHighReturn.username);
  
  return notable;
}

// Perform quadrant analysis using period returns
function performQuadrantAnalysis(investors) {
  const avgRisk = investors.reduce((sum, inv) => sum + inv.averageRiskScore, 0) / investors.length;
  const avgPeriodReturn = investors.reduce((sum, inv) => sum + inv.periodReturn, 0) / investors.length;
  
  console.log(`\n📊 QUADRANT ANALYSIS (Risk: ${avgRisk.toFixed(1)}, Period Return: ${avgPeriodReturn.toFixed(1)}%):`);
  
  const quadrants = {
    'High Risk, High Return': investors.filter(inv => inv.averageRiskScore > avgRisk && inv.periodReturn > avgPeriodReturn),
    'Low Risk, High Return': investors.filter(inv => inv.averageRiskScore <= avgRisk && inv.periodReturn > avgPeriodReturn),
    'High Risk, Low Return': investors.filter(inv => inv.averageRiskScore > avgRisk && inv.periodReturn <= avgPeriodReturn),
    'Low Risk, Low Return': investors.filter(inv => inv.averageRiskScore <= avgRisk && inv.periodReturn <= avgPeriodReturn)
  };
  
  Object.entries(quadrants).forEach(([quadrant, invs]) => {
    console.log(`\n${quadrant}: ${invs.length} investors`);
    const top3 = invs.sort((a, b) => b.copiers - a.copiers).slice(0, 3);
    top3.forEach(inv => {
      console.log(`  • ${inv.fullName || inv.username} (@${inv.username}): Risk ${inv.averageRiskScore.toFixed(1)}, Period Return ${inv.periodReturn.toFixed(1)}%, ${inv.copiers.toLocaleString()} copiers`);
    });
  });
  
  return quadrants;
}

// Generate scatter chart data using period returns with custom highlighting
function generateScatterData(investors, notableUsernames, highlightUsers = []) {
  return investors.map(investor => ({
    x: parseFloat(investor.averageRiskScore.toFixed(2)),
    y: parseFloat(investor.periodReturn.toFixed(2)),
    label: notableUsernames.has(investor.username) || highlightUsers.includes(investor.username) ? 
      `@${investor.username} (${(investor.copiers/1000).toFixed(0)}K)` : undefined,
    copiers: investor.copiers,
    username: investor.username,
    fullName: investor.fullName,
    isHighlighted: highlightUsers.includes(investor.username)
  }));
}

// Main analysis function
async function analyzeRiskReturn(highlightUsers = []) {
  console.log('🎯 RISK VS RETURN ANALYSIS - TOP 100 ETORO INVESTORS\n');
  
  // Step 1: Load historical data
  const dataFiles = getDataFiles();
  console.log(`Found ${dataFiles.length} data files from ${dataFiles[0]} to ${dataFiles[dataFiles.length - 1]}`);
  
  // Step 2: Calculate average risk scores
  const investorAverages = calculateAverageRiskScores(dataFiles);
  
  // Step 3: Get top 100 and prepare data
  const top100 = prepareChartData(investorAverages);
  
  // Step 4: Identify notable investors
  const notableUsernames = identifyNotableInvestors(top100);
  console.log(`\n🏷️ Notable investors for labeling: ${Array.from(notableUsernames).join(', ')}`);
  
  // Step 5: Quadrant analysis
  const quadrants = performQuadrantAnalysis(top100);
  
  // Step 6: Generate chart data
  const scatterData = generateScatterData(top100, notableUsernames, highlightUsers);
  
  console.log(`\n📈 Chart data generated: ${scatterData.length} points, ${scatterData.filter(d => d.label).length} labeled`);
  
  return {
    scatterData,
    quadrants,
    notableInvestors: Array.from(notableUsernames).map(username => 
      top100.find(inv => inv.username === username)
    ),
    summary: {
      totalInvestors: top100.length,
      avgRisk: top100.reduce((sum, inv) => sum + inv.averageRiskScore, 0) / top100.length,
      avgPeriodReturn: top100.reduce((sum, inv) => sum + inv.periodReturn, 0) / top100.length,
      avgYtdReturn: top100.reduce((sum, inv) => sum + inv.ytdReturn, 0) / top100.length,
      dataFiles: dataFiles.length,
      dateRange: `${dataFiles[0].match(/(\d{4}-\d{2}-\d{2})/)?.[1]} to ${dataFiles[dataFiles.length - 1].match(/(\d{4}-\d{2}-\d{2})/)?.[1]}`
    }
  };
}

// Export for use by chart generation
module.exports = { analyzeRiskReturn };

// Run if called directly
if (require.main === module) {
  analyzeRiskReturn()
    .then(result => {
      console.log('\n✅ Analysis complete! Ready for chart generation.');
      console.log(`Data points: ${result.scatterData.length}`);
      console.log(`Date range: ${result.summary.dateRange}`);
      console.log(`Average risk: ${result.summary.avgRisk.toFixed(2)}`);
      console.log(`Average period return: ${result.summary.avgPeriodReturn.toFixed(1)}%`);
      console.log(`Average YTD return: ${result.summary.avgYtdReturn.toFixed(1)}%`);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error);
    });
}