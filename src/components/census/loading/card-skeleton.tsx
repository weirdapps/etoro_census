'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CardSkeletonProps {
  showIcon?: boolean;
  showDescription?: boolean;
}

export function CardSkeleton({
  showIcon = true,
  showDescription = true
}: CardSkeletonProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        {showIcon && <Skeleton className="h-4 w-4 rounded-full" />}
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        {showDescription && <Skeleton className="h-3 w-32" />}
      </CardContent>
    </Card>
  );
}

interface MetricCardsSkeletonProps {
  count?: number;
}

export function MetricCardsSkeleton({ count = 4 }: MetricCardsSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
