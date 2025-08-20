/**
 * Monthly Post Generator - REFACTORED VERSION
 * Uses shared utilities for common operations
 */

const utils = require('./lib/utils');

// Generate monthly post
function generateMonthlyPost() {
  // Use utilities to get monthly data files
  const files = utils.getMonthlyDataFiles();
  console.log(`Monthly analysis: ${files.monthAgo} to ${files.latest}\n`);
  
  // Use utilities to load data
  const currentData = utils.loadDataFile(files.latestPath);
  const monthAgoData = utils.loadDataFile(files.monthAgoPath);
  
  const current1500 = currentData.analyses[3]; // Broad investors group
  const monthAgo1500 = monthAgoData.analyses[3];
  
  const current100 = currentData.analyses[0]; // Most copied investors
  const monthAgo100 = monthAgoData.analyses[0];
  
  // Extract dates
  const currentDateMatch = files.latest.match(/(\d{4}-\d{2}-\d{2})/);
  const monthAgoDateMatch = files.monthAgo.match(/(\d{4}-\d{2}-\d{2})/);
  const dateRange = `${monthAgoDateMatch[1]} to ${currentDateMatch[1]}`;
  
  console.log('📈 𝐞𝐓𝐨𝐫𝐨 𝐂𝐞𝐧𝐬𝐮𝐬 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐑𝐞𝐩𝐨𝐫𝐭');
  console.log('Period: ' + dateRange);
  console.log('═'.repeat(60));
  
  // 1. Monthly Performance Overview
  console.log('\n🎯 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐏𝐞𝐫𝐟𝐨𝐫𝐦𝐚𝐧𝐜𝐞 𝐎𝐯𝐞𝐫𝐯𝐢𝐞𝐰');
  
  const gainChange100 = current100.averages.gain - monthAgo100.averages.gain;
  const gainChange1500 = current1500.averages.gain - monthAgo1500.averages.gain;
  const cashChange100 = current100.averages.cashPercentage - monthAgo100.averages.cashPercentage;
  const cashChange1500 = current1500.averages.cashPercentage - monthAgo1500.averages.cashPercentage;
  const tradesChange100 = current100.averages.trades - monthAgo100.averages.trades;
  const tradesChange1500 = current1500.averages.trades - monthAgo1500.averages.trades;
  const winRatioChange100 = current100.averages.winRatio - monthAgo100.averages.winRatio;
  const winRatioChange1500 = current1500.averages.winRatio - monthAgo1500.averages.winRatio;
  
  console.log('\n𝗧𝗼𝗽 𝟭𝟬𝟬 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀:');
  console.log('• Current Gain: ' + current100.averages.gain.toFixed(1) + '% YTD');
  console.log('• Monthly Change: ' + utils.formatPercentage(gainChange100) + 'pp');
  console.log('• Cash Position: ' + current100.averages.cashPercentage.toFixed(1) + '% (' + 
    utils.formatPercentage(cashChange100) + 'pp)');
  console.log('• Avg Trades: ' + current100.averages.trades.toFixed(0) + ' (' + 
    (tradesChange100 > 0 ? '+' : '') + tradesChange100.toFixed(0) + ')');
  console.log('• Win Ratio: ' + current100.averages.winRatio.toFixed(1) + '% (' + 
    utils.formatPercentage(winRatioChange100) + 'pp)');
  
  console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 (𝟭,𝟱𝟬𝟬):');
  console.log('• Current Gain: ' + current1500.averages.gain.toFixed(1) + '% YTD');
  console.log('• Monthly Change: ' + utils.formatPercentage(gainChange1500) + 'pp');
  console.log('• Cash Position: ' + current1500.averages.cashPercentage.toFixed(1) + '% (' + 
    utils.formatPercentage(cashChange1500) + 'pp)');
  console.log('• Avg Trades: ' + current1500.averages.trades.toFixed(0) + ' (' + 
    (tradesChange1500 > 0 ? '+' : '') + tradesChange1500.toFixed(0) + ')');
  console.log('• Win Ratio: ' + current1500.averages.winRatio.toFixed(1) + '% (' + 
    utils.formatPercentage(winRatioChange1500) + 'pp)');
  
  // 2. Monthly Copier Trends
  console.log('\n👥 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐂𝐨𝐩𝐢𝐞𝐫 𝐓𝐫𝐞𝐧𝐝𝐬');
  
  const monthlyCopiersChange = utils.findTopCopierChanges(currentData.investors, monthAgoData.investors, 50);
  
  if (monthlyCopiersChange.length > 0) {
    const gainers = monthlyCopiersChange.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 3);
    const losers = monthlyCopiersChange.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 3);
    
    if (gainers.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟯 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
      gainers.forEach((change, i) => {
        const currentCount = change.investor.copiers;
        console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
          ' (@' + change.investor.userName + '): (' + utils.formatNumber(currentCount) + ' ↑' + change.change + ')');
      });
    }
    
    if (losers.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟯 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗟𝗼𝘀𝗲𝗿𝘀:');
      losers.forEach((change, i) => {
        const currentCount = change.investor.copiers;
        console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
          ' (@' + change.investor.userName + '): (' + utils.formatNumber(currentCount) + ' ↓' + Math.abs(change.change) + ')');
      });
    }
  }
  
  // 3. Major Portfolio Shifts
  console.log('\n🔄 𝐌𝐚𝐣𝐨𝐫 𝐏𝐨𝐫𝐭𝐟𝐨𝐥𝐢𝐨 𝐒𝐡𝐢𝐟𝐭𝐬');
  
  const monthlyMovers100 = utils.findDailyMovers(current100.topHoldings, monthAgo100.topHoldings, 5);
  const monthlyMovers1500 = utils.findDailyMovers(current1500.topHoldings, monthAgo1500.topHoldings, 20);
  
  // Top 100 monthly moves
  if (monthlyMovers100.length > 0) {
    const additions100 = monthlyMovers100.filter(m => m.change > 0).slice(0, 5);
    const reductions100 = monthlyMovers100.filter(m => m.change < 0).slice(0, 5);
    
    if (additions100.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗦𝘁𝗿𝗼𝗻𝗴𝗲𝘀𝘁 𝗕𝘂𝘆𝘀:');
      additions100.forEach(move => {
        console.log('• $' + move.symbol + ': +' + move.change + ' investors (' + 
          utils.formatPercentage(move.percentChange) + ')');
      });
    }
    
    if (reductions100.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗦𝗲𝗹𝗹𝘀:');
      reductions100.forEach(move => {
        console.log('• $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  // Broad group monthly moves
  if (monthlyMovers1500.length > 0) {
    const additions1500 = monthlyMovers1500.filter(m => m.change > 0).slice(0, 5);
    const reductions1500 = monthlyMovers1500.filter(m => m.change < 0).slice(0, 5);
    
    if (additions1500.length > 0) {
      console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗦𝘁𝗿𝗼𝗻𝗴𝗲𝘀𝘁 𝗕𝘂𝘆𝘀:');
      additions1500.forEach(move => {
        console.log('• $' + move.symbol + ': +' + move.change + ' investors (' + 
          utils.formatPercentage(move.percentChange) + ')');
      });
    }
    
    if (reductions1500.length > 0) {
      console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗦𝗲𝗹𝗹𝘀:');
      reductions1500.forEach(move => {
        console.log('• $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  // 4. Monthly Risk Sentiment Analysis
  console.log('\n⚖️ 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐑𝐢𝐬𝐤 𝐒𝐞𝐧𝐭𝐢𝐦𝐞𝐧𝐭');
  
  // Calculate risk sentiment based on cash changes
  const avgCashChange = (cashChange100 + cashChange1500) / 2;
  let riskSentiment = '';
  
  if (avgCashChange > 2) {
    riskSentiment = '🛡️ HIGH DEFENSIVE - Major risk-off movement';
  } else if (avgCashChange > 0.5) {
    riskSentiment = '📉 MODERATELY DEFENSIVE - Cautious positioning';
  } else if (avgCashChange < -2) {
    riskSentiment = '🚀 HIGH AGGRESSIVE - Strong risk-on sentiment';
  } else if (avgCashChange < -0.5) {
    riskSentiment = '📈 MODERATELY AGGRESSIVE - Deploying capital';
  } else {
    riskSentiment = '⚖️ NEUTRAL - Balanced risk approach';
  }
  
  console.log('\n𝗥𝗶𝘀𝗸 𝗦𝗲𝗻𝘁𝗶𝗺𝗲𝗻𝘁: ' + riskSentiment);
  
  // 5. Monthly Trading Activity Analysis
  console.log('\n📊 𝐓𝐫𝐚𝐝𝐢𝐧𝐠 𝐀𝐜𝐭𝐢𝐯𝐢𝐭𝐲 𝐀𝐧𝐚𝐥𝐲𝐬𝐢𝐬');
  
  const avgTradesChange = (tradesChange100 + tradesChange1500) / 2;
  if (avgTradesChange > 10) {
    console.log('• Trading activity significantly increased (+' + avgTradesChange.toFixed(0) + ' trades/month)');
    console.log('• Indicates: Active market engagement and repositioning');
  } else if (avgTradesChange < -10) {
    console.log('• Trading activity decreased (' + avgTradesChange.toFixed(0) + ' trades/month)');
    console.log('• Indicates: Lower conviction or wait-and-see approach');
  } else {
    console.log('• Trading activity stable (' + (avgTradesChange > 0 ? '+' : '') + avgTradesChange.toFixed(0) + ' trades/month)');
    console.log('• Indicates: Steady market participation');
  }
  
  // 6. Key Monthly Insights
  console.log('\n💡 𝐊𝐞𝐲 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐈𝐧𝐬𝐢𝐠𝐡𝐭𝐬:');
  
  const insights = [];
  
  // Performance gap analysis
  const perfGap = current100.averages.gain - current1500.averages.gain;
  const gapChange = perfGap - (monthAgo100.averages.gain - monthAgo1500.averages.gain);
  if (Math.abs(gapChange) > 0.5) {
    const direction = gapChange > 0 ? 'widened' : 'narrowed';
    insights.push(`• Performance gap ${direction} by ${Math.abs(gapChange).toFixed(1)}pp this month`);
  }
  
  // Cash positioning divergence
  if (Math.abs(cashChange100 - cashChange1500) > 1) {
    const divergence = cashChange100 > cashChange1500 ? 
      'Top 100 more defensive than broad group' : 
      'Broad group more defensive than Top 100';
    insights.push(`• ${divergence} - divergent risk views`);
  }
  
  // Win ratio trends
  if (winRatioChange100 > 1 || winRatioChange1500 > 1) {
    insights.push('• Improving win ratios indicate better trade selection');
  } else if (winRatioChange100 < -1 || winRatioChange1500 < -1) {
    insights.push('• Declining win ratios suggest challenging market conditions');
  }
  
  // Portfolio concentration
  if (monthlyMovers100.length > 10 || monthlyMovers1500.length > 30) {
    insights.push('• High portfolio turnover - significant strategic shifts');
  }
  
  if (insights.length === 0) {
    insights.push('• Stable month with gradual adjustments');
  }
  
  insights.forEach(insight => console.log(insight));
  
  // 7. Looking Forward
  console.log('\n🔮 𝐋𝐨𝐨𝐤𝐢𝐧𝐠 𝐅𝐨𝐫𝐰𝐚𝐫𝐝:');
  
  if (cashChange100 < 0 && cashChange1500 < 0) {
    console.log('• Capital deployment trend suggests bullish outlook');
  } else if (cashChange100 > 0 && cashChange1500 > 0) {
    console.log('• Cash accumulation indicates cautious stance');
  }
  
  if (tradesChange100 > 0 && tradesChange1500 > 0) {
    console.log('• Increased trading activity may signal volatility ahead');
  }
  
  if (perfGap > 4) {
    console.log('• Wide performance gap favors following Top 100 strategies');
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Full census: weirdapps.github.io/etoro_census');
  console.log('Data updated daily at 02:00 UTC');
}

// Run the monthly post generation
try {
  generateMonthlyPost();
} catch (error) {
  console.error('Error:', error.message);
}