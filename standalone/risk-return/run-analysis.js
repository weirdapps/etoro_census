#!/usr/bin/env node

/**
 * Risk vs Return Analysis Runner
 * 
 * This script runs the complete risk-return analysis for eToro Popular Investors
 * Usage: node analysis/risk-return/run-analysis.js
 */

const { analyzeRiskReturn } = require('./risk-return-analysis');
const fs = require('fs');
const path = require('path');

async function runRiskReturnAnalysis(highlightUsers = []) {
  console.log('🎯 Starting Risk vs Return Analysis...\n');
  
  try {
    // Run the analysis
    const analysis = await analyzeRiskReturn(highlightUsers);
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../../public/analysis-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save results with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const outputFile = path.join(outputDir, `risk-return-analysis-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify({
      metadata: {
        analysisDate: new Date().toISOString(),
        analysisType: 'risk-return',
        dataPoints: analysis.scatterData.length,
        period: analysis.summary.dateRange
      },
      summary: analysis.summary,
      scatterData: analysis.scatterData,
      quadrants: analysis.quadrants,
      notableInvestors: analysis.notableInvestors
    }, null, 2));
    
    console.log('✅ Analysis Complete!');
    console.log(`📊 Analyzed ${analysis.scatterData.length} investors`);
    console.log(`📈 Period: ${analysis.summary.dateRange}`);
    console.log(`💾 Results saved to: ${outputFile}`);
    console.log(`\n🏆 Top Performers:`);
    
    analysis.notableInvestors.slice(0, 5).forEach((investor, index) => {
      console.log(`${index + 1}. @${investor.username}: ${investor.ytdReturn.toFixed(1)}% return, ${investor.averageRiskScore.toFixed(1)} risk`);
    });
    
    console.log('\n📋 For eToro Post:');
    console.log('Use the analysis/risk-return/generate-etoro-post.js script');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  // Parse command line arguments for highlighting specific users
  const args = process.argv.slice(2);
  const highlightUsers = args.length > 0 ? args : [];
  
  if (highlightUsers.length > 0) {
    console.log(`🎯 Highlighting specific users: ${highlightUsers.join(', ')}`);
  }
  
  runRiskReturnAnalysis(highlightUsers);
}

module.exports = { runRiskReturnAnalysis };