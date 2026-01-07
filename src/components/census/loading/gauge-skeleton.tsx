'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface GaugeSkeletonProps {
  showHeader?: boolean;
}

export function GaugeSkeleton({ showHeader = true }: GaugeSkeletonProps) {
  return (
    <Card>
      {showHeader && (
        <CardHeader className="text-center">
          <Skeleton className="h-6 w-48 mx-auto" />
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center justify-center py-8">
        {/* Gauge arc representation */}
        <div className="relative w-48 h-24 mb-4">
          <Skeleton className="absolute inset-0 rounded-t-full" />
        </div>

        {/* Value display */}
        <Skeleton className="h-10 w-20 mb-2" />

        {/* Status text */}
        <Skeleton className="h-4 w-32" />

        {/* Scale labels */}
        <div className="flex justify-between w-48 mt-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}
