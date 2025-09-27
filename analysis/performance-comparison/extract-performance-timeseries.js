#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all JSON files sorted by date
const dataDir = path.join(__dirname, '../../public/data');
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort();

console.log(`Found ${files.length} data files`);

const timeSeriesData = [];

for (const file of files) {
  try {
    // Extract date from filename
    const dateMatch = file.match(/etoro-data-(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    // Read and parse JSON
    const filePath = path.join(dataDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Get analyses for different bands
    const analyses = data.analyses || [];

    // Find top 100 and all investors (1500) analyses by investorCount
    const top100 = analyses.find(a => a.investorCount === 100);
    const all1500 = analyses.find(a => a.investorCount === 1500);

    if (top100 && all1500) {
      // Extract average gain (YTD) for each group from averages
      const top100AvgGain = top100.averages?.gain || 0;
      const all1500AvgGain = all1500.averages?.gain || 0;

      // Also extract other interesting metrics
      const top100AvgCash = top100.averages?.cashPercentage || 0;
      const all1500AvgCash = all1500.averages?.cashPercentage || 0;

      const top100AvgRisk = top100.averages?.riskScore || 0;
      const all1500AvgRisk = all1500.averages?.riskScore || 0;

      const top100AvgTrades = top100.averages?.trades || 0;
      const all1500AvgTrades = all1500.averages?.trades || 0;

      const top100AvgWinRatio = top100.averages?.winRatio || 0;
      const all1500AvgWinRatio = all1500.averages?.winRatio || 0;

      timeSeriesData.push({
        date,
        top100: {
          avgGain: top100AvgGain,
          avgCash: top100AvgCash,
          avgRisk: top100AvgRisk,
          avgTrades: top100AvgTrades,
          avgWinRatio: top100AvgWinRatio,
          count: top100.investorCount || 100
        },
        all1500: {
          avgGain: all1500AvgGain,
          avgCash: all1500AvgCash,
          avgRisk: all1500AvgRisk,
          avgTrades: all1500AvgTrades,
          avgWinRatio: all1500AvgWinRatio,
          count: all1500.investorCount || 1500
        }
      });

      console.log(`${date}: Top 100 avg gain: ${top100AvgGain.toFixed(2)}%, All 1500 avg gain: ${all1500AvgGain.toFixed(2)}%`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

// Save the extracted time series data
const outputPath = path.join(__dirname, 'performance-timeseries.json');
fs.writeFileSync(outputPath, JSON.stringify(timeSeriesData, null, 2));

console.log(`\nExtracted performance data for ${timeSeriesData.length} days`);
console.log(`Data saved to: ${outputPath}`);

// Calculate some summary statistics
if (timeSeriesData.length > 0) {
  const latestData = timeSeriesData[timeSeriesData.length - 1];
  const firstData = timeSeriesData[0];

  console.log('\n=== Summary ===');
  console.log(`Date range: ${firstData.date} to ${latestData.date}`);
  console.log('\nLatest performance:');
  console.log(`  Top 100: ${latestData.top100.avgGain.toFixed(2)}% (Cash: ${latestData.top100.avgCash.toFixed(1)}%)`);
  console.log(`  All 1500: ${latestData.all1500.avgGain.toFixed(2)}% (Cash: ${latestData.all1500.avgCash.toFixed(1)}%)`);
  console.log(`  Outperformance: ${(latestData.top100.avgGain - latestData.all1500.avgGain).toFixed(2)}%`);

  // Calculate average outperformance over entire period
  const avgOutperformance = timeSeriesData.reduce((sum, d) =>
    sum + (d.top100.avgGain - d.all1500.avgGain), 0) / timeSeriesData.length;
  console.log(`\nAverage outperformance (Top 100 vs All): ${avgOutperformance.toFixed(2)}%`);
}