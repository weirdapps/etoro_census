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
  loadDataFile,
  formatPercentage
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
  summary: {
    fearGreedIndex: number;
    avgCashTop100: number;
    avgCashBroad: number;
    top100Advantage: number;
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

  const exportData: ExportData = {
    exportedAt: new Date().toISOString(),
    censusDate: (currentData.metadata as any)?.collectedAt || currentData.metadata?.generatedAt || files.today,
    groups,
    changes: {
      holdingMovers: holdingMovers.slice(0, 10),
      copierChanges: copierChanges.slice(0, 10)
    },
    summary: {
      fearGreedIndex,
      avgCashTop100: groups.top100.averages.cashPercentage,
      avgCashBroad: groups.broad1500.averages.cashPercentage,
      top100Advantage: Math.round((top100Gain - broadGain) * 10) / 10
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
  console.log(`\nFear & Greed Index: ${fearGreedIndex}`);
  console.log(`Top 100 advantage: ${formatPercentage(top100Gain - broadGain)}pp`);
}

try {
  generateExport();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Error:', message);
  process.exit(1);
}
