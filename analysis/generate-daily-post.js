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

// Helper function to find top copier changes
function findTopCopierChanges(currentInvestors, prevInvestors, threshold = 10) {
  const copierChanges = [];
  
  currentInvestors.slice(0, 100).forEach(currentInv => {
    const prevInv = prevInvestors.find(p => p.userName === currentInv.userName);
    if (prevInv) {
      const copierChange = currentInv.copiers - prevInv.copiers;
      if (Math.abs(copierChange) >= threshold) {
        copierChanges.push({
          investor: currentInv,
          change: copierChange,
          percentChange: (copierChange / prevInv.copiers) * 100
        });
      }
    }
  });
  
  return copierChanges.sort((a, b) => b.change - a.change);
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
  
  return movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

// Helper function to generate smart takeaway
function generateSmartTakeaway(fearGreed, cashChange100, gainGap, allMovers) {
  // Prioritize the most interesting insight
  if (fearGreed.status === 'Extreme Fear' && Math.abs(cashChange100) > 0.5) {
    return 'Top 100 investors in full defensive mode - high cash levels signal deep market caution';
  } else if (fearGreed.status === 'Extreme Greed' && cashChange100 < -0.5) {
    return 'Risk-on euphoria as Top 100 investors deploy capital aggressively';
  } else if (Math.abs(gainGap) > 4) {
    return 'Performance gap ' + (gainGap > 0 ? 'widening' : 'narrowing') + ' - Top 100 skill advantage ' + (gainGap > 0 ? 'expanding' : 'diminishing');
  } else if (allMovers.length > 0 && Math.abs(allMovers[0].change) > 5) {
    return '$' + allMovers[0].symbol + ' surge shows ' + (allMovers[0].change > 0 ? 'conviction building' : 'profit-taking mode');
  } else if (fearGreed.status.includes('Fear')) {
    return 'Cautious positioning prevails - investors keeping powder dry for opportunities';
  } else if (fearGreed.status.includes('Greed')) {
    return 'Confidence building as investors deploy capital into markets';
  } else {
    return 'Balanced market conditions - investors neither defensive nor aggressive';
  }
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
  const cashChange1500 = current1500.averages.cashPercentage - prev1500.averages.cashPercentage;
  const perfChange100 = current100.averages.gain - prev100.averages.gain;
  const perfChange1500 = current1500.averages.gain - prev1500.averages.gain;
  
  console.log('🎩 𝐞𝐓𝐨𝐫𝐨 𝐂𝐞𝐧𝐬𝐮𝐬 𝐃𝐚𝐢𝐥𝐲 𝐔𝐩𝐝𝐚𝐭𝐞 ' + displayDate + ' 🎩');
  console.log('');
  
  // 1. Portfolio Performance Comparison
  console.log('📊 𝐏𝐞𝐫𝐟𝐨𝐫𝐦𝐚𝐧𝐜𝐞 𝐂𝐨𝐦𝐩𝐚𝐫𝐢𝐬𝐨𝐧:');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.gain.toFixed(1) + '% YTD (' + 
    (perfChange100 > 0 ? '+' : '') + perfChange100.toFixed(1) + 'pp daily)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.gain.toFixed(1) + '% YTD (' + 
    (perfChange1500 > 0 ? '+' : '') + perfChange1500.toFixed(1) + 'pp daily)');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘁𝗮𝗴𝗲: +' + (current100.averages.gain - current1500.averages.gain).toFixed(1) + 'pp');
  
  // Cash positioning
  console.log('\n💰 𝐂𝐚𝐬𝐡 𝐏𝐨𝐬𝐢𝐭𝐢𝐨𝐧𝐢𝐧𝐠:');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashChange100 > 0 ? '+' : '') + cashChange100.toFixed(1) + 'pp daily)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashChange1500 > 0 ? '+' : '') + cashChange1500.toFixed(1) + 'pp daily)\n');

  // 2. Top Portfolio Holdings
  console.log('💎 𝐓𝐨𝐩 𝟏𝟎 𝐏𝐨𝐫𝐭𝐟𝐨𝐥𝐢𝐨 𝐇𝐨𝐥𝐝𝐢𝐧𝐠𝐬:');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬:');
  current100.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = prev100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeText = holderChange === 0 ? '→' : (holderChange > 0 ? '↑' + holderChange : '↓' + Math.abs(holderChange));
    const percentage = (h.holdersCount / 100 * 100).toFixed(0);
    console.log((i+1) + '. $' + h.symbol + ' (' + percentage + '% ' + changeText + ')');
  });
  
  console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  current1500.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = prev1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeText = holderChange === 0 ? '→' : (holderChange > 0 ? '↑' + holderChange : '↓' + Math.abs(holderChange));
    const percentage = (h.holdersCount / 1500 * 100).toFixed(0);
    console.log((i+1) + '. $' + h.symbol + ' (' + percentage + '% ' + changeText + ')');
  });

  // 3. Biggest Asset Moves
  const dailyMovers100 = findDailyMovers(current100.topHoldings, prev100.topHoldings, 1);
  const dailyMovers1500 = findDailyMovers(current1500.topHoldings, prev1500.topHoldings, 3);
  
  console.log('\n🚀 𝐁𝐢𝐠𝐠𝐞𝐬𝐭 𝐀𝐬𝐬𝐞𝐭 𝐌𝐨𝐯𝐞𝐬:');
  
  // Top 100 moves
  if (dailyMovers100.length > 0) {
    const additions100 = dailyMovers100.filter(m => m.change > 0).slice(0, 5);
    const reductions100 = dailyMovers100.filter(m => m.change < 0).slice(0, 5);
    
    if (additions100.length > 0) {
      console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions100.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': +' + move.change + ' investors (+' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
    
    if (reductions100.length > 0) {
      console.log('\n𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      reductions100.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  // Broad Group moves
  if (dailyMovers1500.length > 0) {
    const additions1500 = dailyMovers1500.filter(m => m.change > 0).slice(0, 5);
    const reductions1500 = dailyMovers1500.filter(m => m.change < 0).slice(0, 5);
    
    if (additions1500.length > 0) {
      console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions1500.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': +' + move.change + ' investors (+' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
    
    if (reductions1500.length > 0) {
      console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      reductions1500.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  if (dailyMovers100.length === 0 && dailyMovers1500.length === 0) {
    console.log('Minimal portfolio changes today - investors holding steady positions');
  }

  // 4. Top Copier Changes (PIs gaining/losing followers)
  console.log('\n📈 𝐓𝐨𝐩 𝐂𝐨𝐩𝐢𝐞𝐫 𝐂𝐡𝐚𝐧𝐠𝐞𝐬:');
  
  const copierChanges = findTopCopierChanges(currentData.investors, prevData.investors, 3);
  
  if (copierChanges.length > 0) {
    const gainers = copierChanges.filter(c => c.change > 0).slice(0, 5);
    const losers = copierChanges.filter(c => c.change < 0).slice(0, 5);
    
    if (gainers.length > 0) {
      console.log('🚀 𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
      gainers.forEach((change, i) => {
        console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
          ' (@' + change.investor.userName + '): +' + change.change + ' copiers');
      });
    }
    
    if (losers.length > 0) {
      console.log('\n📉 𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀:');
      losers.forEach((change, i) => {
        console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
          ' (@' + change.investor.userName + '): ' + change.change + ' copiers');
      });
    }
  } else {
    console.log('Stable copier counts - minimal changes in investor following today');
  }

  // 5. Key Insight
  console.log('\n💡 𝐊𝐞𝐲 𝐈𝐧𝐬𝐢𝐠𝐡𝐭:');
  
  // Generate the most relevant insight from today's data
  let insight = '';
  const gainGap = current100.averages.gain - current1500.averages.gain;
  
  if (Math.abs(cashChange100 - cashChange1500) > 0.5) {
    const direction = cashChange100 > cashChange1500 ? 'more defensive' : 'more aggressive';
    insight = 'Top 100 investors turning ' + direction + ' than broad market - divergent risk appetite emerging';
  } else if (Math.abs(perfChange100 - perfChange1500) > 1) {
    const direction = perfChange100 > perfChange1500 ? 'outperforming' : 'underperforming';
    insight = 'Top 100 ' + direction + ' broad group today by ' + Math.abs(perfChange100 - perfChange1500).toFixed(1) + 'pp';
  } else if (dailyMovers100.length > 0 && dailyMovers1500.length > 0) {
    insight = 'Active portfolio reshuffling across both Top 100 and broad investor groups';
  } else if (Math.abs(gainGap) > 4) {
    insight = 'Top 100 advantage remains strong at ' + gainGap.toFixed(1) + 'pp - skill gap persistent';
  } else {
    insight = 'Synchronized behavior between Top 100 and broad investors - market consensus evident';
  }
  
  console.log(insight);
  
  console.log('\n**\n');
  console.log('Check out the census dashboard at:\n');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\n..updated daily at 02:00 UTC');
}

// Run the daily post generation
try {
  generateDailyPost();
} catch (error) {
  console.error('Error:', error.message);
}