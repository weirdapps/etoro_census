const fs = require('fs');
const path = require('path');

// Function to get first-of-month reports (current month's first to previous month's first)
function getMonthlyDataFiles() {
  // Handle both running from project root and from analysis directory
  const dataDir = fs.existsSync('./public/data') ? './public/data' : '../public/data';
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length < 2) {
    throw new Error('Need at least 2 data files to compare');
  }
  
  // Find first-of-month reports, prioritizing day 1, then day 2-3 for weekends
  const firstOfMonthFiles = files.filter(file => {
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      const dayOfMonth = date.getDate();
      return dayOfMonth >= 1 && dayOfMonth <= 3; // First 3 days of month
    }
    return false;
  });
  
  if (firstOfMonthFiles.length < 2) {
    throw new Error('Need at least 2 first-of-month reports to compare');
  }
  
  // Group by month and pick the earliest day in each month
  const monthlyFiles = {};
  firstOfMonthFiles.forEach(file => {
    const dateMatch = file.match(/(\d{4}-\d{2})/);
    if (dateMatch) {
      const monthKey = dateMatch[1]; // YYYY-MM
      if (!monthlyFiles[monthKey] || file < monthlyFiles[monthKey]) {
        monthlyFiles[monthKey] = file; // Keep earliest file in month (lowest day)
      }
    }
  });
  
  const monthKeys = Object.keys(monthlyFiles).sort().reverse();
  if (monthKeys.length < 2) {
    throw new Error('Need at least 2 months of first-of-month reports to compare');
  }
  
  const currentMonthFirst = monthlyFiles[monthKeys[0]]; // Most recent month
  const previousMonthFirst = monthlyFiles[monthKeys[1]]; // Previous month
  
  return {
    latest: currentMonthFirst,
    monthAgo: previousMonthFirst,
    latestPath: path.join(dataDir, currentMonthFirst),
    monthAgoPath: path.join(dataDir, previousMonthFirst)
  };
}

