const fs = require('fs');
const path = require('path');

// Function to get the two most recent data files
function getLatestDataFiles() {
  const dataDir = './public/data';
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  return {
    today: files[0],
    yesterday: files[1],
    todayPath: path.join(dataDir, files[0]),
    yesterdayPath: path.join(dataDir, files[1])
  };
}

// Helper function to calculate Fear & Greed Index
function calculateFearGreedIndex(cashPercentage) {
  // Linear scale: 30% cash = 0 (Extreme Fear), 0% cash = 100 (Extreme Greed)
  const index = Math.max(0, Math.min(100, 100 - (cashPercentage / 30) * 100));
  
  if (index <= 20) return { value: index, status: "Extreme Fear", emoji: "😱" };
  if (index <= 40) return { value: index, status: "Fear", emoji: "😰" };
  if (index <= 60) return { value: index, status: "Neutral", emoji: "😐" };
  if (index <= 80) return { value: index, status: "Greed", emoji: "😈" };
  return { value: index, status: "Extreme Greed", emoji: "🤑" };
}

// Helper function to get market mood emoji
function getMarketMood(cashChange, perfChange, riskChange) {
  if (perfChange > 1 && cashChange < -0.5) return "🚀"; // Strong performance + deploying cash
  if (perfChange < -1 || cashChange > 1) return "📉"; // Poor performance or defensive
  if (Math.abs(cashChange) < 0.2 && Math.abs(perfChange) < 0.5) return "😴"; // Quiet day
  if (perfChange > 0) return "📈"; // Generally positive
  return "🌊"; // Mixed signals
}

// Helper function to find biggest daily movers
function findDailyMovers(currentHoldings, prevHoldings, threshold) {
  const movers = [];
  
  currentHoldings.slice(0, 50).forEach(h => {
    const prevHolding = prevHoldings.find(ph => ph.instrumentId === h.instrumentId);
    if (prevHolding) {
      const change = h.holdersCount - prevHolding.holdersCount;
      if (Math.abs(change) >= threshold) {
        const percentChange = ((change / prevHolding.holdersCount) * 100);
        movers.push({
          symbol: h.symbol,
          name: h.instrumentName,
          change: change,
          percentChange: percentChange,
          currentHolders: h.holdersCount
        });
      }
    }
  });
  
  return movers.sort((a, b) => b.change - a.change);
}

