import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateReportHTML, AnalysisBand } from '../index';
import { CensusAnalysis } from '@/lib/models/census';

// Mock the heavy modules
vi.mock('../styles', () => ({
  reportStyles: '/* mock styles */',
}));

vi.mock('../scripts', () => ({
  reportScripts: '/* mock scripts */',
}));

vi.mock('../components', () => ({
  renderFearGreedGauge: vi.fn((analysis: CensusAnalysis) =>
    `<div class="fear-greed-gauge">FGI: ${analysis.fearGreedIndex || 0}</div>`
  ),
  renderMetricsGrid: vi.fn((analysis: CensusAnalysis) =>
    `<div class="metrics-grid">AvgGain: ${analysis.averageGain || 0}</div>`
  ),
  renderAllDistributions: vi.fn(() =>
    '<div class="distributions">Distributions</div>'
  ),
  renderHoldingsTable: vi.fn((holdings: unknown[]) =>
    `<table class="holdings-table"><tr><td>${holdings?.length || 0} holdings</td></tr></table>`
  ),
  renderPerformersTable: vi.fn((performers: unknown[]) =>
    `<table class="performers-table"><tr><td>${performers?.length || 0} performers</td></tr></table>`
  ),
}));

describe('Report Generator', () => {
  const createMockAnalysis = (overrides?: Partial<CensusAnalysis>): CensusAnalysis => ({
    fearGreedIndex: 65,
    averageUniqueInstruments: 15,
    averageCashPercentage: 12.3,
    averageGain: 18.5,
    averageRiskScore: 5.2,
    averageTrades: 120,
    averageWinRatio: 68,
    uniqueInstrumentsDistribution: { '1-5': 50, '6-10': 120, '11-20': 200, '21+': 156 },
    cashPercentageDistribution: { '0-10': 280, '10-20': 150, '20-30': 70, '30+': 26 },
    riskScoreDistribution: { '1-3': 95, '4-6': 280, '7-10': 151 },
    returnsDistribution: { '<0': 50, '0-10': 120, '10-20': 180, '20-30': 150, '30+': 76 },
    topHoldings: [
      {
        instrumentId: 1, symbol: 'AAPL', instrumentName: 'Apple Inc.',
        averageAllocation: 5.2, holdersCount: 450, holdersPercentage: 85.5, totalAllocation: 2340,
      },
      {
        instrumentId: 2, symbol: 'MSFT', instrumentName: 'Microsoft Corp.',
        averageAllocation: 4.8, holdersCount: 420, holdersPercentage: 79.8, totalAllocation: 2016,
      },
      {
        instrumentId: 3, symbol: 'GOOGL', instrumentName: 'Alphabet Inc.',
        averageAllocation: 3.9, holdersCount: 380, holdersPercentage: 72.2, totalAllocation: 1482,
      },
    ],
    topPerformers: [
      { username: 'trader1', fullName: 'Trader One', gain: 45.2, copiers: 1250, riskScore: 5, cashPercentage: 10, trades: 200, winRatio: 72 },
      { username: 'trader2', fullName: 'Trader Two', gain: 38.7, copiers: 980, riskScore: 6, cashPercentage: 15, trades: 150, winRatio: 65 },
      { username: 'trader3', fullName: 'Trader Three', gain: 32.1, copiers: 750, riskScore: 4, cashPercentage: 8, trades: 180, winRatio: 70 },
    ],
    ...overrides,
  });

  const createAnalysisBand = (count: number, analysis: CensusAnalysis): AnalysisBand => ({
    count,
    analysis,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate valid HTML with DOCTYPE', () => {
    const analyses = [createAnalysisBand(100, createMockAnalysis())];
    const html = generateReportHTML(analyses, '2026-02-28T10:00:00Z');

    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('should include the generated timestamp', () => {
    const generatedAt = '2026-02-28T10:00:00Z';
    const html = generateReportHTML([createAnalysisBand(100, createMockAnalysis())], generatedAt);

    expect(html).toContain(generatedAt);
  });

  it('should render tabs for each analysis band', () => {
    const analyses = [
      createAnalysisBand(100, createMockAnalysis()),
      createAnalysisBand(50, createMockAnalysis()),
      createAnalysisBand(25, createMockAnalysis()),
    ];

    const html = generateReportHTML(analyses, '2026-02-28T10:00:00Z');

    expect(html).toContain('Top 100 PIs');
    expect(html).toContain('Top 50 PIs');
    expect(html).toContain('Top 25 PIs');
    expect(html).toContain('tab-0');
    expect(html).toContain('tab-1');
    expect(html).toContain('tab-2');
  });

  it('should include styles and scripts', () => {
    const html = generateReportHTML([createAnalysisBand(100, createMockAnalysis())], '2026-02-28T10:00:00Z');

    expect(html).toContain('/* mock styles */');
    expect(html).toContain('/* mock scripts */');
  });

  it('should handle empty analyses array', () => {
    const html = generateReportHTML([], '2026-02-28T10:00:00Z');

    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('2026-02-28T10:00:00Z');
  });

  it('should render holdings table for each band', async () => {
    const { renderHoldingsTable } = await import('../components');

    const html = generateReportHTML([
      createAnalysisBand(100, createMockAnalysis()),
      createAnalysisBand(50, createMockAnalysis()),
    ], '2026-02-28T10:00:00Z');

    expect(renderHoldingsTable).toHaveBeenCalledTimes(2);
    expect(html).toContain('holdings-table');
    expect(html).toContain('3 holdings');
  });

  it('should render performers table for each band', async () => {
    const { renderPerformersTable } = await import('../components');

    const html = generateReportHTML([
      createAnalysisBand(100, createMockAnalysis()),
      createAnalysisBand(50, createMockAnalysis()),
    ], '2026-02-28T10:00:00Z');

    expect(renderPerformersTable).toHaveBeenCalledTimes(2);
    expect(html).toContain('performers-table');
    expect(html).toContain('3 performers');
  });

  it('should render fear & greed gauge for each band', async () => {
    const { renderFearGreedGauge } = await import('../components');

    const html = generateReportHTML([
      createAnalysisBand(100, createMockAnalysis()),
      createAnalysisBand(50, createMockAnalysis()),
    ], '2026-02-28T10:00:00Z');

    expect(renderFearGreedGauge).toHaveBeenCalledTimes(2);
    expect(html).toContain('fear-greed-gauge');
    expect(html).toContain('FGI: 65');
  });

  it('should render metrics grid for each band', async () => {
    const { renderMetricsGrid } = await import('../components');

    const html = generateReportHTML([createAnalysisBand(100, createMockAnalysis())], '2026-02-28T10:00:00Z');

    expect(renderMetricsGrid).toHaveBeenCalled();
    expect(html).toContain('metrics-grid');
    expect(html).toContain('AvgGain: 18.5');
  });

  it('should render distributions for each band', async () => {
    const { renderAllDistributions } = await import('../components');

    const html = generateReportHTML([createAnalysisBand(100, createMockAnalysis())], '2026-02-28T10:00:00Z');

    expect(renderAllDistributions).toHaveBeenCalled();
    expect(html).toContain('distributions');
  });

  it('should handle analysis with minimal fields', () => {
    const minimalAnalysis: CensusAnalysis = {
      fearGreedIndex: 0,
      averageUniqueInstruments: 0,
      averageCashPercentage: 0,
      averageGain: 0,
      averageRiskScore: 0,
      averageTrades: 0,
      averageWinRatio: 0,
      uniqueInstrumentsDistribution: {},
      cashPercentageDistribution: {},
      riskScoreDistribution: {},
      returnsDistribution: {},
      topHoldings: [],
      topPerformers: [],
    };

    const html = generateReportHTML([createAnalysisBand(100, minimalAnalysis)], '2026-02-28T10:00:00Z');

    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('should handle multiple bands', () => {
    const analyses = [
      createAnalysisBand(100, createMockAnalysis({ averageGain: 20.5 })),
      createAnalysisBand(50, createMockAnalysis({ averageGain: 25.1 })),
      createAnalysisBand(25, createMockAnalysis({ averageGain: 30.2 })),
      createAnalysisBand(10, createMockAnalysis({ averageGain: 35.8 })),
    ];

    const html = generateReportHTML(analyses, '2026-02-28T10:00:00Z');

    expect(html).toContain('Top 100 PIs');
    expect(html).toContain('Top 50 PIs');
    expect(html).toContain('Top 25 PIs');
    expect(html).toContain('Top 10 PIs');
  });

  it('should include proper HTML structure', () => {
    const html = generateReportHTML([createAnalysisBand(100, createMockAnalysis())], '2026-02-28T10:00:00Z');

    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
    expect(html).toContain('<meta charset="UTF-8">');
  });

  it('should include a title', () => {
    const html = generateReportHTML([createAnalysisBand(100, createMockAnalysis())], '2026-02-28T10:00:00Z');

    expect(html).toContain('<title>');
    expect(html).toContain('</title>');
  });

  it('should handle bands with empty holdings and performers', () => {
    const emptyAnalysis = createMockAnalysis({ topHoldings: [], topPerformers: [] });
    const html = generateReportHTML([createAnalysisBand(100, emptyAnalysis)], '2026-02-28T10:00:00Z');

    expect(html).toContain('0 holdings');
    expect(html).toContain('0 performers');
  });
});
