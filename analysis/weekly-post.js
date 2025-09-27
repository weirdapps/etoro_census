/**
 * Weekly Post Generator - Enhanced Format
 * Matches daily post style with weekly-specific insights
 */

const utils = require('./lib/utils');

function generateWeeklyPost() {
  // Get weekly data files
  const files = utils.getWeeklyDataFiles();
  console.log(`Weekly analysis: ${files.weekAgo} to ${files.latest}\n`);

  // Load data
  const currentData = utils.loadDataFile(files.latestPath);
  const weekAgoData = utils.loadDataFile(files.weekAgoPath);

  const current1500 = currentData.analyses[3];
  const current100 = currentData.analyses[0];
  const weekAgo1500 = weekAgoData.analyses[3];
  const weekAgo100 = weekAgoData.analyses[0];

  // Extract dates
  const currentDate = files.latest.match(/(\d{4}-\d{2}-\d{2})/)[1];
  const weekAgoDate = files.weekAgo.match(/(\d{4}-\d{2}-\d{2})/)[1];

  // Header with date range
  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗪𝗲𝗲𝗸𝗹𝘆 𝗨𝗽𝗱𝗮𝘁𝗲 (' + weekAgoDate + ' → ' + currentDate + ') 🎩');
  console.log('');

  // 1. Performance Comparison
  console.log('\n📈 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗖𝗼𝗺𝗽𝗮𝗿𝗶𝘀𝗼𝗻:');
  console.log('');
  const perfChange100 = current100.averages.gain - weekAgo100.averages.gain;
  const perfChange1500 = current1500.averages.gain - weekAgo1500.averages.gain;
  const top100Advantage = current100.averages.gain - current1500.averages.gain;

  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.gain.toFixed(1) + '% YTD (' +
    utils.formatPercentage(perfChange100) + ' weekly)');
  console.log('\n  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.gain.toFixed(1) + '% YTD (' +
    utils.formatPercentage(perfChange1500) + ' weekly)');
  console.log('\n  𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘚𝗮𝗴𝗲: ' + utils.formatPercentage(top100Advantage, 1) + 'pp');

  // 2. Cash Positioning & Risk Sentiment
  console.log('\n💰 𝗖𝗮𝘀𝗵 𝗣𝗼𝘀𝗶𝘁𝗶𝗼𝗻𝗶𝗻𝗴 & 𝐑𝐢𝐬𝐤:');
  console.log('');
  const cashChange100 = current100.averages.cashPercentage - weekAgo100.averages.cashPercentage;
  const cashChange1500 = current1500.averages.cashPercentage - weekAgo1500.averages.cashPercentage;

  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.cashPercentage.toFixed(1) + '% (' +
    utils.formatPercentage(cashChange100) + ' weekly)');
  console.log('\n  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.cashPercentage.toFixed(1) + '% (' +
    utils.formatPercentage(cashChange1500) + ' weekly)');

  // Risk sentiment interpretation
  const avgCashChange = (cashChange100 + cashChange1500) / 2;
  let riskSentiment = '';
  if (avgCashChange > 1) riskSentiment = '⚠️ Risk-off mode';
  else if (avgCashChange < -1) riskSentiment = '🚀 Risk-on mode';
  else riskSentiment = '⚖️ Balanced sentiment';
  console.log('\n  𝗦𝗲𝗻𝘁𝗶𝗺𝗲𝗻𝘁: ' + riskSentiment);

  // 3. Trading Activity Analysis
  console.log('\n📊 𝗧𝗿𝗮𝗱𝗶𝗻𝗴 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆:');
  console.log('');
  const tradesChange100 = current100.averages.trades - weekAgo100.averages.trades;
  const tradesChange1500 = current1500.averages.trades - weekAgo1500.averages.trades;

  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange100 > 0 ? '+' : '') + tradesChange100.toFixed(0) + ' weekly)');
  console.log('\n  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange1500 > 0 ? '+' : '') + tradesChange1500.toFixed(0) + ' weekly)');

  // 4. Top 10 Portfolio Holdings Comparison
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀:');
  console.log('');

  // Create instrument map
  const instrumentMap = utils.createInstrumentMap(currentData);

  // Process Top 100 holdings
  const holdings100 = current100.topHoldings.slice(0, 10);
  const weekAgoHoldings100 = weekAgo100.topHoldings.slice(0, 10);

  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬:');
  holdings100.forEach((holding, i) => {
    const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
    const weekAgoHolding = weekAgoHoldings100.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = weekAgoHolding ? holding.holdersCount - weekAgoHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '↑' : holderChange < 0 ? '↓' : '→';

    console.log(`  ${i+1}. $${asset.symbol} (${holding.holdersCount}% ${changeIcon}${Math.abs(holderChange)})`);
  });

  // Process Broad Group holdings
  const holdings1500 = current1500.topHoldings.slice(0, 10);
  const weekAgoHoldings1500 = weekAgo1500.topHoldings.slice(0, 10);

  console.log('\n  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  holdings1500.forEach((holding, i) => {
    const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
    const weekAgoHolding = weekAgoHoldings1500.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = weekAgoHolding ? holding.holdersCount - weekAgoHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '↑' : holderChange < 0 ? '↓' : '→';
    // Use holdersPercentage for broad group instead of holdersCount
    const percentage = holding.holdersPercentage || (holding.holdersCount / 15 || 0);

    console.log(`  ${i+1}. $${asset.symbol} (${percentage.toFixed(0)}% ${changeIcon}${Math.abs(holderChange)})`);
  });

  // 5. Biggest Weekly Asset Moves
  console.log('\n🔄 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗪𝗲𝗲𝗸𝗹𝘆 𝗔𝘀𝘀𝗲𝘁 𝗠𝗼𝘃𝗲𝘀:');
  console.log('');

  // Find weekly movers - use current100 topHoldings for consistency
  const weeklyMovers100 = utils.findDailyMovers(current100.topHoldings, weekAgo100.topHoldings, 2);
  const weeklyMovers1500 = utils.findDailyMovers(current1500.topHoldings, weekAgo1500.topHoldings, 5);

  // Top 100 moves
  if (weeklyMovers100.length > 0) {
    const adds100 = weeklyMovers100.filter(m => m.change > 0).slice(0, 3);
    const drops100 = weeklyMovers100.filter(m => m.change < 0).slice(0, 3);

    if (adds100.length > 0) {
      console.log('\n  𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      adds100.forEach(m => {
        console.log(`  • $${m.symbol}: +${m.change} investors (${utils.formatPercentage(m.percentChange)})`);
      });
    }

    if (drops100.length > 0) {
      console.log('\n  𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      drops100.forEach(m => {
        console.log(`  • $${m.symbol}: ${m.change} investors (${m.percentChange.toFixed(1)}%)`);
      });
    }
  } else {
    console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: Minimal portfolio changes this week');
  }

  // Broad Group moves
  if (weeklyMovers1500.length > 0) {
    const adds1500 = weeklyMovers1500.filter(m => m.change > 0).slice(0, 3);
    const drops1500 = weeklyMovers1500.filter(m => m.change < 0).slice(0, 3);

    if (adds1500.length > 0) {
      console.log('\n  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      adds1500.forEach(m => {
        console.log(`  • $${m.symbol}: +${m.change} investors (${utils.formatPercentage(m.percentChange)})`);
      });
    }

    if (drops1500.length > 0) {
      console.log('\n  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      drops1500.forEach(m => {
        console.log(`  • $${m.symbol}: ${m.change} investors (${m.percentChange.toFixed(1)}%)`);
      });
    }
  } else {
    console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: Minimal portfolio changes this week');
  }

  // 6. Weekly Copier Trends
  console.log('\n👥 𝗪𝗲𝗲𝗸𝗹𝘆 𝗖𝗼𝗽𝗶𝗲𝗿 𝗧𝗿𝗲𝗻𝗱𝘀:');
  console.log('');

  const copierChanges = utils.findTopCopierChanges(currentData.investors, weekAgoData.investors, 10);
  const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  if (gainers.length > 0) {
    console.log('\n  🚀 𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
    gainers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`  ${i+1}. ${name} (@${change.investor.userName}): (${utils.formatNumber(change.investor.copiers)} ↑${change.change})`);
    });
  }

  if (losers.length > 0) {
    console.log('\n  📉 𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀:');
    losers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`  ${i+1}. ${name} (@${change.investor.userName}): (${utils.formatNumber(change.investor.copiers)} ↓${Math.abs(change.change)})`);
    });
  }

  if (gainers.length === 0 && losers.length === 0) {
    console.log('  Stable copier counts - minimal changes (under ±10) in investor following this week');
  }

  // 7. Weekly Market Insights (expanded for weekly timeframe)
  console.log('\n💡 𝐖𝐞𝐞𝐤𝐥𝐲 𝗞𝗲𝘆 𝗜𝗻𝘀𝗶𝗴𝗵𝘁𝘀:');
  console.log('');

  const insights = [];

  // Performance divergence
  if (Math.abs(perfChange100 - perfChange1500) > 1) {
    const who = perfChange100 > perfChange1500 ? 'Top 100' : 'Broad market';
    const gap = Math.abs(perfChange100 - perfChange1500).toFixed(1);
    insights.push(`• ${who} outperformed by ${gap}pp this week - skill divergence widening`);
  }

  // Risk sentiment shift
  if (Math.abs(avgCashChange) > 1) {
    const direction = avgCashChange > 0 ? 'defensive' : 'aggressive';
    insights.push(`• Market turning ${direction} - cash positions ${avgCashChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(avgCashChange).toFixed(1)}%`);
  }

  // Trading activity
  const avgTradesChange = (tradesChange100 + tradesChange1500) / 2;
  if (Math.abs(avgTradesChange) > 10) {
    const activity = avgTradesChange > 0 ? 'increased' : 'decreased';
    insights.push(`• Trading activity ${activity} significantly - ${Math.abs(avgTradesChange).toFixed(0)} trades/week change`);
  }

  // Sector rotation
  if (weeklyMovers100.length > 5 || weeklyMovers1500.length > 10) {
    insights.push('• Major portfolio rotation detected - significant asset reallocation this week');
  }

  // Copier momentum
  const totalCopierChange = copierChanges.reduce((sum, c) => sum + c.change, 0);
  if (Math.abs(totalCopierChange) > 1000) {
    const direction = totalCopierChange > 0 ? 'growing' : 'declining';
    insights.push(`• Copier momentum ${direction} - net ${Math.abs(totalCopierChange)} copier changes`);
  }

  if (insights.length === 0) {
    insights.push('• Stable week with minimal disruptions - steady market conditions');
  }

  insights.forEach(insight => console.log(insight));

  // Footer (aligned with daily post format)
  console.log('\n**\n');
  console.log('Check out the census dashboard at:\n');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\nupdated daily at 02:00 UTC!');
}

// Run the weekly post generation
try {
  generateWeeklyPost();
} catch (error) {
  console.error('Error:', error.message);
}