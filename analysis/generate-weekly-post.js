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
  
  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗪𝗲𝗲𝗸𝗹𝘆 𝗦𝘂𝗺𝗺𝗮𝗿𝘆 🎩');
  console.log(`${weekAgoDate} → ${latestDate}\n`);
  
  // Weekly changes for top 100 most copied
  console.log('📈 𝗪𝗲𝗲𝗸𝗹𝘆 𝗠𝗮𝗿𝗸𝗲𝘁 𝗦𝗲𝗻𝘁𝗶𝗺𝗲𝗻𝘁 (𝗧𝗼𝗽 𝟭𝟬𝟬):');
  
  const cashChange = latest100.averages.cashPercentage - weekAgo100.averages.cashPercentage;
  console.log('• 𝗖𝗮𝘀𝗵 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀: ' + latest100.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashChange > 0 ? '+' : '') + cashChange.toFixed(1) + 'pp week/week)');
  
  const riskChange = latest100.averages.riskScore - weekAgo100.averages.riskScore;
  console.log('• 𝗥𝗶𝘀𝗸 𝗦𝗰𝗼𝗿𝗲: ' + latest100.averages.riskScore.toFixed(1) + ' (' +
    (riskChange > 0 ? '+' : '') + riskChange.toFixed(2) + ' week/week)');
  
  const gainChange = latest100.averages.gain - weekAgo100.averages.gain;
  console.log('• 𝗬𝗧𝗗 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲: ' + latest100.averages.gain.toFixed(1) + '% (' +
    (gainChange > 0 ? '+' : '') + gainChange.toFixed(1) + 'pp week/week)');
  
  // Weekly Copier Changes for Top 100 Group
  if (latestData.investors && weekAgoData.investors && latestData.investors.length >= 100 && weekAgoData.investors.length >= 100) {
    const copierChanges = [];
    
    latestData.investors.slice(0, 100).forEach(currentInv => {
      const prevInv = weekAgoData.investors.find(p => p.userName === currentInv.userName);
      if (prevInv) {
        const copierChange = currentInv.copiers - prevInv.copiers;
        if (Math.abs(copierChange) >= 10) { // Higher threshold for weekly changes
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
      
      const gainers = copierChanges.filter(c => c.change > 0).slice(0, 3);
      const losers = copierChanges.filter(c => c.change < 0).slice(0, 3);
      
      if (gainers.length > 0) {
        console.log('\n📈 𝐌𝐨𝐬𝐭 𝐂𝐨𝐩𝐢𝐞𝐫𝐬 𝐀𝐝𝐝𝐞𝐝 (𝐖𝐞𝐞𝐤):');
        gainers.forEach((g, i) => {
          console.log((i+1) + '. ' + (g.investor.fullName || g.investor.userName) + ' (@' + g.investor.userName + '): (' + 
            g.investor.copiers.toLocaleString() + ' ↑' + g.change.toLocaleString() + ')');
        });
      }
      
      if (losers.length > 0) {
        console.log('\n📉 𝐌𝐨𝐬𝐭 𝐂𝐨𝐩𝐢𝐞𝐫𝐬 𝐋𝐨𝐬𝐭 (𝐖𝐞𝐞𝐤):');
        losers.forEach((l, i) => {
          console.log((i+1) + '. ' + (l.investor.fullName || l.investor.userName) + ' (@' + l.investor.userName + '): (' + 
            l.investor.copiers.toLocaleString() + ' ↓' + Math.abs(l.change).toLocaleString() + ')');
        });
      }
    }
  }
  
  console.log('\n');
  
  // Top weekly moves by holder count - Most Copied
  console.log('📊 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗪𝗲𝗲𝗸𝗹𝘆 𝗠𝗼𝘃𝗲𝘀:');
  
  const weeklyMovers100 = [];
  latest100.topHoldings.slice(0, 50).forEach(h => {
    const weekAgoHolding = weekAgo100.topHoldings.find(wh => wh.instrumentId === h.instrumentId);
    if (weekAgoHolding) {
      const change = h.holdersCount - weekAgoHolding.holdersCount;
      const percentChange = ((change / weekAgoHolding.holdersCount) * 100);
      
      if (Math.abs(change) >= 2) { // Threshold for top 100
        weeklyMovers100.push({
          symbol: h.symbol,
          name: h.instrumentName,
          change: change,
          percentChange: percentChange,
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
      const percentChange = ((change / weekAgoHolding.holdersCount) * 100);
      
      if (Math.abs(change) >= 10) { // Threshold for broad group
        weeklyMovers1500.push({
          symbol: h.symbol,
          name: h.instrumentName,
          change: change,
          percentChange: percentChange,
          currentHolders: h.holdersCount
        });
      }
    }
  });
  
  weeklyMovers100.sort((a, b) => b.change - a.change);
  weeklyMovers1500.sort((a, b) => b.change - a.change);
  
  // Most Copied moves
  if (weeklyMovers100.length > 0) {
    const positiveMovers100 = weeklyMovers100.filter(m => m.change > 0).slice(0, 3);
    if (positiveMovers100.length > 0) {
      console.log('\n🔥 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱 - 𝗧𝗼𝗽 𝟭𝟬𝟬:');
      positiveMovers100.forEach(m => {
        console.log('• $' + m.symbol + ': +' + m.change + ' holders (+' + 
          m.percentChange.toFixed(1) + '%)');
      });
    }
    
    const negativeMovers100 = weeklyMovers100.filter(m => m.change < 0).slice(0, 3);
    if (negativeMovers100.length > 0) {
      console.log('\n❄️ 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱 - 𝗧𝗼𝗽 𝟭𝟬𝟬:');
      negativeMovers100.forEach(m => {
        console.log('• $' + m.symbol + ': ' + m.change + ' holders (' + 
          m.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  // Broad Group moves
  if (weeklyMovers1500.length > 0) {
    const positiveMovers1500 = weeklyMovers1500.filter(m => m.change > 0).slice(0, 3);
    if (positiveMovers1500.length > 0) {
      console.log('\n🔥 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱 - 𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
      positiveMovers1500.forEach(m => {
        console.log('• $' + m.symbol + ': +' + m.change + ' holders (+' + 
          m.percentChange.toFixed(1) + '%)');
      });
    }
    
    const negativeMovers1500 = weeklyMovers1500.filter(m => m.change < 0).slice(0, 3);
    if (negativeMovers1500.length > 0) {
      console.log('\n❄️ 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱 - 𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
      negativeMovers1500.forEach(m => {
        console.log('• $' + m.symbol + ': ' + m.change + ' holders (' + 
          m.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  if (weeklyMovers100.length === 0 && weeklyMovers1500.length === 0) {
    console.log('• No significant moves this week');
  }
  
  // Top 10 Holdings for Most Copied Investors
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗧𝗼𝗽 𝟭𝟬𝟬 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀 (𝗪𝗲𝗲𝗸𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲):');
  latest100.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = weekAgo100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : h.holdersCount;
    const percentOfInvestors = (h.holdersCount / 100 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + 
      h.holdersCount + ' ' + changeText + ')');
  });
  
  // Top 10 Holdings for Broad Group
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗔𝗹𝗹 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀 (𝗪𝗲𝗲𝗸𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲):');
  latest1500.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = weekAgo1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : h.holdersCount;
    const percentOfInvestors = (h.holdersCount / 1500 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + 
      h.holdersCount + ' ' + changeText + ')');
  });
  
  console.log('\n**\n');
  console.log('Check out the census dashboard at:');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\n..updated daily at 02:00 UTC');
}

// Run the weekly post generation
try {
  generateWeeklyPost();
} catch (error) {
  console.error('Error:', error.message);
}