// Generate monthly post
function generateMonthlyPost() {
  const files = getMonthlyDataFiles();
  console.log(`Comparing ${files.latest} vs ${files.monthAgo}\n`);
  
  const currentData = JSON.parse(fs.readFileSync(files.latestPath));
  const monthAgoData = JSON.parse(fs.readFileSync(files.monthAgoPath));
  
  // Validate data structure
  if (!currentData.analyses || !monthAgoData.analyses) {
    throw new Error('Invalid data structure: missing analyses array');
  }
  if (currentData.analyses.length < 4 || monthAgoData.analyses.length < 4) {
    throw new Error('Invalid data structure: insufficient analysis bands');
  }
  
  const current1500 = currentData.analyses[3]; // Broad investors group
  const monthAgo1500 = monthAgoData.analyses[3];
  const current100 = currentData.analyses[0]; // Most copied investors
  const monthAgo100 = monthAgoData.analyses[0];
  
  // Extract dates and convert to month names
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const currentDateStr = files.latest.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
  const previousDateStr = files.monthAgo.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
  
  // For monthly report, show the month being analyzed (the most recent month)
  const reportMonth = currentDateStr ? monthNames[new Date(currentDateStr).getMonth()] : 'Current';
  const compareMonth = previousDateStr ? monthNames[new Date(previousDateStr).getMonth()] : 'Previous';
  
  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗥𝗲𝗽𝗼𝗿𝘁 🎩');
  console.log(`${reportMonth} 2025 (vs ${compareMonth})\n`);
  
  // Most Copied vs Broad Group Monthly Changes
  console.log('🎩 𝗧𝗼𝗽 𝟭𝟬𝟬 𝘃𝘀 𝗔𝗹𝗹 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀:');
  
  // Cash Holdings
  const cash100Change = current100.averages.cashPercentage - monthAgo100.averages.cashPercentage;
  const cash1500Change = current1500.averages.cashPercentage - monthAgo1500.averages.cashPercentage;
  console.log('• 𝗖𝗮𝘀𝗵 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀:');
  console.log('  - Top 100: ' + current100.averages.cashPercentage.toFixed(1) + '% (was ' + 
    monthAgo100.averages.cashPercentage.toFixed(1) + '%, ' + (cash100Change > 0 ? '+' : '') + cash100Change.toFixed(1) + 'pp)');
  console.log('  - All Investors: ' + current1500.averages.cashPercentage.toFixed(1) + '% (was ' + 
    monthAgo1500.averages.cashPercentage.toFixed(1) + '%, ' + (cash1500Change > 0 ? '+' : '') + cash1500Change.toFixed(1) + 'pp)');
  
  // Risk Score
  const risk100Change = current100.averages.riskScore - monthAgo100.averages.riskScore;
  const risk1500Change = current1500.averages.riskScore - monthAgo1500.averages.riskScore;
  console.log('• 𝗲𝘁𝗼𝗿𝗼 𝗥𝗶𝘀𝗸 𝗦𝗰𝗼𝗿𝗲:');
  console.log('  - Top 100: ' + current100.averages.riskScore.toFixed(1) + ' (was ' + 
    monthAgo100.averages.riskScore.toFixed(1) + ', ' + (risk100Change > 0 ? '+' : '') + risk100Change.toFixed(2) + ')');
  console.log('  - All Investors: ' + current1500.averages.riskScore.toFixed(1) + ' (was ' + 
    monthAgo1500.averages.riskScore.toFixed(1) + ', ' + (risk1500Change > 0 ? '+' : '') + risk1500Change.toFixed(2) + ')');
  
  // YTD Performance
  const gain100Change = current100.averages.gain - monthAgo100.averages.gain;
  const gain1500Change = current1500.averages.gain - monthAgo1500.averages.gain;
  console.log('• 𝗬𝗧𝗗 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲:');
  console.log('  - Top 100: ' + current100.averages.gain.toFixed(1) + '% (was ' + 
    monthAgo100.averages.gain.toFixed(1) + '%, ' + (gain100Change > 0 ? '+' : '') + gain100Change.toFixed(1) + 'pp)');
  console.log('  - All Investors: ' + current1500.averages.gain.toFixed(1) + '% (was ' + 
    monthAgo1500.averages.gain.toFixed(1) + '%, ' + (gain1500Change > 0 ? '+' : '') + gain1500Change.toFixed(1) + 'pp)');
  
  // Monthly Copier Changes for Top 100 Group
  if (currentData.investors && monthAgoData.investors && currentData.investors.length >= 100 && monthAgoData.investors.length >= 100) {
    const copierChanges = [];
    
    currentData.investors.slice(0, 100).forEach(currentInv => {
      const prevInv = monthAgoData.investors.find(p => p.userName === currentInv.userName);
      if (prevInv) {
        const copierChange = currentInv.copiers - prevInv.copiers;
        if (Math.abs(copierChange) >= 50) { // Higher threshold for monthly changes
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
        console.log('\n📈 𝐌𝐨𝐬𝐭 𝐂𝐨𝐩𝐢𝐞𝐫𝐬 𝐀𝐝𝐝𝐞𝐝 (𝐌𝐨𝐧𝐭𝐡):');
        gainers.forEach((g, i) => {
          console.log((i+1) + '. ' + (g.investor.fullName || g.investor.userName) + ' (@' + g.investor.userName + '): (' + 
            g.investor.copiers.toLocaleString() + ' ↑' + g.change.toLocaleString() + ')');
        });
      }
      
      if (losers.length > 0) {
        console.log('\n📉 𝐌𝐨𝐬𝐭 𝐂𝐨𝐩𝐢𝐞𝐫𝐬 𝐋𝐨𝐬𝐭 (𝐌𝐨𝐧𝐭𝐡):');
        losers.forEach((l, i) => {
          console.log((i+1) + '. ' + (l.investor.fullName || l.investor.userName) + ' (@' + l.investor.userName + '): (' + 
            l.investor.copiers.toLocaleString() + ' ↓' + Math.abs(l.change).toLocaleString() + ')');
        });
      }
    }
  }
  
  console.log('\n');
  
  // Top Holdings Changes - Top 100
  console.log('💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗧𝗼𝗽 𝟭𝟬𝟬 (𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲):');
  current100.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = monthAgo100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : h.holdersCount;
    const percentOfInvestors = (h.holdersCount / 100 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + changeText + ')');
  });
  
  // Top Holdings Changes - All Investors
  console.log('\n💎 𝗧𝗼𝗽 𝟭𝟬 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀 - 𝗔𝗹𝗹 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀 (𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲):');
  current1500.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = monthAgo1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : h.holdersCount;
    const percentOfInvestors = (h.holdersCount / 1500 * 100).toFixed(1);
    const changeText = holderChange === 0 ? '--' : (holderChange > 0 ? '↑' : '↓') + Math.abs(holderChange);
    
    console.log((i+1) + '. $' + h.symbol + ': ' + percentOfInvestors + '% of investors (' + changeText + ')');
  });
  
  // Biggest monthly moves
  console.log('\n🔎 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗠𝗼𝘃𝗲𝘀:');
  
  const monthlyMovers100 = [];
  current100.topHoldings.slice(0, 50).forEach(h => {
    const monthAgoHolding = monthAgo100.topHoldings.find(mh => mh.instrumentId === h.instrumentId);
    if (monthAgoHolding) {
      const change = h.holdersCount - monthAgoHolding.holdersCount;
      if (Math.abs(change) >= 3) { // Threshold for top 100
        monthlyMovers100.push({
          symbol: h.symbol,
          change: change,
          current: h.holdersCount,
          percentChange: (change / monthAgoHolding.holdersCount) * 100
        });
      }
    }
  });
  
  const monthlyMovers1500 = [];
  current1500.topHoldings.slice(0, 50).forEach(h => {
    const monthAgoHolding = monthAgo1500.topHoldings.find(mh => mh.instrumentId === h.instrumentId);
    if (monthAgoHolding) {
      const change = h.holdersCount - monthAgoHolding.holdersCount;
      if (Math.abs(change) >= 20) { // Threshold for broad group
        monthlyMovers1500.push({
          symbol: h.symbol,
          change: change,
          current: h.holdersCount,
          percentChange: (change / monthAgoHolding.holdersCount) * 100
        });
      }
    }
  });
  
  monthlyMovers100.sort((a, b) => b.change - a.change);
  monthlyMovers1500.sort((a, b) => b.change - a.change);
  
  // Most Copied moves
  if (monthlyMovers100.length > 0) {
    const added100 = monthlyMovers100.filter(m => m.change > 0).slice(0, 3);
    const dropped100 = monthlyMovers100.filter(m => m.change < 0).slice(0, 3);
    
    if (added100.length > 0) {
      console.log('\n𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱 - 𝗧𝗼𝗽 𝟭𝟬𝟬:');
      added100.forEach(m => {
        console.log('• $' + m.symbol + ': +' + m.change + ' investors (+' + 
          m.percentChange.toFixed(1) + '%), now ' + m.current);
      });
    }
    
    if (dropped100.length > 0) {
      console.log('\n𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱 - 𝗧𝗼𝗽 𝟭𝟬𝟬:');
      dropped100.forEach(m => {
        console.log('• $' + m.symbol + ': ' + m.change + ' investors (' + 
          m.percentChange.toFixed(1) + '%), now ' + m.current);
      });
    }
  }
  
  // Broad Group moves
  if (monthlyMovers1500.length > 0) {
    const added1500 = monthlyMovers1500.filter(m => m.change > 0).slice(0, 3);
    const dropped1500 = monthlyMovers1500.filter(m => m.change < 0).slice(0, 3);
    
    if (added1500.length > 0) {
      console.log('\n𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱 - 𝗔𝗹𝗹 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀:');
      added1500.forEach(m => {
        console.log('• $' + m.symbol + ': +' + m.change + ' investors (+' + 
          m.percentChange.toFixed(1) + '%), now ' + m.current);
      });
    }
    
    if (dropped1500.length > 0) {
      console.log('\n𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱 - 𝗔𝗹𝗹 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀:');
      dropped1500.forEach(m => {
        console.log('• $' + m.symbol + ': ' + m.change + ' investors (' + 
          m.percentChange.toFixed(1) + '%), now ' + m.current);
      });
    }
  }
  
  // Monthly Insights Section
  console.log('\n💡 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗜𝗻𝘀𝗶𝗴𝗵𝘁𝘀:');
  
  // Risk sentiment insight
  if (cash100Change > 0.5 && cash1500Change > 0.5) {
    console.log('• 𝗗𝗲𝗳𝗲𝗻𝘀𝗶𝘃𝗲 𝗦𝗵𝗶𝗳𝘁: Both groups increased cash holdings, signaling market caution');
  } else if (cash100Change < -0.5 && cash1500Change < -0.5) {
    console.log('• 𝗥𝗶𝘀𝗸-𝗢𝗻 𝗠𝗼𝗼𝗱: Both groups reduced cash, deploying capital into markets');
  } else if (Math.abs(cash100Change - cash1500Change) > 1) {
    const divergence = cash100Change > cash1500Change ? 'Top 100 more defensive' : 'All Investors more defensive';
    console.log('• 𝗗𝗶𝘃𝗲𝗿𝗴𝗲𝗻𝗰𝗲: ' + divergence + ' than the other');
  }
  
  // Performance gap insight
  const perfGap = current100.averages.gain - current1500.averages.gain;
  const prevPerfGap = monthAgo100.averages.gain - monthAgo1500.averages.gain;
  if (perfGap > prevPerfGap + 0.5) {
    console.log('• 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗚𝗮𝗽 𝗪𝗶𝗱𝗲𝗻𝗶𝗻𝗴: Top 100 investors pulling further ahead');
  } else if (perfGap < prevPerfGap - 0.5) {
    console.log('• 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗖𝗼𝗻𝘃𝗲𝗿𝗴𝗲𝗻𝗰𝗲: All investors catching up to top 100');
  }
  
  // Win ratio insight
  const winRatio100Change = current100.averages.winRatio - monthAgo100.averages.winRatio;
  const winRatio1500Change = current1500.averages.winRatio - monthAgo1500.averages.winRatio;
  if (winRatio100Change > 2) {
    console.log('• 𝗧𝗼𝗽 𝟭𝟬𝟬 𝗦𝗸𝗶𝗹𝗹 𝗨𝗽: Top 100 win ratio improved by ' + winRatio100Change.toFixed(1) + 'pp');
  } else if (winRatio100Change < -2) {
    console.log('• 𝗧𝗿𝗮𝗱𝗶𝗻𝗴 𝗖𝗵𝗮𝗹𝗹𝗲𝗻𝗴𝗲𝘀: Top 100 win ratio declined by ' + Math.abs(winRatio100Change).toFixed(1) + 'pp');
  }
  
  // Market trend insight based on biggest movers
  const allMonthlyMovers = [...monthlyMovers100, ...monthlyMovers1500];
  if (allMonthlyMovers.length > 0) {
    const techMovers = allMonthlyMovers.filter(m => 
      ['NVDA', 'MSFT', 'GOOG', 'META', 'AMZN', 'AAPL', 'AMD', 'TSM'].includes(m.symbol)
    );
    const cryptoMovers = allMonthlyMovers.filter(m => 
      ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'].includes(m.symbol)
    );
    
    if (techMovers.filter(m => m.change > 0).length > 3) {
      console.log('• 𝗧𝗲𝗰𝗵 𝗥𝗼𝘁𝗮𝘁𝗶𝗼𝗻: Strong accumulation in technology stocks');
    }
    if (cryptoMovers.filter(m => m.change > 0).length >= 2) {
      console.log('• 𝗖𝗿𝘆𝗽𝘁𝗼 𝗔𝗱𝗼𝗽𝘁𝗶𝗼𝗻: Increased crypto exposure among popular investors');
    }
  }
  
  console.log('\n**\n');
  console.log('Check out the census dashboard at:\n');
  console.log('weirdapps.github.io/etoro_census');
  console.log('\n..updated daily at 02:00 UTC');
}

// Run the monthly post generation
try {
  generateMonthlyPost();
} catch (error) {
  console.error('Error:', error.message);
}