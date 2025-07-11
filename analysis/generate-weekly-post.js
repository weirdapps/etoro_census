const fs = require('fs');
const path = require('path');

// Function to get weekly data files (last 7 days)
function getWeeklyDataFiles() {
  // Handle both running from project root and from analysis directory
  const dataDir = fs.existsSync('./public/data') ? './public/data' : '../public/data';
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 7); // Get last 7 files
  
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  return {
    latest: files[0],
    weekAgo: files[files.length - 1],
    latestPath: path.join(dataDir, files[0]),
    weekAgoPath: path.join(dataDir, files[files.length - 1]),
    allFiles: files
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
  
  // Weekly changes for broad group
  console.log('📈 𝗪𝗲𝗲𝗸𝗹𝘆 𝗠𝗮𝗿𝗸𝗲𝘁 𝗦𝗲𝗻𝘁𝗶𝗺𝗲𝗻𝘁 (𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽):');
  
  const cashChange = latest1500.averages.cashPercentage - weekAgo1500.averages.cashPercentage;
  console.log('• 𝗖𝗮𝘀𝗵 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀: ' + latest1500.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashChange > 0 ? '+' : '') + cashChange.toFixed(1) + 'pp week/week)');
  
  const riskChange = latest1500.averages.riskScore - weekAgo1500.averages.riskScore;
  console.log('• 𝗥𝗶𝘀𝗸 𝗦𝗰𝗼𝗿𝗲: ' + latest1500.averages.riskScore.toFixed(1) + ' (' +
    (riskChange > 0 ? '+' : '') + riskChange.toFixed(2) + ' week/week)');
  
  const gainChange = latest1500.averages.gain - weekAgo1500.averages.gain;
  console.log('• 𝗬𝗧𝗗 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲: ' + latest1500.averages.gain.toFixed(1) + '% (' +
    (gainChange > 0 ? '+' : '') + gainChange.toFixed(1) + 'pp week/week)\n');
  
  // Top weekly moves by holder count
  console.log('📊 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗪𝗲𝗲𝗸𝗹𝘆 𝗠𝗼𝘃𝗲𝘀 (𝗯𝘆 𝗽𝗼𝗽𝘂𝗹𝗮𝗿𝗶𝘁𝘆):');
  
  const weeklyMovers = [];
  latest1500.topHoldings.slice(0, 50).forEach(h => {
    const weekAgoHolding = weekAgo1500.topHoldings.find(wh => wh.instrumentId === h.instrumentId);
    if (weekAgoHolding) {
      const change = h.holdersCount - weekAgoHolding.holdersCount;
      const percentChange = ((change / weekAgoHolding.holdersCount) * 100);
      
      if (Math.abs(change) >= 10) { // Only show significant moves
        weeklyMovers.push({
          symbol: h.symbol,
          name: h.instrumentName,
          change: change,
          percentChange: percentChange,
          currentHolders: h.holdersCount,
          weekReturn: h.weekTDReturn || 0
        });
      }
    }
  });
  
  weeklyMovers.sort((a, b) => b.change - a.change);
  
  if (weeklyMovers.length > 0) {
    console.log('🔥 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
    weeklyMovers.slice(0, 3).forEach(m => {
      console.log('• $' + m.symbol + ': +' + m.change + ' holders (+' + 
        m.percentChange.toFixed(1) + '%) | Week return: ' + 
        (m.weekReturn > 0 ? '+' : '') + m.weekReturn.toFixed(1) + '%');
    });
    
    console.log('\n❄️ 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱:');
    const negativeMovers = weeklyMovers.filter(m => m.change < 0).slice(0, 3);
    negativeMovers.forEach(m => {
      console.log('• $' + m.symbol + ': ' + m.change + ' holders (' + 
        m.percentChange.toFixed(1) + '%) | Week return: ' + 
        (m.weekReturn > 0 ? '+' : '') + m.weekReturn.toFixed(1) + '%');
    });
  } else {
    console.log('• No significant moves (>10 holders) this week');
  }
  
  // Top Holdings Weekly Changes - Most Copied
  console.log('\n💎 𝗧𝗼𝗽 𝟱 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗠𝗼𝘀𝘁 𝗖𝗼𝗽𝗶𝗲𝗱 (𝗪𝗲𝗲𝗸𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲):');
  latest100.topHoldings.slice(0, 5).forEach((h, i) => {
    const prevHolding = weekAgo100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : h.holdersCount;
    const percentOfInvestors = (h.holdersCount / 100 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '→' : (holderChange > 0 ? '↗' : '↘') + Math.abs(holderChange);
    const weekReturn = h.weekTDReturn ? ((h.weekTDReturn > 0 ? '+' : '') + h.weekTDReturn.toFixed(1) + '%') : 'N/A';
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% (' + changeText + ') | Week: ' + weekReturn);
  });
  
  // Elite vs Masses weekly comparison
  console.log('\n🏆 𝗠𝗼𝘀𝘁 𝗖𝗼𝗽𝗶𝗲𝗱 𝘃𝘀 𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  const eliteCashChange = latest100.averages.cashPercentage - weekAgo100.averages.cashPercentage;
  const eliteGainChange = latest100.averages.gain - weekAgo100.averages.gain;
  const eliteRiskChange = latest100.averages.riskScore - weekAgo100.averages.riskScore;
  
  console.log('• 𝗖𝗮𝘀𝗵 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀:');
  console.log('  - Most Copied: ' + latest100.averages.cashPercentage.toFixed(1) + '% (' + 
    (eliteCashChange > 0 ? '+' : '') + eliteCashChange.toFixed(1) + 'pp)');
  console.log('  - Broad Group: ' + latest1500.averages.cashPercentage.toFixed(1) + '% (' + 
    (cashChange > 0 ? '+' : '') + cashChange.toFixed(1) + 'pp)');
  
  console.log('• 𝗥𝗶𝘀𝗸 𝗦𝗰𝗼𝗿𝗲:');
  console.log('  - Most Copied: ' + latest100.averages.riskScore.toFixed(1) + ' (' + 
    (eliteRiskChange > 0 ? '+' : '') + eliteRiskChange.toFixed(2) + ')');
  console.log('  - Broad Group: ' + latest1500.averages.riskScore.toFixed(1) + ' (' + 
    (riskChange > 0 ? '+' : '') + riskChange.toFixed(2) + ')');
  
  console.log('• 𝗬𝗧𝗗 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲:');
  console.log('  - Most Copied: ' + latest100.averages.gain.toFixed(1) + '% (' + 
    (eliteGainChange > 0 ? '+' : '') + eliteGainChange.toFixed(1) + 'pp)');
  console.log('  - Broad Group: ' + latest1500.averages.gain.toFixed(1) + '% (' + 
    (gainChange > 0 ? '+' : '') + gainChange.toFixed(1) + 'pp)');
  
  // Weekly Insights Section
  console.log('\n💡 𝗪𝗲𝗲𝗸𝗹𝘆 𝗜𝗻𝘀𝗶𝗴𝗵𝘁𝘀:');
  
  // Risk sentiment insight
  if (eliteCashChange > 0.3 && cashChange > 0.3) {
    console.log('• 𝗗𝗲𝗳𝗲𝗻𝘀𝗶𝘃𝗲 𝗪𝗲𝗲𝗸: Both groups increased cash holdings, signaling caution');
  } else if (eliteCashChange < -0.3 && cashChange < -0.3) {
    console.log('• 𝗥𝗶𝘀𝗸-𝗢𝗻 𝗪𝗲𝗲𝗸: Both groups reduced cash, deploying capital into markets');
  } else if (Math.abs(eliteCashChange - cashChange) > 0.5) {
    const divergence = eliteCashChange > cashChange ? 'Most Copied more defensive' : 'Broad Group more defensive';
    console.log('• 𝗗𝗶𝘃𝗲𝗿𝗴𝗲𝗻𝗰𝗲: ' + divergence + ' than the other');
  }
  
  // Performance gap insight
  const currentPerfGap = latest100.averages.gain - latest1500.averages.gain;
  const previousPerfGap = weekAgo100.averages.gain - weekAgo1500.averages.gain;
  const gapChange = currentPerfGap - previousPerfGap;
  if (gapChange > 0.3) {
    console.log('• 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗚𝗮𝗽 𝗪𝗶𝗱𝗲𝗻𝗶𝗻𝗴: Elite investors pulling ahead this week');
  } else if (gapChange < -0.3) {
    console.log('• 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗖𝗼𝗻𝘃𝗲𝗿𝗴𝗲𝗻𝗰𝗲: Broad group catching up to elite this week');
  }
  
  // Trading activity insight (if win ratio data available)
  if (latest100.averages.winRatio && weekAgo100.averages.winRatio) {
    const winRatioChange = latest100.averages.winRatio - weekAgo100.averages.winRatio;
    if (Math.abs(winRatioChange) > 1) {
      console.log('• 𝗧𝗿𝗮𝗱𝗶𝗻𝗴 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆: Most Copied win ratio ' + 
        (winRatioChange > 0 ? 'improved' : 'declined') + ' by ' + 
        Math.abs(winRatioChange).toFixed(1) + 'pp this week');
    }
  }
  
  // Market trend insight based on weekly movers
  if (weeklyMovers.length > 0) {
    const techMovers = weeklyMovers.filter(m => 
      ['NVDA', 'MSFT', 'GOOG', 'META', 'AMZN', 'AAPL', 'AMD', 'TSM'].includes(m.symbol)
    );
    const cryptoMovers = weeklyMovers.filter(m => 
      ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'].includes(m.symbol)
    );
    
    if (techMovers.filter(m => m.change > 0).length >= 2) {
      console.log('• 𝗧𝗲𝗰𝗵 𝗙𝗼𝗰𝘂𝘀: Increased accumulation in technology stocks this week');
    }
    if (cryptoMovers.filter(m => m.change > 0).length >= 1) {
      console.log('• 𝗖𝗿𝘆𝗽𝘁𝗼 𝗠𝗼𝗺𝗲𝗻𝘁𝘂𝗺: Growing crypto interest among popular investors');
    }
    
    // Check for sector rotation
    const positiveMovers = weeklyMovers.filter(m => m.change > 0);
    if (positiveMovers.length >= 3) {
      const avgReturn = positiveMovers.reduce((sum, m) => sum + m.weekReturn, 0) / positiveMovers.length;
      if (avgReturn > 2) {
        console.log('• 𝗠𝗼𝗺𝗲𝗻𝘁𝘂𝗺 𝗧𝗿𝗮𝗱𝗶𝗻𝗴: Popular investors chasing positive weekly performers');
      } else if (avgReturn < -2) {
        console.log('• 𝗩𝗮𝗹𝘂𝗲 𝗛𝘂𝗻𝘁𝗶𝗻𝗴: Popular investors buying into weekly declines');
      }
    }
  }
  
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