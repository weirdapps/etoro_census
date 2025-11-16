/**
 * Daily Post Generator - Aligned Professional Format
 * Clean, data-focused social media updates
 */

const utils = require('./lib/utils');

// Generate daily post
function generateDailyPost() {
  // Use utilities to get data files
  const files = utils.getLatestDataFiles();
  console.log(`Comparing ${files.today} vs ${files.yesterday}\n`);

  // Use utilities to load data
  const currentData = utils.loadDataFile(files.todayPath);
  const prevData = utils.loadDataFile(files.yesterdayPath);

  const current1500 = currentData.analyses[3]; // Broad investors group
  const prev1500 = prevData.analyses[3];

  const current100 = currentData.analyses[0]; // Most copied investors
  const prev100 = prevData.analyses[0];

  // Extract date from filename
  const dateMatch = files.today.match(/(\d{4}-\d{2}-\d{2})/);
  const displayDate = dateMatch ? dateMatch[1] : 'Today';

  // Calculate daily changes
  const cashChange100 = current100.averages.cashPercentage - prev100.averages.cashPercentage;
  const cashChange1500 = current1500.averages.cashPercentage - prev1500.averages.cashPercentage;
  const riskChange100 = current100.averages.riskScore - prev100.averages.riskScore;
  const riskChange1500 = current1500.averages.riskScore - prev1500.averages.riskScore;
  const perfChange100 = current100.averages.gain - prev100.averages.gain;
  const perfChange1500 = current1500.averages.gain - prev1500.averages.gain;

  // Header - aligned with weekly/monthly format
  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗗𝗮𝗶𝗹𝘆 𝗨𝗽𝗱𝗮𝘁𝗲 (' + displayDate + ') 🎩');
  console.log('');

  // 1. Performance Comparison
  console.log('\n📈 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗖𝗼𝗺𝗽𝗮𝗿𝗶𝘀𝗼𝗻:');
  console.log('');
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.gain.toFixed(1) + '% YTD (' +
    utils.formatPercentage(perfChange100) + ' daily)');
  console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.gain.toFixed(1) + '% YTD (' +
    utils.formatPercentage(perfChange1500) + ' daily)');
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘁𝗮𝗴𝗲: ' + utils.formatPercentage(current100.averages.gain - current1500.averages.gain, 1) + 'pp');

  // 2. Cash Positioning & Risk
  console.log('\n💰 𝗖𝗮𝘀𝗵 𝗣𝗼𝘀𝗶𝘁𝗶𝗼𝗻𝗶𝗻𝗴 & 𝗥𝗶𝘀𝗸:');
  console.log('');
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬: Cash ' + current100.averages.cashPercentage.toFixed(1) + '% (' +
    utils.formatPercentage(cashChange100) + ') | Risk ' + current100.averages.riskScore.toFixed(1) +
    ' (' + utils.formatPercentage(riskChange100) + ')');
  console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: Cash ' + current1500.averages.cashPercentage.toFixed(1) + '% (' +
    utils.formatPercentage(cashChange1500) + ') | Risk ' + current1500.averages.riskScore.toFixed(1) +
    ' (' + utils.formatPercentage(riskChange1500) + ')');

  // 3. Top Portfolio Holdings
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀:');
  console.log('');
  console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬:');
  const top10Holdings100 = current100.topHoldings.slice(0, 10);
  top10Holdings100.forEach((h, i) => {
    const prevHolding = prev100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '↑' : holderChange < 0 ? '↓' : '→';
    console.log('  ' + (i+1) + '. $' + h.symbol + ' (' + h.holdersCount + '% ' + changeIcon + Math.abs(holderChange) + ')');
  });

  console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  const top10Holdings1500 = current1500.topHoldings.slice(0, 10);
  top10Holdings1500.forEach((h, i) => {
    const prevHolding = prev1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '↑' : holderChange < 0 ? '↓' : '→';
    const percentage = h.holdersPercentage || (h.holdersCount / 15) || 0;
    console.log('  ' + (i+1) + '. $' + h.symbol + ' (' + percentage.toFixed(0) + '% ' + changeIcon + Math.abs(holderChange) + ')');
  });

  // 4. Biggest Daily Asset Moves
  console.log('\n🚀 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗔𝘀𝘀𝗲𝘁 𝗠𝗼𝘃𝗲𝘀:');
  console.log('');

  const dailyMovers100 = utils.findDailyMovers(current100.topHoldings, prev100.topHoldings, 1);
  const dailyMovers1500 = utils.findDailyMovers(current1500.topHoldings, prev1500.topHoldings, 3);

  // Top 100 moves
  if (dailyMovers100.length > 0) {
    const additions100 = dailyMovers100.filter(m => m.change > 0).slice(0, 3);
    const reductions100 = dailyMovers100.filter(m => m.change < 0).slice(0, 3);

    if (additions100.length > 0) {
      console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions100.forEach(m => {
        console.log('  • $' + m.symbol + ': +' + m.change + ' investors (' + utils.formatPercentage(m.percentChange) + ')');
      });
    }

    if (reductions100.length > 0) {
      console.log('  𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      reductions100.forEach(m => {
        console.log('  • $' + m.symbol + ': ' + m.change + ' investors (' + m.percentChange.toFixed(1) + '%)');
      });
    }
  }

  // Broad Group moves
  if (dailyMovers1500.length > 0) {
    const additions1500 = dailyMovers1500.filter(m => m.change > 0).slice(0, 3);
    const reductions1500 = dailyMovers1500.filter(m => m.change < 0).slice(0, 3);

    if (additions1500.length > 0) {
      console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions1500.forEach(m => {
        console.log('  • $' + m.symbol + ': +' + m.change + ' investors (' + utils.formatPercentage(m.percentChange) + ')');
      });
    }

    if (reductions1500.length > 0) {
      console.log('  𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      reductions1500.forEach(m => {
        console.log('  • $' + m.symbol + ': ' + m.change + ' investors (' + m.percentChange.toFixed(1) + '%)');
      });
    }
  }

  if (dailyMovers100.length === 0 && dailyMovers1500.length === 0) {
    console.log('Minimal portfolio changes today - investors holding steady positions');
  }

  // 5. Daily Copier Changes
  console.log('\n📈 𝗗𝗮𝗶𝗹𝘆 𝗖𝗼𝗽𝗶𝗲𝗿 𝗖𝗵𝗮𝗻𝗴𝗲𝘀:');
  console.log('');

  const copierChanges = utils.findTopCopierChanges(currentData.investors, prevData.investors, 3);
  const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  if (gainers.length > 0) {
    console.log('  🚀 𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
    gainers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log('  ' + (i+1) + '. ' + name + ' (@' + change.investor.userName + '): (' + utils.formatNumber(change.investor.copiers) + ' ↑' + change.change + ')');
    });
  }

  if (losers.length > 0) {
    console.log('  📉 𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀:');
    losers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log('  ' + (i+1) + '. ' + name + ' (@' + change.investor.userName + '): (' + utils.formatNumber(change.investor.copiers) + ' ↓' + Math.abs(change.change) + ')');
    });
  }

  // 6. Key Insight
  console.log('\n💡 𝗞𝗲𝘆 𝗜𝗻𝘀𝗶𝗴𝗵𝘁:');
  console.log('');

  // Generate key insight based on data
  const top100Advantage = current100.averages.gain - current1500.averages.gain;
  const avgCashChange = (cashChange100 + cashChange1500) / 2;

  if (Math.abs(avgCashChange) > 1) {
    const trend = avgCashChange > 0 ? 'defensive' : 'aggressive';
    console.log('• Investors turning ' + trend + ' - cash levels ' + (avgCashChange > 0 ? 'rising' : 'falling') + ' across the board');
  } else if (Math.abs(perfChange100) > 1 || Math.abs(perfChange1500) > 1) {
    const direction = perfChange100 > 0 ? 'gains' : 'losses';
    console.log('• Significant daily ' + direction + ' - portfolios moving ' + utils.formatPercentage(Math.max(Math.abs(perfChange100), Math.abs(perfChange1500))));
  } else if (top100Advantage > 5) {
    console.log('• Top 100 advantage remains strong at ' + top100Advantage.toFixed(1) + 'pp - skill gap persistent');
  } else if (gainers.length > losers.length) {
    console.log('• More copier gains than losses today - confidence building in popular investors');
  } else {
    console.log('• Markets stable - minimal changes across portfolios and investor followings');
  }

  // Footer - aligned with other formats
  console.log('\n**\n');
  console.log('Check out the daily updated census dashboard at:');
  console.log('https://weirdapps.github.io/etoro_census\n');
  console.log('Compare your portfolio to those of top investors at:');
  console.log('https://etoro-census.vercel.app');
}

// Run the daily post generation
try {
  generateDailyPost();
} catch (error) {
  console.error('Error:', error.message);
}