// Generate daily post
function generateDailyPost() {
  const files = getLatestDataFiles();
  console.log(`Comparing ${files.today} vs ${files.yesterday}\n`);
  
  const currentData = JSON.parse(fs.readFileSync(files.todayPath));
  const prevData = JSON.parse(fs.readFileSync(files.yesterdayPath));
  
  const current1500 = currentData.analyses[3]; // Broad investors group
  const prev1500 = prevData.analyses[3];
  
  const current100 = currentData.analyses[0]; // Most copied investors
  const prev100 = prevData.analyses[0];
  
  // Extract date from filename
  const dateMatch = files.today.match(/(\d{4}-\d{2}-\d{2})/);
  const displayDate = dateMatch ? dateMatch[1] : 'Today';
  
  // Calculate daily changes
  const cashChange100 = current100.averages.cashPercentage - prev100.averages.cashPercentage;
  const perfChange100 = current100.averages.gain - prev100.averages.gain;
  const riskChange100 = current100.averages.riskScore - prev100.averages.riskScore;
  
  // Calculate Fear & Greed Index
  const fearGreed = calculateFearGreedIndex(current100.averages.cashPercentage);
  const prevFearGreed = calculateFearGreedIndex(prev100.averages.cashPercentage);
  const fearGreedChange = fearGreed.value - prevFearGreed.value;
  
  // Market mood
  const mood = getMarketMood(cashChange100, perfChange100, riskChange100);
  
  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗗𝗮𝗶𝗹𝘆 𝗨𝗽𝗱𝗮𝘁𝗲 ' + displayDate + ' 🎩');
  console.log('𝗠𝗮𝗿𝗸𝗲𝘁 𝗠𝗼𝗼𝗱: ' + mood + '\n');
  
  // Fear & Greed Index Section
  console.log('📊 𝗙𝗲𝗮𝗿 & 𝗚𝗿𝗲𝗲𝗱 𝗜𝗻𝗱𝗲𝘅 (𝗠𝗼𝘀𝘁 𝗖𝗼𝗽𝗶𝗲𝗱):');
  console.log(fearGreed.emoji + ' ' + fearGreed.status + ': ' + fearGreed.value.toFixed(0) + '/100 (' + 
    (fearGreedChange > 0 ? '+' : '') + fearGreedChange.toFixed(1) + ' vs yesterday)');
  
  // Market movement interpretation
  let cashFlow = '';
  if (cashChange100 > 0.3) cashFlow = '💰 𝐅𝐥𝐨𝐰𝐢𝐧𝐠 𝐭𝐨 𝐬𝐚𝐟𝐞𝐭𝐲 (+' + cashChange100.toFixed(1) + 'pp cash)';
  else if (cashChange100 < -0.3) cashFlow = '🎯 𝐃𝐞𝐩𝐥𝐨𝐲𝐢𝐧𝐠 𝐢𝐧𝐭𝐨 𝐦𝐚𝐫𝐤𝐞𝐭𝐬 (' + cashChange100.toFixed(1) + 'pp cash)';
  else cashFlow = '⚖️ 𝐁𝐚𝐥𝐚𝐧𝐜𝐞𝐝 𝐩𝐨𝐬𝐢𝐭𝐢𝐨𝐧𝐢𝐧𝐠 (' + (cashChange100 > 0 ? '+' : '') + cashChange100.toFixed(1) + 'pp cash)';
  console.log(cashFlow + '\n');

  // Daily Biggest Moves Section
  const dailyMovers100 = findDailyMovers(current100.topHoldings, prev100.topHoldings, 1);
  const dailyMovers1500 = findDailyMovers(current1500.topHoldings, prev1500.topHoldings, 3);
  
  if (dailyMovers100.length > 0 || dailyMovers1500.length > 0) {
    console.log('🔥 𝗗𝗮𝗶𝗹𝘆 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗠𝗼𝘃𝗲𝘀:');
    
    // Most Copied moves
    if (dailyMovers100.length > 0) {
      const positiveMovers100 = dailyMovers100.filter(m => m.change > 0).slice(0, 3);
      const negativeMovers100 = dailyMovers100.filter(m => m.change < 0).slice(0, 3);
      
      if (positiveMovers100.length > 0) {
        console.log('\n⬆️ 𝐌𝐨𝐬𝐭 𝐀𝐝𝐝𝐞𝐝 - 𝐓𝐨𝐩 𝟏𝟎𝟎 𝐆𝐫𝐨𝐮𝐩:');
        positiveMovers100.forEach(m => {
          console.log('• $' + m.symbol + ': +' + m.change + ' holders (+' + 
            m.percentChange.toFixed(1) + '%)');
        });
      }
      
      if (negativeMovers100.length > 0) {
        console.log('\n⬇️ 𝐌𝐨𝐬𝐭 𝐃𝐫𝐨𝐩𝐩𝐞𝐝 - 𝐓𝐨𝐩 𝟏𝟎𝟎 𝐆𝐫𝐨𝐮𝐩:');
        negativeMovers100.forEach(m => {
          console.log('• $' + m.symbol + ': ' + m.change + ' holders (' + 
            m.percentChange.toFixed(1) + '%)');
        });
      }
    }
    
    // Broad Group moves
    if (dailyMovers1500.length > 0) {
      const positiveMovers1500 = dailyMovers1500.filter(m => m.change > 0).slice(0, 3);
      const negativeMovers1500 = dailyMovers1500.filter(m => m.change < 0).slice(0, 3);
      
      if (positiveMovers1500.length > 0) {
        console.log('\n⬆️ 𝐌𝐨𝐬𝐭 𝐀𝐝𝐝𝐞𝐝 - 𝐁𝐫𝐨𝐚𝐝 𝐆𝐫𝐨𝐮𝐩:');
        positiveMovers1500.forEach(m => {
          console.log('• $' + m.symbol + ': +' + m.change + ' holders (+' + 
            m.percentChange.toFixed(1) + '%)');
        });
      }
      
      if (negativeMovers1500.length > 0) {
        console.log('\n⬇️ 𝐌𝐨𝐬𝐭 𝐃𝐫𝐨𝐩𝐩𝐞𝐝 - 𝐁𝐫𝐨𝐚𝐝 𝐆𝐫𝐨𝐮𝐩:');
        negativeMovers1500.forEach(m => {
          console.log('• $' + m.symbol + ': ' + m.change + ' holders (' + 
            m.percentChange.toFixed(1) + '%)');
        });
      }
    }
    console.log('');
  }

  // Most Copied vs Broad Group comparison  
  console.log('📈 𝗧𝗼𝗽 𝟭𝟬𝟬 𝘃𝘀 𝗕𝗿𝗼𝗮𝗱 𝗠𝗮𝗿𝗸𝗲𝘁 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲:');
  
  // Calculate differences for display in parentheses (gap between groups)
  const cashGap = current100.averages.cashPercentage - current1500.averages.cashPercentage;
  console.log('• 𝗖𝗮𝘀𝗵: ' + current100.averages.cashPercentage.toFixed(1) + '% vs ' + current1500.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashGap > 0 ? 'top 100 +' : 'top 100 ') + cashGap.toFixed(1) + 'pp)');
  
  const gainGap = current100.averages.gain - current1500.averages.gain;
  console.log('• 𝗬𝗧𝗗 𝗣𝗲𝗿𝗳: ' + current100.averages.gain.toFixed(1) + '% vs ' + current1500.averages.gain.toFixed(1) + '% (' +
    (gainGap > 0 ? 'top 100 +' : 'top 100 ') + gainGap.toFixed(1) + 'pp)');
  
  const winRatioGap = current100.averages.winRatio - current1500.averages.winRatio;
  console.log('• 𝗪𝗶𝗻 𝗥𝗮𝘁𝗶𝗼: ' + current100.averages.winRatio.toFixed(1) + '% vs ' + current1500.averages.winRatio.toFixed(1) + '% (' +
    (winRatioGap > 0 ? 'top 100 +' : 'top 100 ') + winRatioGap.toFixed(1) + 'pp)');
  
  // Daily performance change insight
  if (Math.abs(perfChange100) > 0.5) {
    const perfDirection = perfChange100 > 0 ? 'gained' : 'lost';
    console.log('• 𝗗𝗮𝗶𝗹𝘆: Top 100 ' + perfDirection + ' ' + Math.abs(perfChange100).toFixed(1) + 'pp YTD vs yesterday');
  }
  
  // Daily Copier Changes for Top 100 Group
  if (prevData.investors && prevData.investors.length >= 100) {
    const copierChanges = [];
    
    currentData.investors.slice(0, 100).forEach(currentInv => {
      const prevInv = prevData.investors.find(p => p.userName === currentInv.userName);
      if (prevInv) {
        const copierChange = currentInv.copiers - prevInv.copiers;
        if (Math.abs(copierChange) >= 3) { // Lower threshold for top 5 lists
          copierChanges.push({
            investor: currentInv,
            change: copierChange,
            percentChange: (copierChange / prevInv.copiers) * 100
          });
        }
      }
    });
    
    if (copierChanges.length > 0) {
      copierChanges.sort((a, b) => b.change - a.change);
      
      const gainers = copierChanges.filter(c => c.change > 0).slice(0, 5);
      const losers = copierChanges.filter(c => c.change < 0).slice(0, 5);
      
      if (gainers.length > 0 || losers.length > 0) {
        console.log('\n• 𝗗𝗮𝗶𝗹𝘆 𝗖𝗼𝗽𝗶𝗲𝗿 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆 (𝗧𝗼𝗽 𝟭𝟬𝟬):');
        
        if (gainers.length > 0) {
          console.log('\n  📈 𝐌𝐨𝐬𝐭 𝐂𝐨𝐩𝐢𝐞𝐫𝐬 𝐀𝐝𝐝𝐞𝐝:');
          gainers.forEach((g, i) => {
            console.log('  ' + (i+1) + '. ' + (g.investor.fullName || g.investor.userName) + ' (@' + g.investor.userName + '): (' + 
              g.investor.copiers.toLocaleString() + ' ↑' + g.change.toLocaleString() + ')');
          });
        }
        
        if (losers.length > 0) {
          console.log('\n  📉 𝐌𝐨𝐬𝐭 𝐂𝐨𝐩𝐢𝐞𝐫𝐬 𝐋𝐨𝐬𝐭:');
          losers.forEach((l, i) => {
            console.log('  ' + (i+1) + '. ' + (l.investor.fullName || l.investor.userName) + ' (@' + l.investor.userName + '): (' + 
              l.investor.copiers.toLocaleString() + ' ↓' + Math.abs(l.change).toLocaleString() + ')');
          });
        }
      }
    }
  }
  
  console.log('');
  
  // Performance Insights Section
  console.log('🏆 𝗗𝗮𝗶𝗹𝘆 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗜𝗻𝘀𝗶𝗴𝗵𝘁𝘀:');
  
  // Find top/bottom performers from individual investor data
  const sortedInvestors = currentData.investors
    .slice(0, 100) // Top 100 most copied
    .sort((a, b) => b.gain - a.gain);
  
  const topPerformer = sortedInvestors[0];
  const bottomPerformer = sortedInvestors[sortedInvestors.length - 1];
  
  console.log('🥇 𝐓𝐨𝐩 𝐏𝐞𝐫𝐟𝐨𝐫𝐦𝐞𝐫: ' + (topPerformer.fullName || topPerformer.userName) + ' (@' + topPerformer.userName + ') (' + topPerformer.gain.toFixed(1) + '% YTD, ' + topPerformer.copiers.toLocaleString() + ' copiers)');
  console.log('📉 𝐍𝐞𝐞𝐝𝐬 𝐖𝐨𝐫𝐤: ' + (bottomPerformer.fullName || bottomPerformer.userName) + ' (@' + bottomPerformer.userName + ') (' + bottomPerformer.gain.toFixed(1) + '% YTD, ' + bottomPerformer.copiers.toLocaleString() + ' copiers)');
  
  // Trading activity insight
  const avgTrades = current100.averages.trades;
  const prevAvgTrades = prev100.averages.trades;
  const tradesChange = avgTrades - prevAvgTrades;
  
  console.log('📊 𝐓𝐫𝐚𝐝𝐢𝐧𝐠 𝐀𝐜𝐭𝐢𝐯𝐢𝐭𝐲: Top 100 group averages ' + avgTrades.toFixed(0) + ' trades (' + 
    (tradesChange > 0 ? '+' : '') + tradesChange.toFixed(0) + ' vs yesterday)');
  
  if (Math.abs(tradesChange) > 2) {
    const activity = tradesChange > 0 ? 'increased' : 'decreased';
    console.log('• Top 100 group ' + activity + ' trading by ' + Math.abs(tradesChange).toFixed(0) + ' trades on average');
  }
  
  console.log('');

  // Investor Spotlight Section  
  console.log('🔍 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿 𝗦𝗽𝗼𝘁𝗹𝗶𝗴𝗵𝘁:');
  
  // Find an interesting investor (high performance + reasonable following)
  const spotlight = currentData.investors
    .slice(0, 100)
    .filter(inv => inv.gain > 10 && inv.copiers > 1000 && inv.copiers < 10000)
    .sort((a, b) => b.gain - a.gain)[0];
  
  if (spotlight) {
    console.log('👤 ' + (spotlight.fullName || spotlight.userName) + ' (@' + spotlight.userName + ')');
    console.log('• YTD Performance: ' + spotlight.gain.toFixed(1) + '%');
    console.log('• Copiers: ' + spotlight.copiers.toLocaleString());
    console.log('• Risk Score: ' + spotlight.riskScore + '/10');
    console.log('• Win Ratio: ' + spotlight.winRatio.toFixed(1) + '%');
    console.log('• Positions: ' + (spotlight.portfolio?.positionsCount || 'N/A'));
  }
  
  console.log('');

  // Top 10 Holdings for Top 100 Group  
  console.log('💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗧𝗼𝗽 𝟭𝟬𝟬 𝗚𝗿𝗼𝘂𝗽:');
  current100.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = prev100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const percentOfInvestors = (h.holdersCount / 100 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + 
      h.holdersCount + ' ' + changeText + ')');
  });

  // Top 10 Holdings for Broad Group
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  current1500.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = prev1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const percentOfInvestors = (h.holdersCount / 1500 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + 
      h.holdersCount + ' ' + changeText + ')');
  });
  
  // Key Takeaway Section
  console.log('\n💡 𝐊𝐞𝐲 𝐓𝐚𝐤𝐞𝐚𝐰𝐚𝐲:');
  let takeaway = '';
  
  if (fearGreed.status === 'Extreme Fear' && Math.abs(cashChange100) > 0.5) {
    takeaway = 'Top 100 investors in defensive mode - cash levels suggest market caution';
  } else if (fearGreed.status === 'Extreme Greed' && perfChange100 > 1) {
    takeaway = 'Risk-on sentiment with top 100 investors pushing performance higher';
  } else if (Math.abs(gainGap) > 2) {
    takeaway = 'Growing performance gap between top 100 and broad investor groups';
  } else if (dailyMovers100.length > 3) {
    takeaway = 'Active repositioning day with multiple top 100 group moves';
  } else {
    takeaway = 'Steady market conditions with ' + fearGreed.status.toLowerCase() + ' sentiment prevailing';
  }
  
  console.log('> ' + takeaway);
  
  console.log('\n---');
  console.log('📊 Full dashboard: weirdapps.github.io/etoro_census');
  console.log('🕐 Next update: Tomorrow 02:00 UTC');
}

// Run the daily post generation
try {
  generateDailyPost();
} catch (error) {
  console.error('Error:', error.message);
}