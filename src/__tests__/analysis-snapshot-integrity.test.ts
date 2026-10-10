import { describe, it, expect } from 'vitest';
import { hasIntegrity } from '../../analysis/lib/utils';
import type { CensusData } from '../../analysis/lib/types';

// 2026-10-10: a snapshot with 1500 rows but only 1323 distinct investors passed the
// coverage check, and the weekly post published its holder shares as real moves.
type Integrity = { uniqueInvestors: number; duplicateRowsDropped: number; top100DuplicateRows: number };

function snapshot(userNames: string[], integrity?: Integrity): CensusData {
  return {
    metadata: { totalInvestors: userNames.length, ...(integrity && { integrity }) },
    investors: userNames.map(userName => ({ userName })),
    instruments: {},
    analyses: [],
  } as unknown as CensusData;
}

const names = (n: number, prefix = 'u') => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe('hasIntegrity', () => {
  it('accepts a snapshot where every investor appears once', () => {
    expect(hasIntegrity(snapshot(names(300)))).toBe(true);
  });

  it('rejects any repeated investor inside the Top 100', () => {
    const list = names(300);
    list[1] = list[0];
    expect(hasIntegrity(snapshot(list))).toBe(false);
  });

  it('tolerates up to 1% repeated rows below the Top 100', () => {
    const list = names(300);
    list[299] = list[200];
    list[298] = list[200];
    list[297] = list[200];
    expect(hasIntegrity(snapshot(list))).toBe(true);
  });

  it('rejects more than 1% repeated rows below the Top 100', () => {
    const list = names(300);
    for (let i = 290; i < 300; i++) list[i] = list[200];
    expect(hasIntegrity(snapshot(list))).toBe(false);
  });

  it('trusts the collector record on a deduplicated file', () => {
    expect(hasIntegrity(snapshot(names(1323), { uniqueInvestors: 1323, duplicateRowsDropped: 177, top100DuplicateRows: 37 }))).toBe(false);
    expect(hasIntegrity(snapshot(names(1490), { uniqueInvestors: 1490, duplicateRowsDropped: 10, top100DuplicateRows: 0 }))).toBe(true);
  });
});
