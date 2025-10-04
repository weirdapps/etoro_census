/**
 * Test Elite Group Comparison Feature
 * Compare portfolio against different elite investor groups
 */

require('dotenv').config({ path: '.env.local' });

// Mock portfolio service for testing
const mockPortfolioService = {
  getPortfolio: async () => ({
    positions: [
      { instrumentId: 1005, symbol: 'AMZN', marketValue: 50000 },
      { instrumentId: 1155, symbol: 'BABA', marketValue: 30000 },
      { instrumentId: 23, symbol: 'AAPL', marketValue: 40000 },
      { instrumentId: 46, symbol: 'GOOGL', marketValue: 35000 },
      { instrumentId: 67, symbol: 'TSLA', marketValue: 25000 }
    ],
    totalValue: 180000,
    cashBalance: 20000
  })
};

// Import census data service directly
const { censusDataService } = require('./src/lib/services/census-data-service.ts');

async function testEliteGroups() {
  console.log('=== ELITE GROUP COMPARISON TEST ===\n');

  try {
    // Test 1: Compare against all elite groups
    console.log('1. COMPREHENSIVE ELITE GROUP COMPARISON');
    console.log('=========================================\n');

    // Fetch all 4 distinct groups
    const [broadMarket, topCopiers, topPerformers, lowRisk] = await Promise.all([
      censusDataService.getSmartMoneyFlow('all'), // All 1500+ investors
      censusDataService.getSmartMoneyFlow('topCopiers'),
      censusDataService.getSmartMoneyFlow('topPerformers'),
      censusDataService.getSmartMoneyFlow('lowRisk')
    ]);

    const portfolio = await mockPortfolioService.getPortfolio();
    const yourInstrumentIds = new Set(portfolio.positions?.map(p => p.instrumentId) || []);

    // Create comparison object
    const eliteComparison = {
      yourPortfolio: {
        positionCount: portfolio.positions?.length || 0,
        totalValue: ((portfolio.totalValue || 0) + (portfolio.cashBalance || 0)).toLocaleString()
      },
      comparisons: {
        broadMarket: {
          group: broadMarket.groupDescription,
          investorCount: broadMarket.investorCount,
          topMissing: broadMarket.topHoldings?.filter(h => !yourInstrumentIds.has(h.instrumentId) && h.penetration > 10).slice(0, 5),
          consensusPicks: broadMarket.consensus?.slice(0, 3).map(h => h.symbol) || []
        },
        topCopiers: {
          group: topCopiers.groupDescription,
          investorCount: topCopiers.investorCount,
          topMissing: topCopiers.topHoldings?.filter(h => !yourInstrumentIds.has(h.instrumentId) && h.penetration > 30).slice(0, 5),
          consensusPicks: topCopiers.consensus?.slice(0, 3).map(h => h.symbol) || []
        },
        topPerformers: {
          group: topPerformers.groupDescription,
          investorCount: topPerformers.investorCount,
          topMissing: topPerformers.topHoldings?.filter(h => !yourInstrumentIds.has(h.instrumentId) && h.penetration > 30).slice(0, 5),
          consensusPicks: topPerformers.consensus?.slice(0, 3).map(h => h.symbol) || []
        },
        lowRisk: {
          group: lowRisk.groupDescription,
          investorCount: lowRisk.investorCount,
          topMissing: lowRisk.topHoldings?.filter(h => !yourInstrumentIds.has(h.instrumentId) && h.penetration > 30).slice(0, 5),
          consensusPicks: lowRisk.consensus?.slice(0, 3).map(h => h.symbol) || []
        }
      },
      insights: {}
    };

    console.log('📊 Your Portfolio:');
    console.log(`   Positions: ${eliteComparison.yourPortfolio.positionCount}`);
    console.log(`   Total Value: $${eliteComparison.yourPortfolio.totalValue}\n`);

    // Show comparison for each group
    console.log('📈 COMPARISON BY ELITE GROUP:\n');

    // All Investors (Broad Market)
    const all = eliteComparison.comparisons.broadMarket;
    console.log(`1️⃣ ${all.group}`);
    console.log(`   Analyzing: ${all.investorCount} investors`);
    console.log(`   Top stocks you're missing:`);
    all.topMissing?.forEach((stock, idx) => {
      console.log(`   ${idx + 1}. ${stock.symbol} - Held by ${stock.penetration.toFixed(0)}%, avg allocation: ${stock.averageAllocation.toFixed(1)}%`);
    });
    console.log(`   Consensus picks: ${all.consensusPicks.join(', ') || 'None'}\n`);

    // Top 100 Most Copied
    const copiers = eliteComparison.comparisons.topCopiers;
    console.log(`2️⃣ ${copiers.group} (Highest Social Proof)`);
    console.log(`   Analyzing: ${copiers.investorCount} investors`);
    console.log(`   Top stocks you're missing:`);
    copiers.topMissing?.forEach((stock, idx) => {
      console.log(`   ${idx + 1}. ${stock.symbol} - Held by ${stock.penetration.toFixed(0)}%, avg allocation: ${stock.averageAllocation.toFixed(1)}%`);
    });
    console.log(`   Consensus picks: ${copiers.consensusPicks.join(', ') || 'None'}\n`);

    // Top 100 YTD Performers
    const performers = eliteComparison.comparisons.topPerformers;
    console.log(`3️⃣ ${performers.group} (Best Current Strategies)`);
    console.log(`   Analyzing: ${performers.investorCount} investors`);
    console.log(`   Top stocks you're missing:`);
    performers.topMissing?.forEach((stock, idx) => {
      console.log(`   ${idx + 1}. ${stock.symbol} - Held by ${stock.penetration.toFixed(0)}%, avg allocation: ${stock.averageAllocation.toFixed(1)}%`);
    });
    console.log(`   Consensus picks: ${performers.consensusPicks.join(', ') || 'None'}\n`);

    // Top 100 Conservative (Low Risk) - NEW!
    const conservative = eliteComparison.comparisons.lowRisk;
    console.log(`4️⃣ ${conservative.group} (Lowest Risk Scores)`);
    console.log(`   Analyzing: ${conservative.investorCount} investors`);
    console.log(`   Top stocks you're missing:`);
    conservative.topMissing?.forEach((stock, idx) => {
      console.log(`   ${idx + 1}. ${stock.symbol} - Held by ${stock.penetration.toFixed(0)}%, avg allocation: ${stock.averageAllocation.toFixed(1)}%`);
    });
    console.log(`   Consensus picks: ${conservative.consensusPicks.join(', ') || 'None'}\n`);

    // Generate insights
    const allEliteHoldings = new Map();

    // Count appearances across elite groups (not broad market)
    [...topCopiers.topHoldings, ...topPerformers.topHoldings, ...lowRisk.topHoldings]
      .filter(h => !yourInstrumentIds.has(h.instrumentId))
      .forEach(h => {
        const count = allEliteHoldings.get(h.symbol) || 0;
        allEliteHoldings.set(h.symbol, count + 1);
      });

    // Find must-have stocks (in all 3 elite groups)
    const mustHaveStocks = Array.from(allEliteHoldings.entries())
      .filter(([_, count]) => count >= 3)
      .map(([symbol, _]) => symbol)
      .slice(0, 3);

    // Find performer edge picks (unique to top performers, not in conservative)
    const performerEdgePicks = topPerformers.topHoldings
      ?.filter(h =>
        !yourInstrumentIds.has(h.instrumentId) &&
        !lowRisk.topHoldings?.some(c => c.instrumentId === h.instrumentId)
      )
      .slice(0, 2)
      .map(h => h.symbol) || [];

    // Find conservative consensus (in both copiers and low risk but not performers)
    const conservativePicks = topCopiers.topHoldings
      ?.filter(h =>
        !yourInstrumentIds.has(h.instrumentId) &&
        lowRisk.topHoldings?.some(l => l.instrumentId === h.instrumentId) &&
        !topPerformers.topHoldings?.some(p => p.instrumentId === h.instrumentId)
      )
      .slice(0, 2)
      .map(h => h.symbol) || [];

    // Key Insights
    console.log('💡 KEY INSIGHTS:');
    console.log('=================');

    if (mustHaveStocks.length > 0) {
      console.log(`\n🔥 MUST-HAVE STOCKS (held by ALL 3 elite groups):`);
      console.log(`   ${mustHaveStocks.join(', ')}`);
    }

    if (performerEdgePicks.length > 0) {
      console.log(`\n⚡ PERFORMANCE EDGE PICKS (unique to top performers, not in conservative):`);
      console.log(`   ${performerEdgePicks.join(', ')}`);
    }

    if (conservativePicks.length > 0) {
      console.log(`\n🛡️ CONSERVATIVE CONSENSUS (safe haven picks):`);
      console.log(`   ${conservativePicks.join(', ')}`);
    }

    console.log(`\n📌 RECOMMENDATION:`);
    const recommendation = mustHaveStocks.length > 0
      ? `Consider adding ${mustHaveStocks.join(', ')} - held by all elite groups`
      : performerEdgePicks.length > 0
      ? `Top performers are uniquely holding ${performerEdgePicks.join(', ')}`
      : conservativePicks.length > 0
      ? `Conservative investors favor ${conservativePicks.join(', ')}`
      : 'Your portfolio aligns well with elite investors';
    console.log(`   ${recommendation}`);

    // Test 2: Individual group analysis
    console.log('\n\n2. INDIVIDUAL GROUP ANALYSIS - Top Performers');
    console.log('================================================\n');

    console.log(`Analyzing: ${topPerformers.groupDescription}`);
    console.log(`Group size: ${topPerformers.investorCount} investors\n`);

    console.log('Top opportunities from best performers:');
    const opportunities = topPerformers.topHoldings
      ?.filter(h => !yourInstrumentIds.has(h.instrumentId))
      .slice(0, 3);

    opportunities?.forEach((opp, idx) => {
      console.log(`${idx + 1}. ${opp.symbol}:`);
      console.log(`   Held by: ${opp.penetration.toFixed(0)}% of top performers`);
      console.log(`   Average allocation: ${opp.averageAllocation.toFixed(1)}%`);
      console.log(`   Recommendation: Consider adding to capture performance edge`);
    });

    // Test 3: Low Risk Group Analysis
    console.log('\n\n3. INDIVIDUAL GROUP ANALYSIS - Conservative Investors');
    console.log('========================================================\n');

    console.log(`Analyzing: ${lowRisk.groupDescription}`);
    console.log(`Group size: ${lowRisk.investorCount} investors\n`);

    console.log('Top safe haven picks from conservative investors:');
    const safeHavens = lowRisk.topHoldings
      ?.filter(h => !yourInstrumentIds.has(h.instrumentId))
      .slice(0, 3);

    safeHavens?.forEach((safe, idx) => {
      console.log(`${idx + 1}. ${safe.symbol}:`);
      console.log(`   Held by: ${safe.penetration.toFixed(0)}% of conservative investors`);
      console.log(`   Average allocation: ${safe.averageAllocation.toFixed(1)}%`);
      console.log(`   Recommendation: Stable defensive position`);
    });

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testEliteGroups();