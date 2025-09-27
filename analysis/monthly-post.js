/**
 * Monthly Post Generator - Enhanced Format
 * Aligned with daily and weekly post styles with comprehensive monthly insights
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
  
  // Header with date range
  console.log('📈 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗥𝗲𝗽𝗼𝗿𝘁 (' + monthAgoDate + ' → ' + currentDate + ') 📈');
  console.log('');
  
  // 1. Fear & Greed Index (Monthly Trend)
  const fearGreed = utils.calculateFearGreedIndex(current1500.averages.cashPercentage);
  const monthAgoFearGreed = utils.calculateFearGreedIndex(monthAgo1500.averages.cashPercentage);
  const indexChange = fearGreed.value - monthAgoFearGreed.value;
  
  console.log('\n' + fearGreed.emoji + ' 𝗙𝗲𝗮𝗿 & 𝗚𝗿𝗲𝗲𝗱 𝗜𝗻𝗱𝗲𝘅: ' + fearGreed.value + '/100 (' + fearGreed.status + ')');
  console.log('');
  console.log('  𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲: ' + (indexChange > 0 ? '+' : '') + indexChange + ' points');
  console.log('  𝗠𝗼𝗻𝘁𝗵 𝗦𝘁𝗮𝗿𝘁: ' + monthAgoFearGreed.value + '/100 (' + monthAgoFearGreed.status + ')');

  // Monthly market mood with better emojis
  let monthlyMood = '';
  if (indexChange > 15) monthlyMood = '🚀 Greed surge this month';
  else if (indexChange > 5) monthlyMood = '📈 Risk appetite increasing';
  else if (indexChange < -15) monthlyMood = '🛡️ Fear building rapidly';
  else if (indexChange < -5) monthlyMood = '⚠️ Caution creeping in';
  else monthlyMood = '⚖️ Steady sentiment throughout';
  console.log('  𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗠𝗼𝗼𝗱: ' + monthlyMood);
  
  // 2. Performance Overview
  console.log('\n📊 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗖𝗼𝗺𝗽𝗮𝗿𝗶𝘀𝗼𝗻:');
  console.log('');
  const perfChange100 = current100.averages.gain - monthAgo100.averages.gain;
  const perfChange1500 = current1500.averages.gain - monthAgo1500.averages.gain;
  const top100Advantage = current100.averages.gain - current1500.averages.gain;
  
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.gain.toFixed(1) + '% YTD (' +
    utils.formatPercentage(perfChange100) + ' monthly)');
  console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.gain.toFixed(1) + '% YTD (' +
    utils.formatPercentage(perfChange1500) + ' monthly)');
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘁𝗮𝗴𝗲: ' + utils.formatPercentage(top100Advantage, 1) + 'pp');
  
  // 3. Cash Positioning & Risk Analysis
  console.log('\n💰 𝗖𝗮𝘀𝗵 𝗣𝗼𝘀𝗶𝘁𝗶𝗼𝗻𝗶𝗻𝗴 & 𝗥𝗶𝘀𝗸:');
  console.log('');
  const cashChange100 = current100.averages.cashPercentage - monthAgo100.averages.cashPercentage;
  const cashChange1500 = current1500.averages.cashPercentage - monthAgo1500.averages.cashPercentage;
  const riskChange100 = current100.averages.riskScore - monthAgo100.averages.riskScore;
  const riskChange1500 = current1500.averages.riskScore - monthAgo1500.averages.riskScore;
  
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: Cash ' + current100.averages.cashPercentage.toFixed(1) + '% (' +
    utils.formatPercentage(cashChange100) + ' monthly) | Risk ' + current100.averages.riskScore.toFixed(1) +
    ' (' + utils.formatPercentage(riskChange100) + ')');
  console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: Cash ' + current1500.averages.cashPercentage.toFixed(1) + '% (' +
    utils.formatPercentage(cashChange1500) + ' monthly) | Risk ' + current1500.averages.riskScore.toFixed(1) +
    ' (' + utils.formatPercentage(riskChange1500) + ')');
  
  // Risk sentiment interpretation
  const avgCashChange = (cashChange100 + cashChange1500) / 2;
  let riskSentiment = '';
  if (avgCashChange > 2) riskSentiment = '🛡️ Risk-off month';
  else if (avgCashChange < -2) riskSentiment = '🚀 Risk-on month';
  else riskSentiment = '⚖️ Balanced sentiment';
  console.log('  𝗦𝗲𝗻𝘁𝗶𝗺𝗲𝗻𝘁: ' + riskSentiment);
  
  // 4. Trading Activity Analysis
  console.log('\n📊 𝗧𝗿𝗮𝗱𝗶𝗻𝗴 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆:');
  console.log('');
  const tradesChange100 = current100.averages.trades - monthAgo100.averages.trades;
  const tradesChange1500 = current1500.averages.trades - monthAgo1500.averages.trades;
  const winRatioChange100 = current100.averages.winRatio - monthAgo100.averages.winRatio;
  const winRatioChange1500 = current1500.averages.winRatio - monthAgo1500.averages.winRatio;
  
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange100 > 0 ? '+' : '') + tradesChange100.toFixed(0) + ' monthly) | Win ' +
    current100.averages.winRatio.toFixed(1) + '% (' + utils.formatPercentage(winRatioChange100) + ')');
  console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange1500 > 0 ? '+' : '') + tradesChange1500.toFixed(0) + ' monthly) | Win ' +
    current1500.averages.winRatio.toFixed(1) + '% (' + utils.formatPercentage(winRatioChange1500) + ')');
  
  // 5. Top Portfolio Holdings Comparison
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀:');
  console.log('');

  // Create instrument map
  const instrumentMap = utils.createInstrumentMap(currentData);
  
  // Top 100 holdings with monthly changes
  const holdings100 = current100.topHoldings.slice(0, 10);
  const monthAgoHoldings100 = monthAgo100.topHoldings.slice(0, 10);
  
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬:');
  holdings100.forEach((holding, i) => {
    const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
    const monthAgoHolding = monthAgoHoldings100.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = monthAgoHolding ? holding.holdersCount - monthAgoHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '↑' : holderChange < 0 ? '↓' : '→';
    
    console.log(`  ${i+1}. $${asset.symbol} (${holding.holdersCount}% ${changeIcon}${Math.abs(holderChange)})`);
  });
  
  // Broad Group holdings
  const holdings1500 = current1500.topHoldings.slice(0, 10);
  const monthAgoHoldings1500 = monthAgo1500.topHoldings.slice(0, 10);
  
  console.log('\n  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  holdings1500.forEach((holding, i) => {
    const asset = utils.getAssetInfo(holding.instrumentId, instrumentMap);
    const monthAgoHolding = monthAgoHoldings1500.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = monthAgoHolding ? holding.holdersCount - monthAgoHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '↑' : holderChange < 0 ? '↓' : '→';
    // Use holdersPercentage for broad group instead of holdersCount
    const percentage = holding.holdersPercentage || (holding.holdersCount / 15 || 0);
    
    console.log(`  ${i+1}. $${asset.symbol} (${percentage.toFixed(0)}% ${changeIcon}${Math.abs(holderChange)})`);
  });
  
  // 6. Biggest Asset Moves (Monthly)
  console.log('\n🚀 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗔𝘀𝘀𝗲𝘁 𝗠𝗼𝘃𝗲𝘀:');
  console.log('');

  // Find monthly movers with higher thresholds
  const monthlyMovers100 = utils.findDailyMovers(current100.topHoldings, monthAgo100.topHoldings, 3);
  const monthlyMovers1500 = utils.findDailyMovers(current1500.topHoldings, monthAgo1500.topHoldings, 10);
  
  // Top 100 moves 
  if (monthlyMovers100.length > 0) {
    const additions100 = monthlyMovers100.filter(m => m.change > 0).slice(0, 5);
    const drops100 = monthlyMovers100.filter(m => m.change < 0).slice(0, 5);
    
    if (additions100.length > 0) {
      console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions100.forEach(m => {
        console.log(`• $${m.symbol}: +${m.change} investors (${utils.formatPercentage(m.percentChange)})`);
      });
    }
    
    if (drops100.length > 0) {
      console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱:');
      drops100.forEach(m => {
        console.log(`• $${m.symbol}: ${m.change} investors (${m.percentChange.toFixed(1)}%)`);
      });
    }
  }
  
  // Broad group moves
  if (monthlyMovers1500.length > 0) {
    const additions1500 = monthlyMovers1500.filter(m => m.change > 0).slice(0, 5);
    const drops1500 = monthlyMovers1500.filter(m => m.change < 0).slice(0, 5);
    
    if (additions1500.length > 0) {
      console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions1500.forEach(m => {
        console.log(`• $${m.symbol}: +${m.change} investors (${utils.formatPercentage(m.percentChange)})`);
      });
    }
    
    if (drops1500.length > 0) {
      console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱:');
      drops1500.forEach(m => {
        console.log(`• $${m.symbol}: ${m.change} investors (${m.percentChange.toFixed(1)}%)`);
      });
    }
  }
  
  // 7. Copier Activity (Monthly Threshold)
  console.log('\n👥 𝗖𝗼𝗽𝗶𝗲𝗿 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆 (𝗠𝗼𝗻𝘁𝗵𝗹𝘆):');
  console.log('');

  const copierChanges = utils.findTopCopierChanges(currentData.investors, monthAgoData.investors, 50);
  const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);
  
  if (gainers.length > 0) {
    console.log('𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀 (≥50 copiers):');
    gainers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${utils.formatNumber(change.investor.copiers)} ↑${change.change})`);
    });
  }
  
  if (losers.length > 0) {
    console.log('𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀 (≥50 copiers):');
    losers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${utils.formatNumber(change.investor.copiers)} ↓${Math.abs(change.change)})`);
    });
  }
  
  // 8. Investor Spotlight (Monthly Performance Leader)
  console.log('\n🌟 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿 𝗦𝗽𝗼𝘁𝗹𝗶𝗴𝗵𝘁:');
  console.log('');

  // Find best performing investor for the month
  const topPerformers = currentData.investors
    .filter(inv => inv.gain !== null && inv.copiers >= 100)
    .sort((a, b) => {
      // Sort by best monthly gain (need previous data)
      const aPrev = monthAgoData.investors.find(p => p.userName === a.userName);
      const bPrev = monthAgoData.investors.find(p => p.userName === b.userName);
      const aGain = aPrev ? a.gain - aPrev.gain : 0;
      const bGain = bPrev ? b.gain - bPrev.gain : 0;
      return bGain - aGain;
    })
    .slice(0, 1);
  
  if (topPerformers.length > 0) {
    const investor = topPerformers[0];
    const prevInvestor = monthAgoData.investors.find(p => p.userName === investor.userName);
    const monthlyGain = prevInvestor ? investor.gain - prevInvestor.gain : 0;
    const name = investor.fullName || investor.userName;
    
    console.log(`🏆 ${name} (@${investor.userName})`);
    console.log(`• Monthly Gain: ${utils.formatPercentage(monthlyGain)}`);
    console.log(`• YTD Performance: ${investor.gain.toFixed(1)}%`);
    console.log(`• Copiers: ${utils.formatNumber(investor.copiers)}`);
    console.log(`• Win Ratio: ${investor.winRatio ? investor.winRatio.toFixed(1) + '%' : 'N/A'}`);
  }
  
  // 9. Key Takeaways
  console.log('\n💡 𝗞𝗲𝘆 𝗧𝗮𝗸𝗲𝗮𝘄𝗮𝘆𝘀:');
  console.log('');

  const takeaways = [];
  
  // Fear & Greed based takeaway
  if (fearGreed.status === 'Extreme Fear' && avgCashChange > 2) {
    takeaways.push('• Market in extreme defensive mode - highest cash levels in months');
  } else if (fearGreed.status === 'Extreme Greed' && avgCashChange < -2) {
    takeaways.push('• Risk-on euphoria driving aggressive capital deployment');
  }
  
  // Performance divergence
  if (Math.abs(perfChange100 - perfChange1500) > 3) {
    const leader = perfChange100 > perfChange1500 ? 'Top 100' : 'Broad group';
    takeaways.push(`• ${leader} significantly outperformed this month (${Math.abs(perfChange100 - perfChange1500).toFixed(1)}pp gap)`);
  }
  
  // Portfolio concentration
  const topHolding100 = holdings100[0];
  const topHolding1500 = holdings1500[0];
  if (topHolding100 && topHolding100.holdersCount > 60) {
    const asset = utils.getAssetInfo(topHolding100.instrumentId, instrumentMap);
    takeaways.push(`• Extreme concentration in $${asset.symbol} among Top 100 (${topHolding100.holdersCount}% holders)`);
  }
  
  // Trading activity
  const avgTradesChange = (tradesChange100 + tradesChange1500) / 2;
  if (Math.abs(avgTradesChange) > 50) {
    const trend = avgTradesChange > 0 ? 'surge' : 'decline';
    takeaways.push(`• Major trading activity ${trend} signals ${avgTradesChange > 0 ? 'volatility expectations' : 'wait-and-see approach'}`);
  }
  
  // Copier momentum
  const totalCopierChange = copierChanges.reduce((sum, c) => sum + c.change, 0);
  if (Math.abs(totalCopierChange) > 10000) {
    const trend = totalCopierChange > 0 ? 'growing confidence' : 'trust erosion';
    takeaways.push(`• Massive copier ${trend} - ${Math.abs(totalCopierChange).toLocaleString()} net change`);
  }
  
  takeaways.forEach(takeaway => console.log(takeaway));
  
  // Footer (aligned with daily post format)
  console.log('\n**\n');
  console.log('Check out the census dashboard at:\n');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\nupdated daily at 02:00 UTC!');
}

// Run the monthly post generation
try {
  generateMonthlyPost();
} catch (error) {
  console.error('Error:', error.message);
}