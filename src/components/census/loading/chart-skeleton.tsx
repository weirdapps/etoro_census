'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ChartSkeletonProps {
  height?: number;
  showHeader?: boolean;
  title?: string;
}

export function ChartSkeleton({
  height = 300,
  showHeader = true
}: ChartSkeletonProps) {
  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
      )}
      <CardContent>
        <div
          className="relative w-full rounded-lg overflow-hidden"
          style={{ height }}
        >
          {/* Chart area */}
          <Skeleton className="absolute inset-0" />

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={`y-${i}`} className="h-3 w-8" />
            ))}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-12 right-0 h-8 flex justify-between items-end px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`x-${i}`} className="h-3 w-12" />
            ))}
          </div>

          {/* Chart bars/lines representation */}
          <div className="absolute left-16 right-4 top-4 bottom-12 flex items-end justify-around gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={`bar-${i}`}
                className="flex-1"
                style={{
                  height: `${30 + Math.random() * 50}%`
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
