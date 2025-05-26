'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RiskScoreDistributionProps {
  distribution: { [range: string]: number };
}

export default function RiskScoreDistribution({ distribution }: RiskScoreDistributionProps) {
  const getColorClass = (range: string) => {
    if (range.includes('Conservative')) return 'from-green-500 to-green-600';
    if (range.includes('Moderate')) return 'from-blue-500 to-blue-600';
    if (range.includes('Aggressive')) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getBadgeColor = (range: string) => {
    if (range.includes('Conservative')) return 'bg-green-100 text-green-800';
    if (range.includes('Moderate')) return 'bg-blue-100 text-blue-800';
    if (range.includes('Aggressive')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskIcon = (range: string) => {
    if (range.includes('Conservative')) return '🛡️';
    if (range.includes('Moderate')) return '⚖️';
    if (range.includes('Aggressive')) return '📈';
    return '🔥';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Score Distribution</CardTitle>
        <CardDescription>Risk appetite distribution across analyzed investors</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(distribution).map(([range, count]) => {
            const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={range} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span>{getRiskIcon(range)}</span>
                    <span>{range}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count} investors</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getBadgeColor(range)}`}>
                      {percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${getColorClass(range)} h-2 rounded-full transition-all duration-700`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>eToro Risk Score ranges from 1 (lowest risk) to 10 (highest risk)</p>
        </div>
      </CardContent>
    </Card>
  );
}