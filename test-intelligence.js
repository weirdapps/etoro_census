/**
 * Comprehensive test for Portfolio Intelligence Service
 * Tests YTD calculation, S&P 500 comparison, and intelligence features
 */

require('dotenv').config({ path: '.env.local' });

// Import the services
const { simplifiedIntelligence } = require('./src/lib/services/simplified-intelligence-service.ts');

async function testIntelligenceService() {
  console.log('=== PORTFOLIO INTELLIGENCE SERVICE TEST ===\n');

  try {
    // 1. Test Portfolio Summary
    console.log('1. Testing Portfolio Summary...');
    console.log('================================');
    const summary = await simplifiedIntelligence.getPortfolioSummary();

    console.log('\n📊 Portfolio Summary:');
    console.log('   Portfolio Value:', '$' + summary.portfolioValue.toLocaleString());
    console.log('   Cash Balance:', '$' + summary.cashBalance.toLocaleString());
    console.log('   Total Value:', '$' + summary.totalValue.toLocaleString());
    console.log('   YTD Profit:', '$' + summary.ytdProfit.toLocaleString());
    console.log('   YTD Return:', summary.ytdProfitPercent + '%');
    console.log('   Position Count:', summary.positionCount);

    if (Math.abs(summary.ytdProfitPercent - 22) < 1) {
      console.log('   ✅ YTD return matches expected ~22%');
    } else {
      console.log('   ⚠️  YTD return differs from expected 22%');
    }

    console.log('\n   Top Positions:');
    summary.topPositions.forEach((pos, idx) => {
      console.log(`   ${idx + 1}. ${pos.symbol}: $${pos.marketValue.toLocaleString()} (${pos.allocation})`);
    });

    // 2. Test Performance Comparison
    console.log('\n\n2. Testing Performance Comparison...');
    console.log('=====================================');
    const comparison = await simplifiedIntelligence.getPerformanceComparison();

    console.log('\n📈 Your Performance:');
    console.log('   YTD Return:', comparison.yourPerformance.ytdReturn);
    console.log('   Portfolio Value:', comparison.yourPerformance.portfolioValue);
    console.log('   Cash Balance:', comparison.yourPerformance.cashBalance);
    console.log('   Total Value:', comparison.yourPerformance.totalValue);
    console.log('   Position Count:', comparison.yourPerformance.positionCount);
    console.log('   Cash %:', comparison.yourPerformance.cashPercent);

    console.log('\n📊 S&P 500 Benchmark:');
    console.log('   YTD Return:', comparison.marketAverages.ytdReturn);
    console.log('   Benchmark:', comparison.marketAverages.benchmark);
    console.log('   Current Price:', comparison.marketAverages.currentPrice);
    console.log('   Year Start Price:', comparison.marketAverages.yearStartPrice);

    console.log('\n⚡ Comparison Results:');
    console.log('   Outperformance:', comparison.comparison.outperformance);
    console.log('   Percentile Rank:', comparison.comparison.percentileRank);
    console.log('   Status:', comparison.comparison.status);
    console.log('   Message:', comparison.comparison.message);

    console.log('\n\n=== TEST COMPLETED ===');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  }
}

// Run the test
testIntelligenceService();
