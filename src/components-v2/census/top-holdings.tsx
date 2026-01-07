'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InstrumentHolding } from '@/lib/models/census';
import { ExternalLink } from 'lucide-react';

interface TopHoldingsProps {
  holdings: InstrumentHolding[];
  rawData?: unknown;
}

export default function TopHoldingsV2({ holdings, rawData }: TopHoldingsProps) {
  const getReturnColor = (value: number) => {
    if (value > 0) return 'bg-green-100 text-green-800 border-green-300';
    if (value < 0) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const enableLinks = !!rawData; // Only enable links if we have raw data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
        <CardDescription>Most widely held instruments by popular investors</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-left py-3 px-2">Rank</th>
                <th className="text-left py-3 px-2">Asset</th>
                <th className="text-right py-3 px-2">Holders</th>
                <th className="text-right py-3 px-2">Avg Allocation</th>
                <th className="text-right py-3 px-2">Yesterday</th>
                <th className="text-right py-3 px-2">Week TD</th>
                <th className="text-right py-3 px-2">Month TD</th>
                {enableLinks && <th className="text-center py-3 px-2">Details</th>}
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding, index) => {
                const AssetContent = (
                  <div className="flex items-center gap-3">
                    {holding.imageUrl ? (
                      <img
                        src={holding.imageUrl}
                        alt={holding.instrumentName}
                        className="w-10 h-10 rounded-lg object-contain bg-gray-50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {holding.symbol?.charAt(0) || holding.instrumentName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium truncate max-w-[200px]">
                        {holding.instrumentName}
                      </div>
                      {holding.symbol && (
                        <div className="text-sm text-muted-foreground">
                          {holding.symbol}
                        </div>
                      )}
                    </div>
                  </div>
                );

                return (
                  <tr key={holding.instrumentId} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <span className="font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {enableLinks ? (
                        <Link
                          href={`/v2/asset/${holding.instrumentId}`}
                          className="hover:text-primary transition-colors"
                        >
                          {AssetContent}
                        </Link>
                      ) : (
                        AssetContent
                      )}
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      {holding.holdersCount}
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant="secondary">
                        {holding.averageAllocation.toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge
                        variant="outline"
                        className={getReturnColor(holding.yesterdayReturn || 0)}
                      >
                        {(holding.yesterdayReturn || 0).toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge
                        variant="outline"
                        className={getReturnColor(holding.weekTDReturn || 0)}
                      >
                        {(holding.weekTDReturn || 0).toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge
                        variant="outline"
                        className={getReturnColor(holding.monthTDReturn || 0)}
                      >
                        {(holding.monthTDReturn || 0).toFixed(2)}%
                      </Badge>
                    </td>
                    {enableLinks && (
                      <td className="text-center py-3 px-2">
                        <Link
                          href={`/v2/asset/${holding.instrumentId}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="text-xs">View</span>
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}