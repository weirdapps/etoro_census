'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FearGreedGaugeEnhancedProps {
  value: number;
  averageCash?: number;
  averageRiskScore?: number;
}

/**
 * Enhanced Fear & Greed Gauge with S-curve algorithm.
 * Shows a progress bar visualization with component breakdown.
 * Used in the V2 dashboard for more detailed market sentiment analysis.
 */
export default function FearGreedGaugeEnhanced({ value, averageCash, averageRiskScore }: FearGreedGaugeEnhancedProps) {
  const getStatus = (val: number): string => {
    if (val <= 20) return 'Extreme Fear';
    if (val <= 40) return 'Fear';
    if (val <= 60) return 'Neutral';
    if (val <= 80) return 'Greed';
    return 'Extreme Greed';
  };

  const getStatusColor = (val: number): string => {
    if (val <= 20) return 'text-red-600';
    if (val <= 40) return 'text-orange-500';
    if (val <= 60) return 'text-yellow-500';
    if (val <= 80) return 'text-lime-500';
    return 'text-green-600';
  };

  const getBarColor = (val: number): string => {
    if (val <= 20) return 'bg-red-600';
    if (val <= 40) return 'bg-orange-500';
    if (val <= 60) return 'bg-yellow-500';
    if (val <= 80) return 'bg-lime-500';
    return 'bg-green-600';
  };

  const status = getStatus(value);
  const statusColor = getStatusColor(value);
  const barColor = getBarColor(value);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fear & Greed Index</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-2">Enhanced S-Curve Algorithm</p>
                <p className="text-sm mb-2">
                  This index combines cash percentage (70% weight) and risk score (30% weight × 5)
                  using a sigmoid function for smooth transitions.
                </p>
                {averageCash !== undefined && averageRiskScore !== undefined && (
                  <div className="text-sm space-y-1 pt-2 border-t">
                    <p>Cash: {averageCash.toFixed(1)}%</p>
                    <p>Risk Score: {averageRiskScore}/10</p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>Market sentiment (0-100 scale)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold ${statusColor}`}>
              {value}
            </span>
            <span className={`text-xl font-semibold ${statusColor}`}>
              {status}
            </span>
          </div>

          <div className="relative">
            <div className="h-8 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all duration-500 ease-out relative`}
                style={{ width: `${value}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Scale markers */}
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>

            {/* Scale labels */}
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-red-600">Fear</span>
              <span className="text-yellow-500">Neutral</span>
              <span className="text-green-600">Greed</span>
            </div>
          </div>

          {/* Components breakdown if available */}
          {averageCash !== undefined && averageRiskScore !== undefined && (
            <div className="pt-4 border-t space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Index Components</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cash Position</p>
                  <p className="font-bold">{averageCash.toFixed(1)}%</p>
                  <Progress value={averageCash} className="h-1 mt-1" />
                </div>
                <div>
                  <p className="text-muted-foreground">Risk Score</p>
                  <p className="font-bold">{averageRiskScore}/10</p>
                  <Progress value={averageRiskScore * 10} className="h-1 mt-1" />
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center pt-2">
            Higher cash & lower risk = Fear | Lower cash & higher risk = Greed
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
