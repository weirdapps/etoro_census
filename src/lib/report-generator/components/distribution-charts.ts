import { CensusAnalysis } from '@/lib/models/census';
import {
  getReturnsColorClass,
  getReturnsBadgeColor,
  getRiskColorClass,
  getRiskBadgeColor,
  getRiskIcon
} from '../utils';

function renderDistributionRow(
  range: string,
  count: number,
  total: number,
  labelSuffix: string,
  getBarColor: (range: string) => string,
  getBadgeStyle: (range: string) => string,
  icon?: string
): string {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColor = getBarColor(range);

  return `
    <div class="distribution-row">
      <div class="distribution-header">
        <span class="distribution-label">
          ${icon ? `<span>${icon}</span> ` : ''}${range} ${labelSuffix}
        </span>
        <div class="distribution-stats">
          <span class="distribution-count">${count} investors</span>
          <span class="distribution-badge" style="${getBadgeStyle(range)}">${percentage}%</span>
        </div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="background: linear-gradient(to right, ${barColor}, ${barColor}dd); width: ${percentage}%;"></div>
      </div>
    </div>
  `;
}

export function renderReturnsDistribution(analysis: CensusAnalysis): string {
  const distribution = analysis.returnsDistribution || {};
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  const rows = Object.entries(distribution)
    .map(([range, count]) => renderDistributionRow(
      range,
      count,
      total,
      'returns',
      getReturnsColorClass,
      getReturnsBadgeColor
    ))
    .join('');

  return `
    <div class="card">
      <div class="card-header">
        <h3>Returns Distribution</h3>
        <p class="card-description">Performance ranges across analyzed investors</p>
      </div>
      <div class="chart-container">
        ${rows}
      </div>
    </div>
  `;
}

export function renderRiskDistribution(analysis: CensusAnalysis): string {
  const distribution = analysis.riskScoreDistribution || {};
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  const rows = Object.entries(distribution)
    .map(([range, count]) => renderDistributionRow(
      range,
      count,
      total,
      '',
      getRiskColorClass,
      getRiskBadgeColor,
      getRiskIcon(range)
    ))
    .join('');

  return `
    <div class="card">
      <div class="card-header">
        <h3>Risk Score Distribution</h3>
        <p class="card-description">Risk appetite distribution across analyzed investors</p>
      </div>
      <div class="chart-container">
        ${rows}
        <div style="margin-top: 16px; font-size: 0.75rem; color: #6b7280;">
          <p>eToro Risk Score ranges from 1 (lowest risk) to 10 (highest risk)</p>
        </div>
      </div>
    </div>
  `;
}

export function renderDiversificationDistribution(analysis: CensusAnalysis, investorCount: number): string {
  const distribution = analysis.uniqueInstrumentsDistribution || {};
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  const rows = Object.entries(distribution)
    .map(([range, count]) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="distribution-row">
          <div class="distribution-header">
            <span class="distribution-label">${range} assets</span>
            <div class="distribution-stats">
              <span class="distribution-count">${count} investors</span>
              <span class="distribution-badge" style="background-color: #dbeafe; color: #2563eb;">${percentage}%</span>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="background: linear-gradient(to right, #00C896, #00B085); width: ${percentage}%;"></div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="card">
      <div class="card-header">
        <h3>Portfolio Diversification</h3>
        <p class="card-description">Number of unique instruments held by top ${investorCount} investors</p>
      </div>
      <div class="chart-container">
        ${rows}
      </div>
    </div>
  `;
}

export function renderCashDistribution(analysis: CensusAnalysis, investorCount: number): string {
  const distribution = analysis.cashPercentageDistribution || {};
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  const rows = Object.entries(distribution)
    .map(([range, count]) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="distribution-row">
          <div class="distribution-header">
            <span class="distribution-label">${range} cash</span>
            <div class="distribution-stats">
              <span class="distribution-count">${count} investors</span>
              <span class="distribution-badge" style="background-color: #f3e8ff; color: #9333ea;">${percentage}%</span>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="background: linear-gradient(to right, #8b5cf6, #7c3aed); width: ${percentage}%;"></div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="card">
      <div class="card-header">
        <h3>Cash Allocation</h3>
        <p class="card-description">Percentage of portfolio held in cash by top ${investorCount} investors</p>
      </div>
      <div class="chart-container">
        ${rows}
      </div>
    </div>
  `;
}

export function renderAllDistributions(analysis: CensusAnalysis, investorCount: number): string {
  return `
    <div class="space-y-8">
      ${renderReturnsDistribution(analysis)}
      ${renderRiskDistribution(analysis)}
      ${renderDiversificationDistribution(analysis, investorCount)}
      ${renderCashDistribution(analysis, investorCount)}
    </div>
  `;
}
