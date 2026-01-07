import { CensusAnalysis } from '@/lib/models/census';
import { calculateFearGreedDisplay, getFearGreedColor, getFearGreedLabel } from '../utils';

export function renderFearGreedGauge(analysis: CensusAnalysis): string {
  const cashPercentage = analysis.averageCashPercentage || 0;
  const displayValue = calculateFearGreedDisplay(cashPercentage);
  const color = getFearGreedColor(displayValue);
  const label = getFearGreedLabel(displayValue);

  return `
    <div class="card" style="margin-bottom: 32px;">
      <div class="card-header">
        <h3>Fear & Greed Index</h3>
      </div>
      <div style="padding: 24px 0;">
        <div style="position: relative; width: 100%; height: 60px; background: #f3f4f6; border-radius: 30px; overflow: hidden;">
          <!-- Gradient background -->
          <div style="position: absolute; width: 100%; height: 100%; background: linear-gradient(to right, #ef4444 0%, #f59e0b 25%, #fbbf24 50%, #84cc16 75%, #10b981 100%);"></div>
          <!-- Marker -->
          <div style="position: absolute; left: ${displayValue}%; top: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: #111827; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-weight: 700; font-size: 1rem;">${Math.round(displayValue)}</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 16px;">
          <div style="text-align: left;">
            <div style="font-size: 0.875rem; color: #ef4444; font-weight: 500;">Extreme Fear</div>
            <div style="font-size: 0.75rem; color: #6b7280;">0</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.125rem; color: ${color}; font-weight: 700;">
              ${label}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.875rem; color: #10b981; font-weight: 500;">Extreme Greed</div>
            <div style="font-size: 0.75rem; color: #6b7280;">100</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
