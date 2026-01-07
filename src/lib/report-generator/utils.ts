// Utility functions for HTML report generation

export function getReturnsColorClass(range: string): string {
  if (range === 'Loss') return '#ef4444'; // red-500
  if (range === '0-10%') return '#fb923c'; // orange-400
  if (range === '11-25%') return '#facc15'; // yellow-400
  if (range === '26-50%') return '#a3e635'; // lime-400
  if (range === '51-100%') return '#22c55e'; // green-500
  return '#10b981'; // emerald-500
}

export function getReturnsBadgeColor(range: string): string {
  if (range === 'Loss') return 'background-color: #fee2e2; color: #dc2626;'; // red
  if (range === '0-10%') return 'background-color: #fed7aa; color: #ea580c;'; // orange
  if (range === '11-25%') return 'background-color: #fef3c7; color: #ca8a04;'; // yellow
  if (range === '26-50%') return 'background-color: #ecfccb; color: #65a30d;'; // lime
  if (range === '51-100%') return 'background-color: #dcfce7; color: #16a34a;'; // green
  return 'background-color: #d1fae5; color: #059669;'; // emerald
}

export function getRiskColorClass(range: string): string {
  if (range.includes('Conservative')) return '#22c55e'; // green-500
  if (range.includes('Moderate')) return '#3b82f6'; // blue-500
  if (range.includes('Aggressive')) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

export function getRiskBadgeColor(range: string): string {
  if (range.includes('Conservative')) return 'background-color: #dcfce7; color: #16a34a;'; // green
  if (range.includes('Moderate')) return 'background-color: #dbeafe; color: #2563eb;'; // blue
  if (range.includes('Aggressive')) return 'background-color: #fed7aa; color: #ea580c;'; // orange
  return 'background-color: #fee2e2; color: #dc2626;'; // red
}

export function getRiskIcon(range: string): string {
  if (range.includes('Conservative')) return '🛡️';
  if (range.includes('Moderate')) return '⚖️';
  if (range.includes('Aggressive')) return '📈';
  return '🔥';
}

export function calculateFearGreedDisplay(cashPercentage: number): number {
  // Linear mapping from 30-0% cash to 0-100% display scale
  // 30% cash = 0 display (Extreme Fear), 0% cash = 100 display (Extreme Greed)
  return Math.max(0, Math.min(100, 100 - (cashPercentage / 30) * 100));
}

export function getFearGreedColor(displayValue: number): string {
  if (displayValue <= 20) return '#ef4444';
  if (displayValue <= 40) return '#f97316';
  if (displayValue <= 60) return '#fbbf24';
  if (displayValue <= 80) return '#84cc16';
  return '#10b981';
}

export function getFearGreedLabel(displayValue: number): string {
  if (displayValue <= 20) return 'Extreme Fear';
  if (displayValue <= 40) return 'Fear';
  if (displayValue <= 60) return 'Neutral';
  if (displayValue <= 80) return 'Greed';
  return 'Extreme Greed';
}
