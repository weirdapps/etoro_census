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
  
  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗗𝗮𝗶𝗹𝘆 𝗨𝗽𝗱𝗮𝘁𝗲 ' + displayDate + ' 🎩\n');
  
  // Most Copied vs Broad Group comparison
  console.log('🎩 𝗠𝗼𝘀𝘁 𝗖𝗼𝗽𝗶𝗲𝗱 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀 𝘃𝘀 𝗕𝗿𝗼𝗮𝗱 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀 𝗚𝗿𝗼𝘂𝗽:');
  
  // Calculate differences for display in parentheses (gap between groups)
  const cashGap = current100.averages.cashPercentage - current1500.averages.cashPercentage;
  console.log('• 𝗖𝗮𝘀𝗵 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀: ' + current100.averages.cashPercentage.toFixed(1) + '% vs ' + current1500.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashGap > 0 ? '+' : '') + cashGap.toFixed(1) + 'pp)');
  
  const riskGap = current100.averages.riskScore - current1500.averages.riskScore;
  console.log('• 𝗲𝘁𝗼𝗿𝗼 𝗥𝗶𝘀𝗸 𝗦𝗰𝗼𝗿𝗲: ' + current100.averages.riskScore.toFixed(1) + ' vs ' + current1500.averages.riskScore.toFixed(1) + ' (' +
    (riskGap > 0 ? '+' : '') + riskGap.toFixed(1) + 'pp)');
  
  const gainGap = current100.averages.gain - current1500.averages.gain;
  console.log('• 𝗬𝗧𝗗 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲: ' + current100.averages.gain.toFixed(1) + '% vs ' + current1500.averages.gain.toFixed(1) + '% (' +
    (gainGap > 0 ? '+' : '') + gainGap.toFixed(1) + 'pp)');
  
  const winRatioGap = current100.averages.winRatio - current1500.averages.winRatio;
  console.log('• 𝗪𝗶𝗻 𝗥𝗮𝘁𝗶𝗼: ' + current100.averages.winRatio.toFixed(1) + '% vs ' + current1500.averages.winRatio.toFixed(1) + '% (' +
    (winRatioGap > 0 ? '+' : '') + winRatioGap.toFixed(1) + 'pp)\n');
  
  // Top 10 Holdings for Most Copied Investors (Top 100)
  console.log('💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗠𝗼𝘀𝘁 𝗖𝗼𝗽𝗶𝗲𝗱 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀:');
  current100.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = prev100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const percentOfInvestors = (h.holdersCount / 100 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + 
      h.holdersCount + ' ' + changeText + ')');
  });
  
  // Top 10 Holdings for Broad Group (Top 1500)
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗕𝗿𝗼𝗮𝗱 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀 𝗚𝗿𝗼𝘂𝗽:');
  current1500.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = prev1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const percentOfInvestors = (h.holdersCount / 1500 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + 
      h.holdersCount + ' ' + changeText + ')');
  });
  
  console.log('\nCheck out the census dashboard at:\n');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\n..updated daily at 02:00 UTC');
}

// Run the daily post generation
try {
  generateDailyPost();
} catch (error) {
  console.error('Error:', error.message);
}