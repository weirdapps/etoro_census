'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CashAllocationProps {
  distribution: { [range: string]: number };
}

export default function CashAllocation({ distribution }: CashAllocationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Allocation</CardTitle>
        <CardDescription>Cash percentage distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(distribution).map(([range, count]) => {
            const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={range} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{range} cash</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count} investors</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-700"
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