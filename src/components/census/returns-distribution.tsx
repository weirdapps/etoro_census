'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReturnsDistributionProps {
  distribution: { [range: string]: number };
}

export default function ReturnsDistribution({ distribution }: ReturnsDistributionProps) {
  const getColorClass = (range: string) => {
    if (range === 'Loss') return 'from-red-500 to-red-600';
    if (range === '0-10%') return 'from-orange-400 to-orange-500';
    if (range === '11-25%') return 'from-yellow-400 to-yellow-500';
    if (range === '26-50%') return 'from-lime-400 to-lime-500';
    if (range === '51-100%') return 'from-green-500 to-green-600';
    return 'from-emerald-500 to-emerald-600';
  };

  const getBadgeColor = (range: string) => {
    if (range === 'Loss') return 'bg-red-100 text-red-800';
    if (range === '0-10%') return 'bg-orange-100 text-orange-800';
    if (range === '11-25%') return 'bg-yellow-100 text-yellow-800';
    if (range === '26-50%') return 'bg-lime-100 text-lime-800';
    if (range === '51-100%') return 'bg-green-100 text-green-800';
    return 'bg-emerald-100 text-emerald-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Returns Distribution</CardTitle>
        <CardDescription>Performance ranges across analyzed investors</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(distribution).map(([range, count]) => {
            const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={range} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{range} returns</span>
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
      </CardContent>
    </Card>
  );
}