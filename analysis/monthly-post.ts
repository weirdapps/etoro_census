/**
 * Monthly Post Generator - Enhanced Format
 * Aligned with daily and weekly post styles with comprehensive monthly insights
 */

import {
  getMonthlyDataFiles,
  loadDataFile,
  formatPercentage,
  formatNumber,
  findDailyMovers,
  findTopCopierChanges,
  createInstrumentMap,
  getAssetInfo
} from './lib/utils';
import type { Analysis, Holding, Investor } from './lib/types';

interface AnalysisAverages {
  cashPercentage: number;
  riskScore: number;
  gain: number;
  trades: number;
  winRatio: number;
}

interface ExtendedAnalysis extends Analysis {
  averages: AnalysisAverages;
  topHoldings: ExtendedHolding[];
}

interface ExtendedHolding extends Holding {
  holdersPercentage?: number;
}

function generateMonthlyPost(): void {
  const files = getMonthlyDataFiles();
  console.log(`Monthly analysis: ${files.monthAgo} to ${files.latest}\n`);

  const currentData = loadDataFile(files.latestPath);
  const monthAgoData = loadDataFile(files.monthAgoPath);

  const current1500 = currentData.analyses[3] as ExtendedAnalysis;
  const current100 = currentData.analyses[0] as ExtendedAnalysis;
  const monthAgo1500 = monthAgoData.analyses[3] as ExtendedAnalysis;
  const monthAgo100 = monthAgoData.analyses[0] as ExtendedAnalysis;

  const currentDateMatch = files.latest.match(/(\d{4}-\d{2}-\d{2})/);
  const monthAgoDateMatch = files.monthAgo.match(/(\d{4}-\d{2}-\d{2})/);
  const currentDate = currentDateMatch ? currentDateMatch[1] : 'Current';
  const monthAgoDate = monthAgoDateMatch ? monthAgoDateMatch[1] : 'Month Ago';

  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗠𝗼𝗻𝘁𝗵𝗹𝘆 𝗥𝗲𝗽𝗼𝗿𝘁 (' + monthAgoDate + ' → ' + currentDate + ') 🎩');

  console.log('');
  console.log('📊 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗖𝗼𝗺𝗽𝗮𝗿𝗶𝘀𝗼𝗻:');
  console.log('');
  const perfChange100 = current100.averages.gain - monthAgo100.averages.gain;
  const perfChange1500 = current1500.averages.gain - monthAgo1500.averages.gain;
  const top100Advantage = current100.averages.gain - current1500.averages.gain;

  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.gain.toFixed(1) + '% YTD (' +
    formatPercentage(perfChange100) + ' monthly)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.gain.toFixed(1) + '% YTD (' +
    formatPercentage(perfChange1500) + ' monthly)');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘁𝗮𝗴𝗲: ' + formatPercentage(top100Advantage, 1) + 'pp');

  console.log('');
  console.log('💰 𝗖𝗮𝘀𝗵 𝗣𝗼𝘀𝗶𝘁𝗶𝗼𝗻𝗶𝗻𝗴 & 𝗥𝗶𝘀𝗸:');
  console.log('');
  const cashChange100 = current100.averages.cashPercentage - monthAgo100.averages.cashPercentage;
  const cashChange1500 = current1500.averages.cashPercentage - monthAgo1500.averages.cashPercentage;
  const riskChange100 = current100.averages.riskScore - monthAgo100.averages.riskScore;
  const riskChange1500 = current1500.averages.riskScore - monthAgo1500.averages.riskScore;

  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: Cash ' + current100.averages.cashPercentage.toFixed(1) + '% (' +
    formatPercentage(cashChange100) + ') | Risk ' + current100.averages.riskScore.toFixed(1) +
    ' (' + formatPercentage(riskChange100) + ')');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: Cash ' + current1500.averages.cashPercentage.toFixed(1) + '% (' +
    formatPercentage(cashChange1500) + ') | Risk ' + current1500.averages.riskScore.toFixed(1) +
    ' (' + formatPercentage(riskChange1500) + ')');

  const avgCashChange = (cashChange100 + cashChange1500) / 2;

  console.log('');
  console.log('📊 𝗧𝗿𝗮𝗱𝗶𝗻𝗴 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆:');
  console.log('');
  const tradesChange100 = current100.averages.trades - monthAgo100.averages.trades;
  const tradesChange1500 = current1500.averages.trades - monthAgo1500.averages.trades;
  const winRatioChange100 = current100.averages.winRatio - monthAgo100.averages.winRatio;
  const winRatioChange1500 = current1500.averages.winRatio - monthAgo1500.averages.winRatio;

  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange100 > 0 ? '+' : '') + tradesChange100.toFixed(0) + ' monthly) | Win ' +
    current100.averages.winRatio.toFixed(1) + '% (' + formatPercentage(winRatioChange100) + ')');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange1500 > 0 ? '+' : '') + tradesChange1500.toFixed(0) + ' monthly) | Win ' +
    current1500.averages.winRatio.toFixed(1) + '% (' + formatPercentage(winRatioChange1500) + ')');

  console.log('');
  console.log('💎 𝗧𝗼𝗽 𝟭𝟬 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀:');
  console.log('');

  const instrumentMap = createInstrumentMap(currentData);

  const holdings100 = current100.topHoldings.slice(0, 10);
  const monthAgoHoldings100 = monthAgo100.topHoldings.slice(0, 10);

  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬:');
  holdings100.forEach((holding, i) => {
    const asset = getAssetInfo(holding.instrumentId, instrumentMap);
    const monthAgoHolding = monthAgoHoldings100.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = monthAgoHolding ? holding.holdersCount - monthAgoHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '+' : holderChange < 0 ? '-' : '=';

    console.log(`${i+1}. $${asset.symbol} (${holding.holdersCount}% ${changeIcon}${Math.abs(holderChange)})`);
  });

  console.log('');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  const holdings1500 = current1500.topHoldings.slice(0, 10);
  const monthAgoHoldings1500 = monthAgo1500.topHoldings.slice(0, 10);

  holdings1500.forEach((holding, i) => {
    const asset = getAssetInfo(holding.instrumentId, instrumentMap);
    const monthAgoHolding = monthAgoHoldings1500.find(h => h.instrumentId === holding.instrumentId);
    const holderChange = monthAgoHolding ? holding.holdersCount - monthAgoHolding.holdersCount : 0;
    const changeIcon = holderChange > 0 ? '+' : holderChange < 0 ? '-' : '=';
    const extHolding = holding as ExtendedHolding;
    const percentage = extHolding.holdersPercentage || (holding.holdersCount / 15 || 0);

    console.log(`${i+1}. $${asset.symbol} (${percentage.toFixed(0)}% ${changeIcon}${Math.abs(holderChange)})`);
  });

  console.log('');
  console.log('🚀 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗔𝘀𝘀𝗲𝘁 𝗠𝗼𝘃𝗲𝘀:');
  console.log('');

  const monthlyMovers100 = findDailyMovers(current100.topHoldings, monthAgo100.topHoldings, 3);
  const monthlyMovers1500 = findDailyMovers(current1500.topHoldings, monthAgo1500.topHoldings, 10);

  if (monthlyMovers100.length > 0) {
    const additions100 = monthlyMovers100.filter(m => m.change > 0).slice(0, 5);
    const drops100 = monthlyMovers100.filter(m => m.change < 0).slice(0, 5);

    if (additions100.length > 0) {
      console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions100.forEach(m => {
        console.log(`• $${m.symbol}: +${m.change} investors (${formatPercentage(m.percentChange)})`);
      });
    }

    if (drops100.length > 0) {
      console.log('');
      console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱:');
      drops100.forEach(m => {
        console.log(`• $${m.symbol}: ${m.change} investors (${m.percentChange.toFixed(1)}%)`);
      });
    }
  }

  if (monthlyMovers1500.length > 0) {
    const additions1500 = monthlyMovers1500.filter(m => m.change > 0).slice(0, 5);
    const drops1500 = monthlyMovers1500.filter(m => m.change < 0).slice(0, 5);

    if (additions1500.length > 0) {
      console.log('');
      console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      additions1500.forEach(m => {
        console.log(`• $${m.symbol}: +${m.change} investors (${formatPercentage(m.percentChange)})`);
      });
    }

    if (drops1500.length > 0) {
      console.log('');
      console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗗𝗿𝗼𝗽𝗽𝗲𝗱:');
      drops1500.forEach(m => {
        console.log(`• $${m.symbol}: ${m.change} investors (${m.percentChange.toFixed(1)}%)`);
      });
    }
  }

  console.log('');
  console.log('👥 𝗖𝗼𝗽𝗶𝗲𝗿 𝗔𝗰𝘁𝗶𝘃𝗶𝘁𝘆 (𝗠𝗼𝗻𝘁𝗵𝗹𝘆):');
  console.log('');

  const copierChanges = findTopCopierChanges(currentData.investors, monthAgoData.investors, 50);
  const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  if (gainers.length > 0) {
    console.log('');
    console.log('𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀 (≥50 copiers):');
    gainers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${formatNumber(change.investor.copiers)} +${change.change})`);
    });
  }

  if (losers.length > 0) {
    console.log('');
    console.log('𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀 (≥50 copiers):');
    losers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${formatNumber(change.investor.copiers)} -${Math.abs(change.change)})`);
    });
  }

  console.log('');
  console.log('🌟 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿 𝗦𝗽𝗼𝘁𝗹𝗶𝗴𝗵𝘁:');
  console.log('');

  const topPerformers = currentData.investors
    .filter((inv: Investor) => inv.gain !== null && inv.copiers >= 100)
    .sort((a: Investor, b: Investor) => {
      const aPrev = monthAgoData.investors.find((p: Investor) => p.userName === a.userName);
      const bPrev = monthAgoData.investors.find((p: Investor) => p.userName === b.userName);
      const aGain = aPrev ? a.gain - aPrev.gain : 0;
      const bGain = bPrev ? b.gain - bPrev.gain : 0;
      return bGain - aGain;
    })
    .slice(0, 1);

  if (topPerformers.length > 0) {
    const investor = topPerformers[0];
    const prevInvestor = monthAgoData.investors.find((p: Investor) => p.userName === investor.userName);
    const monthlyGain = prevInvestor ? investor.gain - prevInvestor.gain : 0;
    const name = investor.fullName || investor.userName;

    console.log(`🏆 ${name} (@${investor.userName})`);
    console.log(`• Monthly Gain: ${formatPercentage(monthlyGain)}`);
    console.log(`• YTD Performance: ${investor.gain.toFixed(1)}%`);
    console.log(`• Copiers: ${formatNumber(investor.copiers)}`);
    console.log(`• Win Ratio: ${investor.winRatio ? investor.winRatio.toFixed(1) + '%' : 'N/A'}`);
  }

  console.log('');
  console.log('💡 𝗞𝗲𝘆 𝗧𝗮𝗸𝗲𝗮𝘄𝗮𝘆𝘀:');
  console.log('');

  const takeaways: string[] = [];

  if (avgCashChange > 3) {
    takeaways.push('• Market in defensive mode - cash levels rising significantly');
  } else if (avgCashChange < -3) {
    takeaways.push('• Risk-on sentiment driving aggressive capital deployment');
  }

  if (Math.abs(perfChange100 - perfChange1500) > 3) {
    const leader = perfChange100 > perfChange1500 ? 'Top 100' : 'Broad group';
    takeaways.push(`• ${leader} significantly outperformed this month (${Math.abs(perfChange100 - perfChange1500).toFixed(1)}pp gap)`);
  }

  const topHolding100 = holdings100[0];
  if (topHolding100 && topHolding100.holdersCount > 60) {
    const asset = getAssetInfo(topHolding100.instrumentId, instrumentMap);
    takeaways.push(`• Extreme concentration in $${asset.symbol} among Top 100 (${topHolding100.holdersCount}% holders)`);
  }

  const avgTradesChange = (tradesChange100 + tradesChange1500) / 2;
  if (Math.abs(avgTradesChange) > 50) {
    const trend = avgTradesChange > 0 ? 'surge' : 'decline';
    takeaways.push(`• Major trading activity ${trend} signals ${avgTradesChange > 0 ? 'volatility expectations' : 'wait-and-see approach'}`);
  }

  const totalCopierChange = copierChanges.reduce((sum, c) => sum + c.change, 0);
  if (Math.abs(totalCopierChange) > 10000) {
    const trend = totalCopierChange > 0 ? 'growing confidence' : 'trust erosion';
    takeaways.push(`• Massive copier ${trend} - ${Math.abs(totalCopierChange).toLocaleString()} net change`);
  }

  takeaways.forEach(takeaway => console.log(takeaway));

  console.log('');
  console.log('**');
  console.log('');
  console.log('Check out the daily updated census dashboard at:');
  console.log('weirdapps.github.io/etoro_census');
  console.log('');
  console.log('Compare your portfolio to those of top investors at:');
  console.log('https://etoro-census.vercel.app');
}

try {
  generateMonthlyPost();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Error:', message);
}
