/**
 * Weekly Post Generator - Enhanced Format
 * Matches daily post style with weekly-specific insights
 */

import {
  getWeeklyDataFiles,
  loadDataFile,
  formatPercentage,
  formatNumber,
  findTopCopierChanges,
  createInstrumentMap,
  getAssetInfo,
  getPortfolioCoverage,
  adjustedPct,
  findPpMovers,
  GROUP_SIZES
} from './lib/utils';
import type { Analysis, Holding, CopierChange, AnalysisAverages } from './lib/types';

interface ExtendedAnalysis extends Omit<Analysis, 'averages' | 'topHoldings'> {
  averages: Required<Pick<AnalysisAverages, 'cashPercentage' | 'riskScore' | 'gain' | 'trades'>>;
  topHoldings: Holding[];
}

function generateWeeklyPost(): void {
  const files = getWeeklyDataFiles();
  console.log(`Weekly analysis: ${files.weekAgo} to ${files.latest}\n`);

  const currentData = loadDataFile(files.latestPath);
  const weekAgoData = loadDataFile(files.weekAgoPath);

  const current1500 = currentData.analyses[3] as ExtendedAnalysis;
  const current100 = currentData.analyses[0] as ExtendedAnalysis;
  const weekAgo1500 = weekAgoData.analyses[3] as ExtendedAnalysis;
  const weekAgo100 = weekAgoData.analyses[0] as ExtendedAnalysis;

  const cov = {
    cur100: getPortfolioCoverage(currentData, 0),
    cur1500: getPortfolioCoverage(currentData, 3),
    prev100: getPortfolioCoverage(weekAgoData, 0),
    prev1500: getPortfolioCoverage(weekAgoData, 3)
  };

  const currentDateMatch = files.latest.match(/(\d{4}-\d{2}-\d{2})/);
  const weekAgoDateMatch = files.weekAgo.match(/(\d{4}-\d{2}-\d{2})/);
  const currentDate = currentDateMatch ? currentDateMatch[1] : 'Current';
  const weekAgoDate = weekAgoDateMatch ? weekAgoDateMatch[1] : 'Week Ago';

  console.log('🎩 𝗲𝗧𝗼𝗿𝗼 𝗖𝗲𝗻𝘀𝘂𝘀 𝗪𝗲𝗲𝗸𝗹𝘆 𝗨𝗽𝗱𝗮𝘁𝗲 (' + weekAgoDate + ' → ' + currentDate + ') 🎩');

  console.log('');
  console.log('📈 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 𝗖𝗼𝗺𝗽𝗮𝗿𝗶𝘀𝗼𝗻:');
  console.log('');
  const perfChange100 = current100.averages.gain - weekAgo100.averages.gain;
  const perfChange1500 = current1500.averages.gain - weekAgo1500.averages.gain;
  const top100Advantage = current100.averages.gain - current1500.averages.gain;

  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.gain.toFixed(1) + '% YTD (' +
    formatPercentage(perfChange100) + ' weekly)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.gain.toFixed(1) + '% YTD (' +
    formatPercentage(perfChange1500) + ' weekly)');
  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 𝗮𝗱𝘃𝗮𝗻𝘁𝗮𝗴𝗲: ' + formatPercentage(top100Advantage, 1) + 'pp');

  console.log('');
  console.log('💰 𝗖𝗮𝘀𝗵 𝗣𝗼𝘀𝗶𝘁𝗶𝗼𝗻𝗶𝗻𝗴 & 𝐑𝐢𝐬𝐤:');
  console.log('');
  const cashChange100 = current100.averages.cashPercentage - weekAgo100.averages.cashPercentage;
  const cashChange1500 = current1500.averages.cashPercentage - weekAgo1500.averages.cashPercentage;
  const riskChange100 = current100.averages.riskScore - weekAgo100.averages.riskScore;
  const riskChange1500 = current1500.averages.riskScore - weekAgo1500.averages.riskScore;

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
  const tradesChange100 = current100.averages.trades - weekAgo100.averages.trades;
  const tradesChange1500 = current1500.averages.trades - weekAgo1500.averages.trades;

  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: ' + current100.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange100 > 0 ? '+' : '') + tradesChange100.toFixed(0) + ' weekly)');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: ' + current1500.averages.trades.toFixed(0) + ' trades (' +
    (tradesChange1500 > 0 ? '+' : '') + tradesChange1500.toFixed(0) + ' weekly)');

  console.log('');
  console.log('💎 𝗧𝗼𝗽 𝟭𝟬 𝗣𝗼𝗿𝘁𝗳𝗼𝗹𝗶𝗼 𝗛𝗼𝗹𝗱𝗶𝗻𝗴𝘀:');
  console.log('');

  const instrumentMap = createInstrumentMap(currentData);

  const holdings100 = current100.topHoldings.slice(0, 10);
  const weekAgoHoldings100 = weekAgo100.topHoldings.slice(0, 10);

  function formatHolding(holding: Holding, prevHoldings: Holding[], groupSize: number, curCov: number, prevCov: number): string {
    const asset = getAssetInfo(holding.instrumentId, instrumentMap);
    const prev = prevHoldings.find(h => h.instrumentId === holding.instrumentId);
    const curPct = adjustedPct(holding.holdersCount, groupSize, curCov);
    const prevPct = prev ? adjustedPct(prev.holdersCount, groupSize, prevCov) : 0;
    const ppChange = prev ? curPct - prevPct : 0;
    const sign = ppChange > 0 ? '+' : ppChange < 0 ? '-' : '=';
    return `$${asset.symbol} (${curPct.toFixed(0)}% ${sign}${Math.abs(ppChange).toFixed(1)}pp)`;
  }

  console.log('𝗧𝗼𝗽 𝟭𝟬𝟬:');
  holdings100.forEach((h, i) => {
    console.log(`${i+1}. ${formatHolding(h, weekAgoHoldings100, GROUP_SIZES[0], cov.cur100, cov.prev100)}`);
  });

  const holdings1500 = current1500.topHoldings.slice(0, 10);
  const weekAgoHoldings1500 = weekAgo1500.topHoldings.slice(0, 10);

  console.log('');
  console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽:');
  holdings1500.forEach((h, i) => {
    console.log(`${i+1}. ${formatHolding(h, weekAgoHoldings1500, GROUP_SIZES[3], cov.cur1500, cov.prev1500)}`);
  });

  console.log('');
  console.log('🔄 𝗕𝗶𝗴𝗴𝗲𝘀𝘁 𝗪𝗲𝗲𝗸𝗹𝘆 𝗔𝘀𝘀𝗲𝘁 𝗠𝗼𝘃𝗲𝘀:');
  console.log('');

  const weeklyMovers100 = findPpMovers(current100.topHoldings, weekAgo100.topHoldings, GROUP_SIZES[0], cov.cur100, cov.prev100, 1.0);
  const weeklyMovers1500 = findPpMovers(current1500.topHoldings, weekAgo1500.topHoldings, GROUP_SIZES[3], cov.cur1500, cov.prev1500, 0.5);

  if (weeklyMovers100.length > 0) {
    const adds100 = weeklyMovers100.filter(m => m.ppChange > 0).slice(0, 3);
    const drops100 = weeklyMovers100.filter(m => m.ppChange < 0).slice(0, 3);

    if (adds100.length > 0) {
      console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      adds100.forEach(m => console.log(`• $${m.symbol}: +${m.ppChange.toFixed(1)}pp`));
    }

    if (drops100.length > 0) {
      console.log('');
      console.log('𝗧𝗼𝗽 𝟭𝟬𝟬 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      drops100.forEach(m => console.log(`• $${m.symbol}: ${m.ppChange.toFixed(1)}pp`));
    }
  } else {
    console.log('𝗧𝗼𝗽 𝟭𝟬𝟬: Minimal portfolio changes this week');
  }

  if (weeklyMovers1500.length > 0) {
    const adds1500 = weeklyMovers1500.filter(m => m.ppChange > 0).slice(0, 3);
    const drops1500 = weeklyMovers1500.filter(m => m.ppChange < 0).slice(0, 3);

    if (adds1500.length > 0) {
      console.log('');
      console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗔𝗱𝗱𝗲𝗱:');
      adds1500.forEach(m => console.log(`• $${m.symbol}: +${m.ppChange.toFixed(1)}pp`));
    }

    if (drops1500.length > 0) {
      console.log('');
      console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽 - 𝗠𝗼𝘀𝘁 𝗥𝗲𝗱𝘂𝗰𝗲𝗱:');
      drops1500.forEach(m => console.log(`• $${m.symbol}: ${m.ppChange.toFixed(1)}pp`));
    }
  } else {
    console.log('𝗕𝗿𝗼𝗮𝗱 𝗚𝗿𝗼𝘂𝗽: Minimal portfolio changes this week');
  }

  console.log('');
  console.log('👥 𝗪𝗲𝗲𝗸𝗹𝘆 𝗖𝗼𝗽𝗶𝗲𝗿 𝗧𝗿𝗲𝗻𝗱𝘀:');
  console.log('');

  const copierChanges = findTopCopierChanges(currentData.investors, weekAgoData.investors, 10);
  const gainers = copierChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const losers = copierChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  if (gainers.length > 0) {
    console.log('');
    console.log('🚀 𝗧𝗼𝗽 𝟱 𝗚𝗮𝗶𝗻𝗲𝗿𝘀:');
    gainers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${formatNumber(change.investor.copiers)} +${change.change})`);
    });
  }

  if (losers.length > 0) {
    console.log('');
    console.log('📉 𝗧𝗼𝗽 𝟱 𝗟𝗼𝘀𝗲𝗿𝘀:');
    losers.forEach((change, i) => {
      const name = change.investor.fullName || change.investor.userName;
      console.log(`${i+1}. ${name} (@${change.investor.userName}): (${formatNumber(change.investor.copiers)} -${Math.abs(change.change)})`);
    });
  }

  if (gainers.length === 0 && losers.length === 0) {
    console.log('Stable copier counts - minimal changes (under ±10) in investor following this week');
  }

  console.log('');
  console.log('💡 𝐖𝐞𝐞𝐤𝐥𝐲 𝗞𝗲𝘆 𝗜𝗻𝘀𝗶𝗴𝗵𝘁𝘀:');
  console.log('');

  const insights: string[] = [];

  if (Math.abs(perfChange100 - perfChange1500) > 1) {
    const who = perfChange100 > perfChange1500 ? 'Top 100' : 'Broad market';
    const gap = Math.abs(perfChange100 - perfChange1500).toFixed(1);
    insights.push(`• ${who} outperformed by ${gap}pp this week - skill divergence widening`);
  }

  if (Math.abs(avgCashChange) > 1) {
    const direction = avgCashChange > 0 ? 'defensive' : 'aggressive';
    insights.push(`• Market turning ${direction} - cash positions ${avgCashChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(avgCashChange).toFixed(1)}%`);
  }

  const avgTradesChange = (tradesChange100 + tradesChange1500) / 2;
  if (Math.abs(avgTradesChange) > 10) {
    const activity = avgTradesChange > 0 ? 'increased' : 'decreased';
    insights.push(`• Trading activity ${activity} significantly - ${Math.abs(avgTradesChange).toFixed(0)} trades/week change`);
  }

  if (weeklyMovers100.length > 5 || weeklyMovers1500.length > 10) {
    insights.push('• Major portfolio rotation detected - significant asset reallocation this week');
  }

  const totalCopierChange = copierChanges.reduce((sum, c) => sum + c.change, 0);
  if (Math.abs(totalCopierChange) > 1000) {
    const direction = totalCopierChange > 0 ? 'growing' : 'declining';
    insights.push(`• Copier momentum ${direction} - net ${Math.abs(totalCopierChange)} copier changes`);
  }

  if (insights.length === 0) {
    insights.push('• Stable week with minimal disruptions - steady market conditions');
  }

  insights.forEach(insight => console.log(insight));

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
  generateWeeklyPost();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Error:', message);
}
