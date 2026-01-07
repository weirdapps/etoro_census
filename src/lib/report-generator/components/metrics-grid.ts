import { CensusAnalysis } from '@/lib/models/census';

export function renderMetricsGrid(analysis: CensusAnalysis): string {
  return `
    <!-- Key Metrics Grid -->
    <div class="grid grid-cols-3" style="margin-bottom: 32px;">
      <div class="card">
        <div class="card-header">
          <h3>Average Returns</h3>
          <p class="card-description">Year-to-Date Performance</p>
        </div>
        <div class="metric-value">${(analysis.averageGain || 0).toFixed(1)}%</div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Average Cash</h3>
          <p class="card-description">Percent of Portfolio</p>
        </div>
        <div class="metric-value">${(analysis.averageCashPercentage || 0).toFixed(1)}%</div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Average Risk Score</h3>
          <p class="card-description">Risk Level (1-10)</p>
        </div>
        <div class="metric-value">${(analysis.averageRiskScore || 0).toFixed(1)}</div>
      </div>
    </div>

    <!-- Second Row: Additional Metrics -->
    <div class="grid grid-cols-2" style="margin-bottom: 32px;">
      <div class="card">
        <div class="card-header">
          <h3>Average Trades</h3>
          <p class="card-description">Per investor (current year)</p>
        </div>
        <div class="metric-value">${(analysis.averageTrades || 0).toFixed(1)}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Average Win Ratio</h3>
          <p class="card-description">Percentage of winning trades</p>
        </div>
        <div class="metric-value">${(analysis.averageWinRatio || 0).toFixed(1)}%</div>
      </div>
    </div>
  `;
}
