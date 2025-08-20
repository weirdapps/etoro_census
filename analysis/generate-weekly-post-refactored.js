/**
 * Weekly Post Generator - REFACTORED VERSION
 * Uses shared utilities for common operations
 */

const utils = require('./lib/utils');

// Generate weekly post
function generateWeeklyPost() {
  // Use utilities to get weekly data files
  const files = utils.getWeeklyDataFiles();
  console.log(`Weekly analysis: ${files.weekAgo} to ${files.latest}\n`);
  
  // Use utilities to load data
  const latestData = utils.loadDataFile(files.latestPath);
  const weekAgoData = utils.loadDataFile(files.weekAgoPath);
  
  const latest1500 = latestData.analyses[3]; // Broad investors group
  const weekAgo1500 = weekAgoData.analyses[3];
  
  const latest100 = latestData.analyses[0]; // Most copied investors
  const weekAgo100 = weekAgoData.analyses[0];
  
  // Extract dates
  const latestDateMatch = files.latest.match(/(\d{4}-\d{2}-\d{2})/);
  const weekAgoDateMatch = files.weekAgo.match(/(\d{4}-\d{2}-\d{2})/);
  const dateRange = `${weekAgoDateMatch[1]} to ${latestDateMatch[1]}`;
  
  console.log('📊 𝐞𝐓𝐨𝐫𝐨 𝐂𝐞𝐧𝐬𝐮𝐬 𝐖𝐞𝐞𝐤𝐥𝐲 𝐑𝐞𝐩𝐨𝐫𝐭');
  console.log('Week of ' + dateRange);
  console.log('='.repeat(50));
  
  // 1. Weekly Performance Changes
  console.log('\n📈 𝐖𝐞𝐞𝐤𝐥𝐲 𝐏𝐞𝐫𝐟𝐨𝐫𝐦𝐚𝐧𝐜𝐞 𝐂𝐡𝐚𝐧𝐠𝐞𝐬');
  const perfChange100 = latest100.averages.gain - weekAgo100.averages.gain;
  const perfChange1500 = latest1500.averages.gain - weekAgo1500.averages.gain;
  const cashChange100 = latest100.averages.cashPercentage - weekAgo100.averages.cashPercentage;
  const cashChange1500 = latest1500.averages.cashPercentage - weekAgo1500.averages.cashPercentage;
  const tradesChange100 = latest100.averages.trades - weekAgo100.averages.trades;
  const tradesChange1500 = latest1500.averages.trades - weekAgo1500.averages.trades;
  
  console.log('\n𝗧𝗼𝗽 𝟭𝟬𝟬 𝗩𝗲𝗮𝗸𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲𝘀:');
  console.log('• Gain: ' + latest100.averages.gain.toFixed(1) + '% (' + utils.formatPercentage(perfChange100) + ' weekly)');
  console.log('• Cash: ' + latest100.averages.cashPercentage.toFixed(1) + '% (' + utils.formatPercentage(cashChange100) + ' weekly)');
  console.log('• Trades: ' + latest100.averages.trades.toFixed(0) + ' (' + (tradesChange100 > 0 ? '+' : '') + tradesChange100.toFixed(0) + ' weekly)');
  console.log('• Win Ratio: ' + latest100.averages.winRatio.toFixed(1) + '%');
  
  console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 𝗪𝗲𝗲𝗸𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲𝘀:');
  console.log('• Gain: ' + latest1500.averages.gain.toFixed(1) + '% (' + utils.formatPercentage(perfChange1500) + ' weekly)');
  console.log('• Cash: ' + latest1500.averages.cashPercentage.toFixed(1) + '% (' + utils.formatPercentage(cashChange1500) + ' weekly)');
  console.log('• Trades: ' + latest1500.averages.trades.toFixed(0) + ' (' + (tradesChange1500 > 0 ? '+' : '') + tradesChange1500.toFixed(0) + ' weekly)');
  console.log('• Win Ratio: ' + latest1500.averages.winRatio.toFixed(1) + '%');
  
  // 2. Weekly Copier Trends
  console.log('\n👥 𝐖𝐞𝐞𝐤𝐥𝐲 𝐂𝐨𝐩𝐢𝐞𝐫 𝐓𝐫𝐞𝐧𝐝𝐬');
  
  const copierChanges = utils.findTopCopierChanges(latestData.investors, weekAgoData.investors, 10);
  
  if (copierChanges.length > 0) {
    const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 3);
    const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 3);
    
    if (gainers.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟯 𝗪𝗲𝗲𝗸𝗹𝘆 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
      gainers.forEach((change, i) => {
        const currentCount = change.investor.copiers;
        console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
          ' (@' + change.investor.userName + '): (' + utils.formatNumber(currentCount) + ' ↑' + change.change + ')');
      });
    }
    
    if (losers.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟯 𝗪𝗲𝗲𝗸𝗹𝘆 𝗟𝗼𝘀𝗲𝗿𝘀:');
      losers.forEach((change, i) => {
        const currentCount = change.investor.copiers;
        console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
          ' (@' + change.investor.userName + '): (' + utils.formatNumber(currentCount) + ' ↓' + Math.abs(change.change) + ')');
      });
    }
  }
  
  // 3. Biggest Asset Moves
  console.log('\n💎 𝐁𝐢𝐠𝐠𝐞𝐬𝐭 𝐀𝐬𝐬𝐞𝐭 𝐌𝐨𝐯𝐞𝐬 (𝐖𝐞𝐞𝐤)');
  
  const weeklyMovers100 = utils.findDailyMovers(latest100.topHoldings, weekAgo100.topHoldings, 3);
  const weeklyMovers1500 = utils.findDailyMovers(latest1500.topHoldings, weekAgo1500.topHoldings, 10);
  
  // Top 100 weekly moves
  if (weeklyMovers100.length > 0) {
    const additions100 = weeklyMovers100.filter(m => m.change > 0).slice(0, 3);
    const reductions100 = weeklyMovers100.filter(m => m.change < 0).slice(0, 3);
    
    if (additions100.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions100.forEach(move => {
        console.log('• $' + move.symbol + ': +' + move.change + ' investors (' + 
          utils.formatPercentage(move.percentChange) + ')');
      });
    }
    
    if (reductions100.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱:');
      reductions100.forEach(move => {
        console.log('• $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  // Broad group weekly moves
  if (weeklyMovers1500.length > 0) {
    const additions1500 = weeklyMovers1500.filter(m => m.change > 0).slice(0, 3);
    const reductions1500 = weeklyMovers1500.filter(m => m.change < 0).slice(0, 3);
    
    if (additions1500.length > 0) {
      console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions1500.forEach(move => {
        console.log('• $' + move.symbol + ': +' + move.change + ' investors (' + 
          utils.formatPercentage(move.percentChange) + ')');
      });
    }
    
    if (reductions1500.length > 0) {
      console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱:');
      reductions1500.forEach(move => {
        console.log('• $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  // 4. Weekly Sentiment Analysis
  console.log('\n🎯 𝐖𝐞𝐞𝐤𝐥𝐲 𝐒𝐞𝐧𝐭𝐢𝐦𝐞𝐧𝐭 𝐀𝐧𝐚𝐥𝐲𝐬𝐢𝐬');
  
  // Determine overall market sentiment
  let sentimentScore = 0;
  
  // Cash positioning (lower cash = more bullish)
  if (cashChange100 < -0.5) sentimentScore += 2;
  else if (cashChange100 < 0) sentimentScore += 1;
  else if (cashChange100 > 0.5) sentimentScore -= 2;
  else if (cashChange100 > 0) sentimentScore -= 1;
  
  if (cashChange1500 < -0.5) sentimentScore += 1;
  else if (cashChange1500 > 0.5) sentimentScore -= 1;
  
  // Trading activity (more trades = more active/confident)
  if (tradesChange100 > 5) sentimentScore += 1;
  else if (tradesChange100 < -5) sentimentScore -= 1;
  
  // Performance divergence
  const perfDivergence = perfChange100 - perfChange1500;
  if (Math.abs(perfDivergence) > 0.5) {
    console.log('\n📊 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗗𝗶𝘃𝗲𝗿𝗴𝗲𝗻𝗰𝗲:');
    if (perfDivergence > 0) {
      console.log('Top 100 outperformed by ' + perfDivergence.toFixed(1) + 'pp');
      sentimentScore += 1;
    } else {
      console.log('Top 100 underperformed by ' + Math.abs(perfDivergence).toFixed(1) + 'pp');
      sentimentScore -= 1;
    }
  }
  
  // Overall sentiment assessment
  console.log('\n💡 𝗢𝘃𝗲𝗿𝗮𝗹𝗹 𝗦𝗲𝗻𝘁𝗶𝗺𝗲𝗻𝘁:');
  if (sentimentScore >= 3) {
    console.log('🚀 Strong Bullish - Risk-on mode activated');
  } else if (sentimentScore >= 1) {
    console.log('📈 Moderately Bullish - Cautious optimism');
  } else if (sentimentScore <= -3) {
    console.log('🛡️ Strong Bearish - Defensive positioning');
  } else if (sentimentScore <= -1) {
    console.log('📉 Moderately Bearish - Risk reduction mode');
  } else {
    console.log('⚖️ Neutral - Mixed signals, no clear direction');
  }
  
  // 5. Key Weekly Insights
  console.log('\n🔍 𝐊𝐞𝐲 𝐖𝐞𝐞𝐤𝐥𝐲 𝐈𝐧𝐬𝐢𝐠𝐡𝐭𝐬:');
  
  // Generate insights based on data
  const insights = [];
  
  if (Math.abs(cashChange100) > 1) {
    const direction = cashChange100 > 0 ? 'increased' : 'decreased';
    insights.push(`• Top 100 cash ${direction} by ${Math.abs(cashChange100).toFixed(1)}pp - significant risk adjustment`);
  }
  
  if (Math.abs(perfChange100 - perfChange1500) > 1) {
    const leader = perfChange100 > perfChange1500 ? 'Top 100' : 'Broad group';
    insights.push(`• ${leader} leading performance this week`);
  }
  
  if (weeklyMovers100.length > 5 || weeklyMovers1500.length > 10) {
    insights.push('• High portfolio turnover indicates active market repositioning');
  }
  
  if (copierChanges.length > 10) {
    insights.push('• Significant copier movement - investor preferences shifting');
  }
  
  if (insights.length === 0) {
    insights.push('• Steady week with minimal structural changes');
  }
  
  insights.forEach(insight => console.log(insight));
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Full census at: weirdapps.github.io/etoro_census');
  console.log('Updated daily at 02:00 UTC');
}

// Run the weekly post generation
try {
  generateWeeklyPost();
} catch (error) {
  console.error('Error:', error.message);
}