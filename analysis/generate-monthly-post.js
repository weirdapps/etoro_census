const fs = require('fs');
const path = require('path');

// Function to get monthly data files (approximately 30 days apart)
function getMonthlyDataFiles() {
  const dataDir = '../public/data';
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  // Try to find files approximately 30 days apart
  const latestFile = files[0];
  const latestDate = new Date(latestFile.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '');
  
  let monthAgoFile = files[files.length - 1]; // Fallback to oldest
  
  // Look for a file close to 30 days ago
  for (const file of files) {
    const fileDate = new Date(file.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '');
    const daysDiff = (latestDate - fileDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff >= 25 && daysDiff <= 35) { // 25-35 days range
      monthAgoFile = file;
      break;
    }
  }
  
  return {
    latest: latestFile,
    monthAgo: monthAgoFile,
    latestPath: path.join(dataDir, latestFile),
    monthAgoPath: path.join(dataDir, monthAgoFile)
  };
}

// Generate monthly post
function generateMonthlyPost() {
  const files = getMonthlyDataFiles();
  console.log(`Monthly analysis: ${files.monthAgo} to ${files.latest}\n`);
  
  const currentData = JSON.parse(fs.readFileSync(files.latestPath));
  const monthAgoData = JSON.parse(fs.readFileSync(files.monthAgoPath));
  
  const current1500 = currentData.analyses[3];
  const monthAgo1500 = monthAgoData.analyses[3];
  const current100 = currentData.analyses[0];
  const monthAgo100 = monthAgoData.analyses[0];
  
  // Extract dates
  const currentDate = files.latest.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || 'Current';
  const monthAgoDate = files.monthAgo.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || 'Month Ago';
  
  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗥𝗲𝗽𝗼𝗿𝘁 🎩');
  console.log(`${monthAgoDate} → ${currentDate}\n`);
  
  // Monthly performance overview
  console.log('📈 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗢𝘃𝗲𝗿𝘃𝗶𝗲𝘄 (𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽):');
  
  const gainChange = current1500.averages.gain - monthAgo1500.averages.gain;
  console.log('• 𝗔𝘃𝗲𝗿𝗮𝗴𝗲 𝗬𝗧𝗗 𝗥𝗲𝘁𝘂𝗿𝗻: ' + current1500.averages.gain.toFixed(1) + '% (was ' + 
    monthAgo1500.averages.gain.toFixed(1) + '% last month, ' + (gainChange > 0 ? '+' : '') + gainChange.toFixed(1) + 'pp)');
  
  const winRatioChange = current1500.averages.winRatio - monthAgo1500.averages.winRatio;
  console.log('• 𝗔𝘃𝗲𝗿𝗮𝗴𝗲 𝗪𝗶𝗻 𝗥𝗮𝘁𝗲: ' + current1500.averages.winRatio.toFixed(1) + '% (' + 
    (winRatioChange > 0 ? '+' : '') + winRatioChange.toFixed(1) + 'pp from last month)');
  
  const tradesChange = current1500.averages.trades - monthAgo1500.averages.trades;
  console.log('• 𝗔𝘃𝗲𝗿𝗮𝗴𝗲 𝗧𝗿𝗮𝗱𝗶𝗻𝗴 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆: ' + Math.round(current1500.averages.trades) + ' trades (' + 
    (tradesChange > 0 ? '+' : '') + Math.round(tradesChange) + ' from last month)\n');
  
  // Portfolio composition changes
  console.log('💼 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼 𝗖𝗼𝗺𝗽𝗼𝘀𝗶𝘁𝗶𝗼𝗻 𝗦𝗵𝗶𝗳𝘁𝘀:');
  
  // Find new entrants to top 20
  const newEntrants = [];
  current1500.topHoldings.slice(0, 20).forEach(h => {
    const wasInTop20 = monthAgo1500.topHoldings.slice(0, 20).find(ph => ph.instrumentId === h.instrumentId);
    if (!wasInTop20) {
      newEntrants.push(h);
    }
  });
  
  if (newEntrants.length > 0) {
    console.log('🆕 𝗡𝗲𝘄 𝘁𝗼 𝗧𝗼𝗽 𝟮𝟬:');
    newEntrants.forEach(h => {
      const percentOfInvestors = (h.holdersCount / 1500 * 100).toFixed(1);
      console.log('• $' + h.symbol + ' (' + h.instrumentName + '): ' + percentOfInvestors + 
        '% of investors (' + h.holdersCount + ' holders)');
    });
    console.log('');
  }
  
  // Biggest holder count changes
  console.log('📊 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗛𝗼𝗹𝗱𝗲𝗿 𝗖𝗵𝗮𝗻𝗴𝗲𝘀:');
  const holderChanges = [];
  current1500.topHoldings.slice(0, 50).forEach(h => {
    const monthAgoHolding = monthAgo1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    if (monthAgoHolding) {
      const change = h.holdersCount - monthAgoHolding.holdersCount;
      if (Math.abs(change) >= 20) { // Show significant changes
        holderChanges.push({
          symbol: h.symbol,
          name: h.instrumentName,
          change: change,
          current: h.holdersCount,
          monthReturn: h.monthTDReturn || 0
        });
      }
    }
  });
  
  holderChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  holderChanges.slice(0, 10).forEach(a => {
    console.log('• $' + a.symbol + ' (' + a.name + '): ' + (a.change > 0 ? '+' : '') + a.change + 
      ' holders (now ' + a.current + ') | Month return: ' + 
      (a.monthReturn > 0 ? '+' : '') + a.monthReturn.toFixed(1) + '%');
  });
  
  // Risk sentiment evolution
  console.log('\n🎯 𝗥𝗶𝘀𝗸 𝗦𝗲𝗻𝘁𝗶𝗺𝗲𝗻𝘁 𝗘𝘃𝗼𝗹𝘂𝘁𝗶𝗼𝗻:');
  const cashDiff = current1500.averages.cashPercentage - monthAgo1500.averages.cashPercentage;
  const riskDiff = current1500.averages.riskScore - monthAgo1500.averages.riskScore;
  
  console.log('• 𝗖𝗮𝘀𝗵 𝗣𝗼𝘀𝗶𝘁𝗶𝗼𝗻 𝗖𝗵𝗮𝗻𝗴𝗲: ' + (cashDiff > 0 ? '+' : '') + cashDiff.toFixed(1) + 'pp');
  console.log('• 𝗥𝗶𝘀𝗸 𝗦𝗰𝗼𝗿𝗲 𝗖𝗵𝗮𝗻𝗴𝗲: ' + (riskDiff > 0 ? '+' : '') + riskDiff.toFixed(2));
  
  if (Math.abs(cashDiff) > 2) {
    if (cashDiff > 2) {
      console.log('• 𝗦𝗶𝗴𝗻𝗶𝗳𝗶𝗰𝗮𝗻𝘁 𝗱𝗲𝗳𝗲𝗻𝘀𝗶𝘃𝗲 𝘀𝗵𝗶𝗳𝘁: Cash positions up significantly');
    } else {
      console.log('• 𝗥𝗶𝘀𝗸-𝗼𝗻 𝗲𝗻𝘃𝗶𝗿𝗼𝗻𝗺𝗲𝗻𝘁: Cash positions down significantly');
    }
  } else {
    console.log('• 𝗦𝘁𝗮𝗯𝗹𝗲 𝗿𝗶𝘀𝗸 𝗮𝗽𝗽𝗲𝘁𝗶𝘁𝗲: Cash positions relatively unchanged');
  }
  
  // Elite vs Broad monthly comparison
  console.log('\n🏆 𝗠𝗼𝘀𝘁 𝗖𝗼𝗽𝗶𝗲𝗱 𝘃𝘀 𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 (𝗠𝗼𝗻𝘁𝗵𝗹𝘆):');
  const eliteCashChange = current100.averages.cashPercentage - monthAgo100.averages.cashPercentage;
  const eliteGainChange = current100.averages.gain - monthAgo100.averages.gain;
  
  console.log('• Most copied cash change: ' + (eliteCashChange > 0 ? '+' : '') + eliteCashChange.toFixed(1) + 'pp');
  console.log('• Broad group cash change: ' + (cashDiff > 0 ? '+' : '') + cashDiff.toFixed(1) + 'pp');
  console.log('• Most copied YTD gain: ' + current100.averages.gain.toFixed(1) + '% (' + 
    (eliteGainChange > 0 ? '+' : '') + eliteGainChange.toFixed(1) + 'pp this month)');
  console.log('• Performance gap: ' + (current100.averages.gain - current1500.averages.gain).toFixed(1) + 'pp');
  
  console.log('\nCheck out the census dashboard at:');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\n..updated daily at 02:00 UTC');
}

// Run the monthly post generation
try {
  generateMonthlyPost();
} catch (error) {
  console.error('Error:', error.message);
}