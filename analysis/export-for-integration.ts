/**
 * Export Census Data for Trading Marketplace Integration
 *
 * Non-invasive helper script that exports structured data
 * for consumption by the trading-marketplace skills and agents.
 *
 * Usage: npx ts-node analysis/export-for-integration.ts
 *
 * Output: ~/.weirdapps-trading/census/latest-export.json
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getLatestDataFiles,
  getAllDataFiles,
  getDataDirectory,
  loadDataFile,
  formatPercentage,
  calculateFearGreedIndex
} from './lib/utils';
import type { CensusData, Investor, Holding, Analysis } from './lib/types';

interface InvestorGroup {
  name: string;
  description: string;
  count: number;
  investors: GroupInvestor[];
  topHoldings: GroupHolding[];
  averages: {
    gain: number;
    riskScore: number;
    cashPercentage: number;
    copiers: number;
  };
}

interface GroupInvestor {
  userName: string;
  fullName: string;
  gain: number;
  riskScore: number;
  copiers: number;
  winRatio: number;
}

interface GroupHolding {
  symbol: string;
  holdersCount: number;
  holdersPercentage: number;
  avgAllocation: number;
}

interface TrendDataPoint {
  date: string;
  fearGreedIndex: number;
  cashPercentage: number;
}

interface MomentumStock {
  symbol: string;
  trend: 'accumulating' | 'distributing';
  daysInTrend: number;
  totalChange: number;
}

interface ExportData {
  exportedAt: string;
  censusDate: string;
  groups: {
    top100: InvestorGroup;
    broad1500: InvestorGroup;
    topPerformers: InvestorGroup;
    safeGroup: InvestorGroup;
  };
  changes: {
    holdingMovers: Array<{
      symbol: string;
      change: number;
      direction: 'added' | 'reduced';
    }>;
    copierChanges: Array<{
      userName: string;
      change: number;
      direction: 'gained' | 'lost';
    }>;
  };
  trends: {
    history7d: TrendDataPoint[];
    history30d: TrendDataPoint[];
    cashTrend: 'rising' | 'falling' | 'stable';
    fearGreedTrend: 'improving' | 'worsening' | 'stable';
  };
  momentum: {
    accumulating: MomentumStock[];
    distributing: MomentumStock[];
  };
  summary: {
    fearGreedIndex: number;
    avgCashTop100: number;
    avgCashBroad: number;
    top100Advantage: number;
    avgWinRatioTop100: number;
    avgWinRatioTopPerformers: number;
  };
}

function calculateGroupAverages(investors: Investor[]): InvestorGroup['averages'] {
  if (investors.length === 0) {
    return { gain: 0, riskScore: 0, cashPercentage: 0, copiers: 0 };
  }

  const sum = investors.reduce(
    (acc, inv) => {
      const cashPct = inv.portfolio?.positions
        ? 100 - inv.portfolio.positions.reduce((s, p) => s + (p.investmentPct || 0), 0)
        : 0;
      return {
        gain: acc.gain + (inv.gain || 0),
        riskScore: acc.riskScore + (inv.riskScore || 0),
        cashPercentage: acc.cashPercentage + Math.max(0, cashPct),
        copiers: acc.copiers + (inv.copiers || 0)
      };
    },
    { gain: 0, riskScore: 0, cashPercentage: 0, copiers: 0 }
  );

  const count = investors.length;
  return {
    gain: Math.round((sum.gain / count) * 10) / 10,
    riskScore: Math.round((sum.riskScore / count) * 10) / 10,
    cashPercentage: Math.round((sum.cashPercentage / count) * 10) / 10,
    copiers: Math.round(sum.copiers / count)
  };
}

function buildInstrumentMap(analyses: Analysis[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const analysis of analyses) {
    if (analysis.topHoldings) {
      for (const h of analysis.topHoldings) {
        if ((h as any).instrumentId && h.symbol) {
          map.set((h as any).instrumentId, h.symbol);
        }
      }
    }
  }
  return map;
}

function aggregateHoldings(
  investors: Investor[],
  instrumentMap: Map<number, string>,
  limit: number = 30
): GroupHolding[] {
  const holdingMap = new Map<string, { count: number; totalAlloc: number }>();

  for (const inv of investors) {
    const seen = new Set<string>();
    if (inv.portfolio?.positions) {
      for (const pos of inv.portfolio.positions) {
        const symbol = instrumentMap.get(pos.instrumentId) || (pos as any).symbol || `ID${pos.instrumentId}`;
        if (!seen.has(symbol)) {
          seen.add(symbol);
          const current = holdingMap.get(symbol) || { count: 0, totalAlloc: 0 };
          holdingMap.set(symbol, {
            count: current.count + 1,
            totalAlloc: current.totalAlloc + (pos.investmentPct || 0)
          });
        }
      }
    }
  }

  const holdings = Array.from(holdingMap.entries())
    .map(([symbol, data]) => ({
      symbol,
      holdersCount: data.count,
      holdersPercentage: Math.round((data.count / investors.length) * 100 * 10) / 10,
      avgAllocation: Math.round((data.totalAlloc / data.count) * 10) / 10
    }))
    .sort((a, b) => b.holdersCount - a.holdersCount)
    .slice(0, limit);

  return holdings;
}

function createInvestorGroup(
  name: string,
  description: string,
  investors: Investor[],
  instrumentMap: Map<number, string>,
  existingAnalysis?: Analysis
): InvestorGroup {
  const topInvestors: GroupInvestor[] = investors.slice(0, 20).map(inv => ({
    userName: inv.userName,
    fullName: inv.fullName || inv.userName,
    gain: inv.gain || 0,
    riskScore: inv.riskScore || 0,
    copiers: inv.copiers || 0,
    winRatio: inv.winRatio || 0
  }));

  // Use existing analysis holdings if available, otherwise aggregate
  let topHoldings: GroupHolding[];
  if (existingAnalysis?.topHoldings) {
    topHoldings = existingAnalysis.topHoldings.slice(0, 30).map((h: Holding) => ({
      symbol: h.symbol,
      holdersCount: h.holdersCount,
      holdersPercentage: (h as any).holdersPercentage || 0,
      avgAllocation: h.avgAllocation || h.averageAllocation || 0
    }));
  } else {
    topHoldings = aggregateHoldings(investors, instrumentMap);
  }

  return {
    name,
    description,
    count: investors.length,
    investors: topInvestors,
    topHoldings,
    averages: calculateGroupAverages(investors)
  };
}

function calculateCashPercentage(investors: Investor[]): number {
  if (investors.length === 0) return 0;
  const totalCash = investors.reduce((sum, inv) => {
    const cashPct = inv.portfolio?.positions
      ? 100 - inv.portfolio.positions.reduce((s, p) => s + (p.investmentPct || 0), 0)
      : 0;
    return sum + Math.max(0, cashPct);
  }, 0);
  return Math.round((totalCash / investors.length) * 10) / 10;
}

function getHistoricalTrends(days: number): TrendDataPoint[] {
  const allFiles = getAllDataFiles();
  const dataDir = getDataDirectory();
  const trends: TrendDataPoint[] = [];

  for (let i = 0; i < Math.min(days, allFiles.length); i++) {
    try {
      const filepath = path.join(dataDir, allFiles[i]);
      const data = loadDataFile(filepath);
      const dateMatch = allFiles[i].match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : allFiles[i];

      // Use stored analysis data which has consistent F&G calculation
      const fearGreedIndex = data.analyses[0]?.fearGreedIndex || 0;
      const cashPct = data.analyses[0]?.averages?.cashPercentage || 0;

      trends.push({
        date,
        fearGreedIndex,
        cashPercentage: cashPct
      });
    } catch {
      // Skip files that can't be loaded
    }
  }

  return trends.reverse(); // Oldest first
}

function detectMomentum(days: number = 5): { accumulating: MomentumStock[]; distributing: MomentumStock[] } {
  const allFiles = getAllDataFiles();
  const dataDir = getDataDirectory();

  if (allFiles.length < days) {
    return { accumulating: [], distributing: [] };
  }

  // Track holding changes over the last N days
  const holdingHistory = new Map<string, number[]>();

  for (let i = 0; i < days && i < allFiles.length; i++) {
    try {
      const filepath = path.join(dataDir, allFiles[i]);
      const data = loadDataFile(filepath);

      if (data.analyses[0]?.topHoldings) {
        for (const h of data.analyses[0].topHoldings.slice(0, 50)) {
          const history = holdingHistory.get(h.symbol) || [];
          history.unshift(h.holdersCount); // Add to front
          holdingHistory.set(h.symbol, history);
        }
      }
    } catch {
      // Skip files that can't be loaded
    }
  }

  const accumulating: MomentumStock[] = [];
  const distributing: MomentumStock[] = [];

  for (const [symbol, history] of holdingHistory) {
    if (history.length < 3) continue;

    let increaseDays = 0;
    let decreaseDays = 0;
    let totalChange = 0;

    for (let i = 1; i < history.length; i++) {
      const change = history[i] - history[i - 1];
      totalChange += change;
      if (change > 0) increaseDays++;
      else if (change < 0) decreaseDays++;
    }

    if (increaseDays >= 3 && totalChange > 0) {
      accumulating.push({ symbol, trend: 'accumulating', daysInTrend: increaseDays, totalChange });
    } else if (decreaseDays >= 3 && totalChange < 0) {
      distributing.push({ symbol, trend: 'distributing', daysInTrend: decreaseDays, totalChange: Math.abs(totalChange) });
    }
  }

  accumulating.sort((a, b) => b.totalChange - a.totalChange);
  distributing.sort((a, b) => b.totalChange - a.totalChange);

  return {
    accumulating: accumulating.slice(0, 10),
    distributing: distributing.slice(0, 10)
  };
}

function calculateAvgWinRatio(investors: Investor[]): number {
  const withWinRatio = investors.filter(inv => inv.winRatio !== undefined && inv.winRatio > 0);
  if (withWinRatio.length === 0) return 0;
  const total = withWinRatio.reduce((sum, inv) => sum + (inv.winRatio || 0), 0);
  return Math.round((total / withWinRatio.length) * 10) / 10;
}

function generateExport(): void {
  console.log('Exporting census data for integration...\n');

  const files = getLatestDataFiles();
  console.log(`Current: ${files.today}`);
  console.log(`Previous: ${files.yesterday}\n`);

  const currentData = loadDataFile(files.todayPath);
  const prevData = loadDataFile(files.yesterdayPath);

  // Build instrument ID → symbol mapping from analyses
  const instrumentMap = buildInstrumentMap(currentData.analyses);
  console.log(`Built instrument map with ${instrumentMap.size} symbols\n`);

  // Sort investors by copiers (default)
  const byCopers = [...currentData.investors].sort((a, b) => b.copiers - a.copiers);

  // Sort by gain for top performers
  const byGain = [...currentData.investors].sort((a, b) => (b.gain || 0) - (a.gain || 0));

  // Filter for safe group (risk <= 4)
  const safeInvestors = currentData.investors
    .filter(inv => (inv.riskScore || 10) <= 4)
    .sort((a, b) => b.copiers - a.copiers);

  // Create groups
  const groups = {
    top100: createInvestorGroup(
      'Top 100',
      'Top 100 investors by number of copiers (social proof)',
      byCopers.slice(0, 100),
      instrumentMap,
      currentData.analyses[0]
    ),
    broad1500: createInvestorGroup(
      'Broad Group',
      'All 1,500 popular investors (market sentiment)',
      byCopers,
      instrumentMap,
      currentData.analyses[3]
    ),
    topPerformers: createInvestorGroup(
      'Top Performers',
      'Top 100 investors by YTD gain (alpha seekers)',
      byGain.slice(0, 100),
      instrumentMap
    ),
    safeGroup: createInvestorGroup(
      'Safe Group',
      'Investors with risk score <= 4 (conservative)',
      safeInvestors.slice(0, 200),
      instrumentMap
    )
  };

  // Calculate holding changes
  const currentHoldings = new Map<string, number>();
  const prevHoldings = new Map<string, number>();

  if (currentData.analyses[0]?.topHoldings) {
    for (const h of currentData.analyses[0].topHoldings) {
      currentHoldings.set(h.symbol, h.holdersCount);
    }
  }
  if (prevData.analyses[0]?.topHoldings) {
    for (const h of prevData.analyses[0].topHoldings) {
      prevHoldings.set(h.symbol, h.holdersCount);
    }
  }

  const holdingMovers: ExportData['changes']['holdingMovers'] = [];
  for (const [symbol, count] of currentHoldings) {
    const prev = prevHoldings.get(symbol) || 0;
    const diff = count - prev;
    if (Math.abs(diff) >= 2) {
      holdingMovers.push({
        symbol,
        change: Math.abs(diff),
        direction: diff > 0 ? 'added' : 'reduced'
      });
    }
  }
  holdingMovers.sort((a, b) => b.change - a.change);

  // Calculate copier changes
  const prevInvestorMap = new Map<string, number>();
  for (const inv of prevData.investors) {
    prevInvestorMap.set(inv.userName, inv.copiers);
  }

  const copierChanges: ExportData['changes']['copierChanges'] = [];
  for (const inv of currentData.investors.slice(0, 100)) {
    const prev = prevInvestorMap.get(inv.userName) || inv.copiers;
    const diff = inv.copiers - prev;
    if (Math.abs(diff) >= 10) {
      copierChanges.push({
        userName: inv.userName,
        change: Math.abs(diff),
        direction: diff > 0 ? 'gained' : 'lost'
      });
    }
  }
  copierChanges.sort((a, b) => b.change - a.change);

  // Calculate summary
  const fearGreedIndex = currentData.analyses[0]?.fearGreedIndex || 0;
  const top100Gain = groups.top100.averages.gain;
  const broadGain = groups.broad1500.averages.gain;

  // Calculate historical trends
  console.log('Calculating historical trends...');
  const history7d = getHistoricalTrends(7);
  const history30d = getHistoricalTrends(30);

  // Determine trend directions
  let cashTrend: 'rising' | 'falling' | 'stable' = 'stable';
  let fearGreedTrend: 'improving' | 'worsening' | 'stable' = 'stable';

  if (history7d.length >= 3) {
    const recentCash = history7d.slice(-3).reduce((s, d) => s + d.cashPercentage, 0) / 3;
    const olderCash = history7d.slice(0, 3).reduce((s, d) => s + d.cashPercentage, 0) / 3;
    if (recentCash - olderCash > 1) cashTrend = 'rising';
    else if (olderCash - recentCash > 1) cashTrend = 'falling';

    const recentFG = history7d.slice(-3).reduce((s, d) => s + d.fearGreedIndex, 0) / 3;
    const olderFG = history7d.slice(0, 3).reduce((s, d) => s + d.fearGreedIndex, 0) / 3;
    if (recentFG - olderFG > 5) fearGreedTrend = 'improving';
    else if (olderFG - recentFG > 5) fearGreedTrend = 'worsening';
  }

  // Calculate momentum
  console.log('Detecting momentum patterns...');
  const momentum = detectMomentum(5);

  // Calculate win ratios
  const avgWinRatioTop100 = calculateAvgWinRatio(byCopers.slice(0, 100));
  const avgWinRatioTopPerformers = calculateAvgWinRatio(byGain.slice(0, 100));

  const exportData: ExportData = {
    exportedAt: new Date().toISOString(),
    censusDate: (currentData.metadata as any)?.collectedAt || currentData.metadata?.generatedAt || files.today,
    groups,
    changes: {
      holdingMovers: holdingMovers.slice(0, 10),
      copierChanges: copierChanges.slice(0, 10)
    },
    trends: {
      history7d,
      history30d,
      cashTrend,
      fearGreedTrend
    },
    momentum,
    summary: {
      fearGreedIndex,
      avgCashTop100: groups.top100.averages.cashPercentage,
      avgCashBroad: groups.broad1500.averages.cashPercentage,
      top100Advantage: Math.round((top100Gain - broadGain) * 10) / 10,
      avgWinRatioTop100,
      avgWinRatioTopPerformers
    }
  };

  // Ensure output directory exists
  const outputDir = path.join(process.env.HOME || '/Users/plessas', '.weirdapps-trading', 'census');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write export file
  const outputPath = path.join(outputDir, 'latest-export.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  console.log(`Export saved to: ${outputPath}`);

  // Also save dated copy
  const dateStr = new Date().toISOString().split('T')[0];
  const datedPath = path.join(outputDir, `export-${dateStr}.json`);
  fs.writeFileSync(datedPath, JSON.stringify(exportData, null, 2));
  console.log(`Dated copy saved to: ${datedPath}`);

  // Print summary
  console.log('\n=== Export Summary ===');
  console.log(`Groups exported: 4`);
  console.log(`- Top 100: ${groups.top100.count} investors, ${groups.top100.topHoldings.length} holdings`);
  console.log(`- Broad Group: ${groups.broad1500.count} investors`);
  console.log(`- Top Performers: ${groups.topPerformers.count} investors`);
  console.log(`- Safe Group: ${groups.safeGroup.count} investors`);
  console.log(`\nHolding movers: ${holdingMovers.length}`);
  console.log(`Copier changes: ${copierChanges.length}`);
  console.log(`\nTrends:`);
  console.log(`- 7-day history: ${history7d.length} data points`);
  console.log(`- 30-day history: ${history30d.length} data points`);
  console.log(`- Cash trend: ${cashTrend}`);
  console.log(`- Fear/Greed trend: ${fearGreedTrend}`);
  console.log(`\nMomentum:`);
  console.log(`- Accumulating: ${momentum.accumulating.map(m => m.symbol).join(', ') || 'None'}`);
  console.log(`- Distributing: ${momentum.distributing.map(m => m.symbol).join(', ') || 'None'}`);
  console.log(`\nFear & Greed Index: ${fearGreedIndex}`);
  console.log(`Top 100 advantage: ${formatPercentage(top100Gain - broadGain)}pp`);
  console.log(`Win Ratio - Top 100: ${avgWinRatioTop100}% | Top Performers: ${avgWinRatioTopPerformers}%`);
}

try {
  generateExport();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Error:', message);
  process.exit(1);
}
