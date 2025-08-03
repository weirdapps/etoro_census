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
  
  // For monthly report, show the month of changes being reported
  // If comparing July 1st vs June 1st, we're reporting on changes during June
  // The report month is the month that elapsed between the two data points
  const currentDate = currentDateStr ? new Date(currentDateStr) : null;
  const previousDate = previousDateStr ? new Date(previousDateStr) : null;
  
  // The report covers the month between previous and current data points
  let reportMonth = 'Current';
  if (currentDate && previousDate) {
    // The month being reported is the month that just completed
    // If current is July 1st and previous is June 1st, we're reporting on June
    const reportMonthIndex = previousDate.getMonth();
    reportMonth = monthNames[reportMonthIndex];
  }
  
  console.log('🎩 𝐞𝐓𝐨𝐫𝐨 𝐂𝐞𝐧𝐬𝐮𝐬 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐑𝐞𝐩𝐨𝐫𝐭 🎩');
  console.log(`${reportMonth} 2025`);
  console.log('Top 100 vs Broad (1500) Popular Investors Analysis\n');
  
  // Calculate key monthly changes
  const cash100Change = current100.averages.cashPercentage - monthAgo100.averages.cashPercentage;
  const cash1500Change = current1500.averages.cashPercentage - monthAgo1500.averages.cashPercentage;
  const gain100Change = current100.averages.gain - monthAgo100.averages.gain;
  const gain1500Change = current1500.averages.gain - monthAgo1500.averages.gain;
  
  // 1. Monthly Performance Comparison
  console.log('📊 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐏𝐞𝐫𝐟𝐨𝐫𝐦𝐚𝐧𝐜𝐞:');
  console.log('**Top 100**: ' + current100.averages.gain.toFixed(1) + '% YTD (' + 
    (gain100Change > 0 ? '+' : '') + gain100Change.toFixed(1) + 'pp monthly)');
  console.log('**Broad Group**: ' + current1500.averages.gain.toFixed(1) + '% YTD (' + 
    (gain1500Change > 0 ? '+' : '') + gain1500Change.toFixed(1) + 'pp monthly)');
  console.log('**Elite advantage**: +' + (current100.averages.gain - current1500.averages.gain).toFixed(1) + 'pp');
  
  console.log('\n💰 𝐂𝐚𝐬𝐡 𝐏𝐨𝐬𝐢𝐭𝐢𝐨𝐧 𝐂𝐡𝐚𝐧𝐠𝐞𝐬:');
  console.log('**Top 100**: ' + current100.averages.cashPercentage.toFixed(1) + '% (' + 
    (cash100Change > 0 ? '+' : '') + cash100Change.toFixed(1) + 'pp monthly)');
  console.log('**Broad Group**: ' + current1500.averages.cashPercentage.toFixed(1) + '% (' + 
    (cash1500Change > 0 ? '+' : '') + cash1500Change.toFixed(1) + 'pp monthly)\n');
  
  // 2. Top Portfolio Holdings
  console.log('💎 𝐓𝐨𝐩 𝟏𝟎 𝐏𝐨𝐫𝐭𝐟𝐨𝐥𝐢𝐨 𝐇𝐨𝐥𝐝𝐢𝐧𝐠𝐬:');
  console.log('**Top 100 Elite**:');
  current100.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = monthAgo100.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeText = holderChange === 0 ? '→' : (holderChange > 0 ? '↑' + holderChange : '↓' + Math.abs(holderChange));
    const percentage = (h.holdersCount / 100 * 100).toFixed(0);
    console.log((i+1) + '. $' + h.symbol + ' (' + percentage + '% ' + changeText + ')');
  });
  
  console.log('\n**Broad Group**:');
  current1500.topHoldings.slice(0, 10).forEach((h, i) => {
    const prevHolding = monthAgo1500.topHoldings.find(ph => ph.instrumentId === h.instrumentId);
    const holderChange = prevHolding ? h.holdersCount - prevHolding.holdersCount : 0;
    const changeText = holderChange === 0 ? '→' : (holderChange > 0 ? '↑' + holderChange : '↓' + Math.abs(holderChange));
    const percentage = (h.holdersCount / 1500 * 100).toFixed(0);
    console.log((i+1) + '. $' + h.symbol + ' (' + percentage + '% ' + changeText + ')');
  });
  
  console.log('\n');
  
  // 3. Biggest Monthly Asset Moves  
  const monthlyMovers100 = [];
  current100.topHoldings.slice(0, 50).forEach(h => {
    const monthAgoHolding = monthAgo100.topHoldings.find(mh => mh.instrumentId === h.instrumentId);
    if (monthAgoHolding) {
      const change = h.holdersCount - monthAgoHolding.holdersCount;
      if (Math.abs(change) >= 3) {
        monthlyMovers100.push({
          symbol: h.symbol,
          change: change,
          percentChange: (change / monthAgoHolding.holdersCount) * 100,
          current: h.holdersCount
        });
      }
    }
  });
  
  const monthlyMovers1500 = [];
  current1500.topHoldings.slice(0, 50).forEach(h => {
    const monthAgoHolding = monthAgo1500.topHoldings.find(mh => mh.instrumentId === h.instrumentId);
    if (monthAgoHolding) {
      const change = h.holdersCount - monthAgoHolding.holdersCount;
      if (Math.abs(change) >= 20) {
        monthlyMovers1500.push({
          symbol: h.symbol,
          change: change,
          percentChange: (change / monthAgoHolding.holdersCount) * 100,
          current: h.holdersCount
        });
      }
    }
  });
  
  console.log('🚀 𝐁𝐢𝐠𝐠𝐞𝐬𝐭 𝐀𝐬𝐬𝐞𝐭 𝐌𝐨𝐯𝐞𝐬:');
  
  // Top 100 moves
  if (monthlyMovers100.length > 0) {
    const additions100 = monthlyMovers100.filter(m => m.change > 0).slice(0, 5);
    const reductions100 = monthlyMovers100.filter(m => m.change < 0).slice(0, 5);
    
    if (additions100.length > 0) {
      console.log('**Top 100 - Most Added**:');
      additions100.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': +' + move.change + ' investors (+' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
    
    if (reductions100.length > 0) {
      console.log('\n**Top 100 - Most Reduced**:');
      reductions100.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  // Broad Group moves
  if (monthlyMovers1500.length > 0) {
    const additions1500 = monthlyMovers1500.filter(m => m.change > 0).slice(0, 5);
    const reductions1500 = monthlyMovers1500.filter(m => m.change < 0).slice(0, 5);
    
    if (additions1500.length > 0) {
      console.log('\n**Broad Group - Most Added**:');
      additions1500.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': +' + move.change + ' investors (+' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
    
    if (reductions1500.length > 0) {
      console.log('\n**Broad Group - Most Reduced**:');
      reductions1500.forEach((move, i) => {
        console.log((i+1) + '. $' + move.symbol + ': ' + move.change + ' investors (' + 
          move.percentChange.toFixed(1) + '%)');
      });
    }
  }
  
  if (monthlyMovers100.length === 0 && monthlyMovers1500.length === 0) {
    console.log('Minimal portfolio repositioning this month - investors maintained core positions');
  }
  
  // 4. Top Copier Changes
  console.log('\n📈 𝐓𝐨𝐩 𝐂𝐨𝐩𝐢𝐞𝐫 𝐂𝐡𝐚𝐧𝐠𝐞𝐬:');
  
  if (currentData.investors && monthAgoData.investors && currentData.investors.length >= 100 && monthAgoData.investors.length >= 100) {
    const copierChanges = [];
    
    currentData.investors.slice(0, 100).forEach(currentInv => {
      const prevInv = monthAgoData.investors.find(p => p.userName === currentInv.userName);
      if (prevInv) {
        const copierChange = currentInv.copiers - prevInv.copiers;
        if (Math.abs(copierChange) >= 25) {
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
        console.log('🚀 **Top 5 Gainers**:');
        gainers.forEach((change, i) => {
          console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
            ' (@' + change.investor.userName + '): +' + change.change.toLocaleString() + ' copiers');
        });
      }
      
      if (losers.length > 0) {
        console.log('\n📉 **Top 5 Losers**:');
        losers.forEach((change, i) => {
          console.log((i+1) + '. ' + (change.investor.fullName || change.investor.userName) + 
            ' (@' + change.investor.userName + '): ' + change.change.toLocaleString() + ' copiers');
        });
      }
    } else {
      console.log('Stable copier dynamics - minimal monthly changes in investor following');
    }
  }

  // 5. Hot Hands Investor Profile
  console.log('\n🔥 𝐇𝐨𝐭 𝐇𝐚𝐧𝐝𝐬 𝐈𝐧𝐯𝐞𝐬𝐭𝐨𝐫:');
  
  // Find investor with strong recent performance and momentum
  let hotHands = null;
  if (currentData.investors && monthAgoData.investors && currentData.investors.length >= 100) {
    const hotCandidates = currentData.investors.slice(0, 100).map(inv => {
      const prevInv = monthAgoData.investors.find(p => p.userName === inv.userName);
      const copierGrowth = prevInv ? inv.copiers - prevInv.copiers : 0;
      const score = inv.gain + (copierGrowth * 0.005); // Performance + monthly copier momentum
      return { ...inv, copierGrowth, hotScore: score };
    }).filter(inv => inv.gain > 15 && inv.copierGrowth > 25)
      .sort((a, b) => b.hotScore - a.hotScore);
    
    hotHands = hotCandidates[0];
  }
  
  if (hotHands) {
    console.log('⭐ ' + (hotHands.fullName || hotHands.userName) + ' (@' + hotHands.userName + ')');
    console.log('• ' + hotHands.gain.toFixed(1) + '% YTD | +' + hotHands.copierGrowth + ' copiers this month');
    console.log('• ' + hotHands.copiers.toLocaleString() + ' total copiers | Risk ' + hotHands.riskScore + '/10');
    console.log('• Exceptional momentum combining strong performance with surging following');
  } else {
    console.log('No standout momentum plays this month - performance and copier growth dispersed');
  }

  // 6. Key Monthly Insight
  console.log('\n💡 𝐊𝐞𝐲 𝐌𝐨𝐧𝐭𝐡𝐥𝐲 𝐈𝐧𝐬𝐢𝐠𝐡𝐭:');
  
  let insight = '';
  const gainGap = current100.averages.gain - current1500.averages.gain;
  
  if (Math.abs(cash100Change - cash1500Change) > 1) {
    const direction = cash100Change > cash1500Change ? 'more defensive' : 'more aggressive';
    insight = 'Elite investors turned ' + direction + ' than broad market - monthly behavioral divergence';
  } else if (Math.abs(gain100Change) > 3) {
    const direction = gain100Change > 0 ? 'surged' : 'declined';
    insight = 'Elite performance ' + direction + ' ' + Math.abs(gain100Change).toFixed(1) + 'pp this month - significant movement';
  } else if (monthlyMovers100.length > 5 || monthlyMovers1500.length > 5) {
    insight = 'Active monthly repositioning signals strategic shifts in market positioning';
  } else if (Math.abs(gainGap) > 5) {
    insight = 'Elite advantage commanding at ' + gainGap.toFixed(1) + 'pp - substantial skill premium persists';
  } else {
    insight = 'Stable month with aligned behavior between elite and broad investor groups';
  }
  
  console.log(insight);
  
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