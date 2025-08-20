/**
 * Monthly Post Generator - Enhanced Format
 * Matches daily post style with monthly-specific insights and trends
 */

const utils = require('./lib/utils');

function generateMonthlyPost() {
  // Get monthly data files
  const files = utils.getMonthlyDataFiles();
  console.log(`Monthly analysis: ${files.monthAgo} to ${files.latest}\n`);
  
  // Load data
  const currentData = utils.loadDataFile(files.latestPath);
  const monthAgoData = utils.loadDataFile(files.monthAgoPath);
  
  const current1500 = currentData.analyses[3];
  const current100 = currentData.analyses[0];
  const monthAgo1500 = monthAgoData.analyses[3];
  const monthAgo100 = monthAgoData.analyses[0];
  
  // Extract dates
  const currentDate = files.latest.match(/(\d{4}-\d{2}-\d{2})/)[1];
  const monthAgoDate = files.monthAgo.match(/(\d{4}-\d{2}-\d{2})/)[1];
  
  // Header with emoji
  console.log('📈 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗥𝗲𝗽𝗼𝗿𝘁 ' + currentDate + ' 📈');
  
  // 1. Performance Overview
  console.log('\n🎯 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗢𝘃𝗲𝗿𝘃𝗶𝗲𝘄:');
  const perfChange100 = current100.averages.gain - monthAgo100.averages.gain;
  const perfChange1500 = current1500.averages.gain - monthAgo1500.averages.gain;
  const top100Advantage = current100.averages.gain - current1500.averages.gain;
  
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.gain.toFixed(1) + '% YTD (' + 
    utils.formatPercentage(perfChange100) + 'pp monthly)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.gain.toFixed(1) + '% YTD (' + 
    utils.formatPercentage(perfChange1500) + 'pp monthly)');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘁𝗮𝗴𝗲: ' + utils.formatPercentage(top100Advantage, 1) + 'pp');
  
  // 2. Risk & Cash Analysis
  console.log('\n⚖️ 𝗥𝗶𝘀𝗸 & 𝗖𝗮𝘀𝗵 𝗔𝗻𝗮𝗹𝘆𝘀𝗶𝘀:');
  const cashChange100 = current100.averages.cashPercentage - monthAgo100.averages.cashPercentage;
  const cashChange1500 = current1500.averages.cashPercentage - monthAgo1500.averages.cashPercentage;
  const riskChange100 = current100.averages.riskScore - monthAgo100.averages.riskScore;
  const riskChange1500 = current1500.averages.riskScore - monthAgo1500.averages.riskScore;
  
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: Cash ' + current100.averages.cashPercentage.toFixed(1) + '% (' + 
    utils.formatPercentage(cashChange100) + 'pp) | Risk ' + current100.averages.riskScore.toFixed(1) + 
    ' (' + utils.formatPercentage(riskChange100) + ')');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: Cash ' + current1500.averages.cashPercentage.toFixed(1) + '% (' + 
    utils.formatPercentage(cashChange1500) + 'pp) | Risk ' + current1500.averages.riskScore.toFixed(1) + 
    ' (' + utils.formatPercentage(riskChange1500) + ')');
  
  // Monthly trend interpretation
  const avgCashChange = (cashChange100 + cashChange1500) / 2;
  let monthlyTrend = '';
  if (avgCashChange > 2) monthlyTrend = '🛡️ DEFENSIVE SHIFT';
  else if (avgCashChange < -2) monthlyTrend = '🎯 AGGRESSIVE POSITIONING';
  else monthlyTrend = '⚖️ BALANCED APPROACH';
  console.log('𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗧𝗿𝗲𝗻𝗱: ' + monthlyTrend);
  
  // 3. Trading Activity Trends
  console.log('\n📊 𝗧𝗿𝗮𝗱𝗶𝗻𝗴 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆 𝐓𝐫𝐞𝐧𝐝𝐬:');
  const tradesChange100 = current100.averages.trades - monthAgo100.averages.trades;
  const tradesChange1500 = current1500.averages.trades - monthAgo1500.averages.trades;
  const winRatioChange100 = current100.averages.winRatio - monthAgo100.averages.winRatio;
  const winRatioChange1500 = current1500.averages.winRatio - monthAgo1500.averages.winRatio;
  
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.trades.toFixed(0) + ' trades (' + 
    (tradesChange100 > 0 ? '+' : '') + tradesChange100.toFixed(0) + ') | Win ' + 
    current100.averages.winRatio.toFixed(1) + '% (' + utils.formatPercentage(winRatioChange100) + 'pp)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.trades.toFixed(0) + ' trades (' + 
    (tradesChange1500 > 0 ? '+' : '') + tradesChange1500.toFixed(0) + ') | Win ' + 
    current1500.averages.winRatio.toFixed(1) + '% (' + utils.formatPercentage(winRatioChange1500) + 'pp)');
  
  // 4. Top Holdings Evolution
  console.log('\n💎 𝗧𝗼𝗽 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 𝗘𝘃𝗼𝗹𝘂𝘁𝗶𝗼𝗻:');
  
  // Create instrument map
  const instrumentMap = utils.createInstrumentMap(currentData);
  
  // Top 100 holdings with monthly changes
  const holdings100 = current100.topHoldings.slice(0, 10);
  const monthAgoHoldings100 = monthAgo100.topHoldings.slice(0, 10);
  
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼:');
  holdings100.forEach((holding, i) => {
    const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
    const monthAgoHolding = monthAgoHoldings100.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = monthAgoHolding ? holding.holdersCount - monthAgoHolding.holdersCount : holding.holdersCount;
    const changeIcon = holderChange > 2 ? '🔥' : holderChange > 0 ? '↑' : holderChange < -2 ? '❄️' : holderChange < 0 ? '↓' : '→';
    
    console.log(`${i+1}. $${asset.symbol} (${holding.holdersCount}% ${changeIcon}${Math.abs(holderChange)})`);
  });
  
  // Broad Group holdings
  const holdings1500 = current1500.topHoldings.slice(0, 10);
  const monthAgoHoldings1500 = monthAgo1500.topHoldings.slice(0, 10);
  
  console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼:');
  holdings1500.forEach((holding, i) => {
    const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
    const monthAgoHolding = monthAgoHoldings1500.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = monthAgoHolding ? holding.holdersCount - monthAgoHolding.holdersCount : holding.holdersCount;
    const changeIcon = holderChange > 10 ? '🔥' : holderChange > 0 ? '↑' : holderChange < -10 ? '❄️' : holderChange < 0 ? '↓' : '→';
    
    console.log(`${i+1}. $${asset.symbol} (${holding.holdersCount}% ${changeIcon}${Math.abs(holderChange)})`);
  });
  
  // 5. Major Monthly Moves
  console.log('\n🔄 𝗠𝗮𝗷𝗼𝗿 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗠𝗼𝘃𝗲𝘀:');
  
  // Find monthly movers with higher thresholds
  const monthlyMovers100 = utils.findDailyMovers(current100.topHoldings, monthAgo100.topHoldings, 3);
  const monthlyMovers1500 = utils.findDailyMovers(current1500.topHoldings, monthAgo1500.topHoldings, 10);
  
  // Identify new entries and exits
  const newEntries100 = holdings100.filter(h => !monthAgoHoldings100.find(m => m.instrumentId === h.instrumentId));
  const exits100 = monthAgoHoldings100.filter(h => !holdings100.find(m => m.instrumentId === h.instrumentId));
  
  if (newEntries100.length > 0) {
    console.log('🆕 𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗡𝗲𝘄 𝗘𝗻𝘁𝗿𝗶𝗲𝘀:');
    newEntries100.slice(0, 3).forEach(holding => {
      const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
      console.log(`• $${asset.symbol}: ${holding.holdersCount}% of investors`);
    });
  }
  
  if (exits100.length > 0) {
    console.log('🚪 𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗘𝘅𝗶𝘁𝘀:');
    exits100.slice(0, 3).forEach(holding => {
      const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
      console.log(`• $${asset.symbol}: completely removed`);
    });
  }
  
  const biggestGains1500 = monthlyMovers1500.filter(m => m.change > 0).slice(0, 3);
  const biggestDrops1500 = monthlyMovers1500.filter(m => m.change < 0).slice(0, 3);
  
  if (biggestGains1500.length > 0) {
    console.log('\n📈 𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗚𝗮𝗶𝗻𝘀:');
    biggestGains1500.forEach(m => {
      console.log(`• $${m.symbol}: +${m.change} investors (${utils.formatPercentage(m.percentChange)})`);
    });
  }
  
  if (biggestDrops1500.length > 0) {
    console.log('📉 𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗗𝗿𝗼𝗽𝘀:');
    biggestDrops1500.forEach(m => {
      console.log(`• $${m.symbol}: ${m.change} investors (${m.percentChange.toFixed(1)}%)`);
    });
  }
  
  // 6. Monthly Copier Momentum
  console.log('\n👥 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗖𝗼𝗽𝗶𝗲𝗿 𝗠𝗼𝗺𝗲𝗻𝘁𝘂𝗺:');
  
  const copierChanges = utils.findTopCopierChanges(currentData.investors, monthAgoData.investors, 50);
  const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);
  
  if (gainers.length > 0) {
    console.log('🚀 𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
    gainers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      const momentum = change.percentChange > 20 ? '🔥' : change.percentChange > 10 ? '📈' : '↑';
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${utils.formatNumber(change.investor.copiers)} ↑${change.change}) ${momentum}`);
    });
  }
  
  if (losers.length > 0) {
    console.log('\n📉 𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀:');
    losers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      const momentum = change.percentChange < -20 ? '🆘' : change.percentChange < -10 ? '📉' : '↓';
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${utils.formatNumber(change.investor.copiers)} ↓${Math.abs(change.change)}) ${momentum}`);
    });
  }
  
  // 7. Monthly Market Insights (comprehensive monthly analysis)
  console.log('\n💡 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝗞𝗲𝘆 𝗜𝗻𝘀𝗶𝗴𝗵𝘁𝐬:');
  
  const insights = [];
  
  // Performance trend analysis
  if (perfChange100 > 0 && perfChange1500 > 0) {
    insights.push(`• 📈 Broad market rally - both groups gained ${Math.min(perfChange100, perfChange1500).toFixed(1)}%+ this month`);
  } else if (perfChange100 < 0 && perfChange1500 < 0) {
    insights.push(`• 📉 Market correction - both groups declined this month`);
  } else if (Math.abs(perfChange100 - perfChange1500) > 2) {
    const leader = perfChange100 > perfChange1500 ? 'Top 100' : 'Broad market';
    insights.push(`• 🎯 ${leader} significantly outperformed by ${Math.abs(perfChange100 - perfChange1500).toFixed(1)}pp`);
  }
  
  // Risk appetite assessment
  if (avgCashChange > 2) {
    insights.push(`• 🛡️ Major defensive shift - cash increased ${avgCashChange.toFixed(1)}% on average`);
  } else if (avgCashChange < -2) {
    insights.push(`• 🚀 Risk-on month - cash deployed aggressively (${Math.abs(avgCashChange).toFixed(1)}% reduction)`);
  }
  
  // Trading behavior
  const avgTradesChange = (tradesChange100 + tradesChange1500) / 2;
  if (avgTradesChange > 30) {
    insights.push(`• ⚡ Trading surge - activity up ${avgTradesChange.toFixed(0)} trades/month`);
  } else if (avgTradesChange < -30) {
    insights.push(`• 🧘 Trading slowdown - activity down ${Math.abs(avgTradesChange).toFixed(0)} trades/month`);
  }
  
  // Win ratio trends
  const avgWinChange = (winRatioChange100 + winRatioChange1500) / 2;
  if (avgWinChange > 2) {
    insights.push(`• ✅ Improving accuracy - win ratios up ${avgWinChange.toFixed(1)}pp`);
  } else if (avgWinChange < -2) {
    insights.push(`• ⚠️ Declining accuracy - win ratios down ${Math.abs(avgWinChange).toFixed(1)}pp`);
  }
  
  // Portfolio shifts
  if (newEntries100.length > 0 || exits100.length > 0) {
    insights.push(`• 🔄 Major portfolio reshuffling - ${newEntries100.length} new entries, ${exits100.length} exits in Top 100`);
  }
  
  // Copier dynamics
  const totalCopierChange = copierChanges.reduce((sum, c) => sum + c.change, 0);
  if (Math.abs(totalCopierChange) > 5000) {
    const trend = totalCopierChange > 0 ? 'expansion' : 'consolidation';
    insights.push(`• 👥 Copier ${trend} - net ${Math.abs(totalCopierChange).toLocaleString()} change this month`);
  }
  
  // Market consensus vs divergence
  const consensusScore = Math.abs(cashChange100 - cashChange1500) + Math.abs(perfChange100 - perfChange1500);
  if (consensusScore < 1) {
    insights.push('• 🤝 Strong market consensus - Top 100 and broad group moving in sync');
  } else if (consensusScore > 4) {
    insights.push('• ⚡ Market divergence - different strategies between elite and masses');
  }
  
  insights.forEach(insight => console.log(insight));
  
  // 8. Monthly Summary
  console.log('\n📝 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗦𝘂𝗺𝗺𝗮𝗿𝘆:');
  
  // Generate overall market assessment
  let marketStatus = '';
  if (perfChange100 > 3 && perfChange1500 > 3 && avgCashChange < 0) {
    marketStatus = '🚀 BULLISH MONTH - Strong gains with risk-on positioning';
  } else if (perfChange100 < -3 && perfChange1500 < -3 && avgCashChange > 0) {
    marketStatus = '🐻 BEARISH MONTH - Losses with defensive positioning';
  } else if (Math.abs(perfChange100) < 2 && Math.abs(perfChange1500) < 2) {
    marketStatus = '➡️ SIDEWAYS MONTH - Range-bound with minimal directional moves';
  } else if (avgCashChange > 3) {
    marketStatus = '⚠️ CAUTIOUS MONTH - Risk-off despite mixed performance';
  } else {
    marketStatus = '🔄 TRANSITIONAL MONTH - Market seeking direction';
  }
  
  console.log(marketStatus);
  
  // Footer
  console.log('\n════════════════════════════════════════════════════');
  console.log('📊 Full census dashboard: weirdapps.github.io/etoro_census');
  console.log('📅 Monthly reports on the 1st of each month');
  console.log('📈 Daily updates at 02:00 UTC');
}

// Run the monthly post generation
try {
  generateMonthlyPost();
} catch (error) {
  console.error('Error:', error.message);
}