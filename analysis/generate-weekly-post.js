const fs = require('fs');
const path = require('path');

// Function to get Saturday reports (newest Saturday to previous Saturday)
function getWeeklyDataFiles() {
  // Handle both running from project root and from analysis directory
  const dataDir = fs.existsSync('./public/data') ? './public/data' : '../public/data';
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  // Find Saturday reports (day 6 in JS, where 0=Sunday, 6=Saturday)
  const saturdayFiles = files.filter(file => {
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      return date.getDay() === 6; // Saturday
    }
    return false;
  });
  
  if (saturdayFiles.length < 2) {
    throw new Error('Need at least 2 Saturday reports to compare');
  }
  
  const latestSaturday = saturdayFiles[0]; // Most recent Saturday
  const previousSaturday = saturdayFiles[1]; // Previous Saturday
  
  return {
    latest: latestSaturday,
    weekAgo: previousSaturday,
    latestPath: path.join(dataDir, latestSaturday),
    weekAgoPath: path.join(dataDir, previousSaturday),
    allFiles: saturdayFiles
  };
}

// Generate weekly post
function generateWeeklyPost() {
  const files = getWeeklyDataFiles();
  console.log(`Weekly analysis: ${files.weekAgo} to ${files.latest}\n`);
  
  const latestData = JSON.parse(fs.readFileSync(files.latestPath));
  const weekAgoData = JSON.parse(fs.readFileSync(files.weekAgoPath));
  
  // Validate data structure
  if (!latestData.analyses || !weekAgoData.analyses) {
    throw new Error('Invalid data structure: missing analyses array');
  }
  if (latestData.analyses.length < 4 || weekAgoData.analyses.length < 4) {
    throw new Error('Invalid data structure: insufficient analysis bands');
  }
  
  const latest1500 = latestData.analyses[3];
  const weekAgo1500 = weekAgoData.analyses[3];
  const latest100 = latestData.analyses[0];
  const weekAgo100 = weekAgoData.analyses[0];
  
  // Extract dates
  const latestDate = files.latest.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || 'Latest';
  const weekAgoDate = files.weekAgo.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || 'Week Ago';
  
  console.log('🎩 𝐞𝐓𝐨𝐫𝐨 𝐂𝐞𝐧𝐬𝐮𝐬 𝐖𝐞𝐞𝐤𝐥𝐲 𝐑𝐞𝐩𝐨𝐫𝐭 🎩');
  console.log(`${weekAgoDate} → ${latestDate}`);
  console.log('');
  
  // 1. Weekly Performance Comparison
  const cashChange100 = latest100.averages.cashPercentage - weekAgo100.averages.cashPercentage;
  const cashChange1500 = latest1500.averages.cashPercentage - weekAgo1500.averages.cashPercentage;
  const gainChange100 = latest100.averages.gain - weekAgo100.averages.gain;
  const gainChange1500 = latest1500.averages.gain - weekAgo1500.averages.gain;
  
  console.log('📊 𝐖𝐞𝐞𝐤𝐥𝐲 𝐏𝐞𝐫𝐟𝐨𝐫𝐦𝐚𝐧𝐜𝐞:');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + latest100.averages.gain.toFixed(1) + '% YTD (' + 
    (gainChange100 > 0 ? '+' : '') + gainChange100.toFixed(1) + 'pp weekly)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + latest1500.averages.gain.toFixed(1) + '% YTD (' + 
    (gainChange1500 > 0 ? '+' : '') + gainChange1500.toFixed(1) + 'pp weekly)');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘁𝗮𝗴𝗲: +' + (latest100.averages.gain - latest1500.averages.gain).toFixed(1) + 'pp');
  
  console.log('\n💰 𝐂𝐚𝐬𝐡 𝐏𝐨𝐬𝐢𝐭𝐢𝐨𝐧 𝐂𝐡𝐚𝐧𝐠𝐞𝐬:');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + latest100.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashChange100 > 0 ? '+' : '') + cashChange100.toFixed(1) + 'pp weekly)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + latest1500.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashChange1500 > 0 ? '+' : '') + cashChange1500.toFixed(1) + 'pp weekly)\n');
  
  // 2. Top Portfolio Holdings
  console.log('💎 𝐓𝐨𝐩 𝟏𝟎 𝐏𝐨𝐫𝐭𝐟𝐨𝐥𝐢𝐨 𝐇𝐨𝐥𝐝𝐢𝐧𝐠𝐬:');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬:');
  latest100.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = weekAgo100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeText = holderChange === 0 ? '→' : (holderChange > 0 ? '↑' + holderChange : '↓' + Math.abs(holderChange));
    const percentage = (h.holdersCount / 100 * 100).toFixed(0);
    console.log((i+1) + '. $' + h.symbol + ' (' + percentage + '% ' + changeText + ')');
  });
  
  console.log('\n𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  latest1500.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = weekAgo1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeText = holderChange === 0 ? '→' : (holderChange > 0 ? '↑' + holderChange : '↓' + Math.abs(holderChange));
    const percentage = (h.holdersCount / 1500 * 100).toFixed(0);
    console.log((i+1) + '. $' + h.symbol + ' (' + percentage + '% ' + changeText + ')');
  });

  // 3. Biggest Weekly Asset Moves
  const weeklyMovers100 = [];
  latest100.topHoldings.slice(0, 50).forEach(h => {
    const weekAgoHolding = weekAgo100.topHoldings.find(wh => wh.instrumentId === h.instrumentId);
    if (weekAgoHolding) {
      const change = h.holdersCount - weekAgoHolding.holdersCount;
      if (Math.abs(change) >= 2) {
        weeklyMovers100.push({
          symbol: h.symbol,
          change: change,
          percentChange: ((change / weekAgoHolding.holdersCount) * 100),
          currentHolders: h.holdersCount
        });
      }
    }
  });
  
  const weeklyMovers1500 = [];
  latest1500.topHoldings.slice(0, 50).forEach(h => {
    const weekAgoHolding = weekAgo1500.topHoldings.find(wh => wh.instrumentId === h.instrumentId);
    if (weekAgoHolding) {
      const change = h.holdersCount - weekAgoHolding.holdersCount;
      if (Math.abs(change) >= 10) {
        weeklyMovers1500.push({
          symbol: h.symbol,
          change: change,
          percentChange: ((change / weekAgoHolding.holdersCount) * 100),
          currentHolders: h.holdersCount
        });
      }
    }
  });
  
  console.log('\n🚀 𝐁𝐢𝐠𝐠𝐞𝐬𝐭 𝐀𝐬𝐬𝐞𝐭 𝐌𝐨𝐯𝐞𝐬:');
  
  // Top 100 moves
  if (weeklyMovers100.length > 0) {
    const additions100 = weeklyMovers100.filter(m => m.change > 0).slice(0, 5);
    const reductions100 = weeklyMovers100.filter(m => m.change < 0).slice(0, 5);
    
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
  if (weeklyMovers1500.length > 0) {
    const additions1500 = weeklyMovers1500.filter(m => m.change > 0).slice(0, 5);
    const reductions1500 = weeklyMovers1500.filter(m => m.change < 0).slice(0, 5);
    
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
  
  if (weeklyMovers100.length === 0 && weeklyMovers1500.length === 0) {
    console.log('Minimal portfolio changes this week - investors holding steady positions');
  }
  
  // 4. Top Copier Changes
  console.log('\n📈 𝐓𝐨𝐩 𝐂𝐨𝐩𝐢𝐞𝐫 𝐂𝐡𝐚𝐧𝐠𝐞𝐬:');
  
  if (latestData.investors && weekAgoData.investors && latestData.investors.length >= 100 && weekAgoData.investors.length >= 100) {
    const copierChanges = [];
    
    latestData.investors.slice(0, 100).forEach(currentInv => {
      const prevInv = weekAgoData.investors.find(p => p.userName === currentInv.userName);
      if (prevInv) {
        const copierChange = currentInv.copiers - prevInv.copiers;
        if (Math.abs(copierChange) >= 10) {
          copierChanges.push({
            investor: currentInv,
            change: copierChange,
            percentChange: (copierChange / prevInv.copiers) * 100
          });
        }
      }
    });
    
    if (copierChanges.length > 0) {
      const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
      const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);
      
      if (gainers.length > 0) {
        console.log('🚀 𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
        gainers.forEach((change, i) => {
          console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
            ' (@' + change.investor.userName + '): +' + change.change.toLocaleString() + ' copiers');
        });
      }
      
      if (losers.length > 0) {
        console.log('\n📉 𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀:');
        losers.forEach((change, i) => {
          console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
            ' (@' + change.investor.userName + '): ' + change.change.toLocaleString() + ' copiers');
        });
      }
    } else {
      console.log('Stable copier following - minimal changes in weekly momentum');
    }
  }

  // 5. Hot Hands Investor Profile
  console.log('\n🔥 𝐇𝐨𝐭 𝐇𝐚𝐧𝐝𝐬 𝐈𝐧𝐯𝐞𝐬𝐭𝐨𝐫:');
  
  // Find investor with strong recent performance and momentum
  let hotHands = null;
  if (latestData.investors && weekAgoData.investors && latestData.investors.length >= 100) {
    const hotCandidates = latestData.investors.slice(0, 100).map(inv => {
      const prevInv = weekAgoData.investors.find(p => p.userName === inv.userName);
      const copierGrowth = prevInv ? inv.copiers - prevInv.copiers : 0;
      const score = inv.gain + (copierGrowth * 0.01); // Performance + copier momentum
      return { ...inv, copierGrowth, hotScore: score };
    }).filter(inv => inv.gain > 10 && inv.copierGrowth > 0)
      .sort((a, b) => b.hotScore - a.hotScore);
    
    hotHands = hotCandidates[0];
  }
  
  if (hotHands) {
    console.log('⭐ ' + (hotHands.fullName || hotHands.userName) + ' (@' + hotHands.userName + ')');
    console.log('• ' + hotHands.gain.toFixed(1) + '% YTD | +' + hotHands.copierGrowth + ' copiers this week');
    console.log('• ' + hotHands.copiers.toLocaleString() + ' total copiers | Risk ' + hotHands.riskScore + '/10');
    console.log('• Strong momentum combining performance with growing following');
  } else {
    console.log('No standout momentum plays this week - market in consolidation mode');
  }

  // 6. Key Weekly Insight
  console.log('\n💡 𝐊𝐞𝐲 𝐖𝐞𝐞𝐤𝐥𝐲 𝐈𝐧𝐬𝐢𝐠𝐡𝐭:');
  
  let insight = '';
  const gainGap = latest100.averages.gain - latest1500.averages.gain;
  
  if (Math.abs(cashChange100 - cashChange1500) > 0.5) {
    const direction = cashChange100 > cashChange1500 ? 'more defensive' : 'more aggressive';
    insight = 'Top 100 investors turned ' + direction + ' than broad market - behavioral divergence emerging';
  } else if (Math.abs(gainChange100 - gainChange1500) > 1) {
    const direction = gainChange100 > gainChange1500 ? 'outperformed' : 'underperformed';
    insight = 'Top 100 ' + direction + ' broad group this week by ' + Math.abs(gainChange100 - gainChange1500).toFixed(1) + 'pp';
  } else if (weeklyMovers100.length > 3 || weeklyMovers1500.length > 3) {
    insight = 'Active portfolio reshuffling signals changing market conditions and new positioning';
  } else if (Math.abs(gainGap) > 4) {
    insight = 'Top 100 advantage holds steady at ' + gainGap.toFixed(1) + 'pp - consistent skill premium';
  } else {
    insight = 'Synchronized week between Top 100 and broad investors - market consensus prevailing';
  }
  
  console.log(insight);
  
  console.log('\n**\n');
  console.log('Check out the census dashboard at:\n');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\n..updated daily at 02:00 UTC');
}

// Run the weekly post generation
try {
  generateWeeklyPost();
} catch (error) {
  console.error('Error:', error.message);
}