'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PerformerStats } from '@/lib/models/census';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

interface TopPerformersProps {
  performers: PerformerStats[];
  rawData?: any;
}

export default function TopPerformersV2({ performers, rawData }: TopPerformersProps) {
  const getCashBadgeVariant = (cashPct: number): "default" | "secondary" | "destructive" | "outline" => {
    if (cashPct > 25) return 'default'; // green
    if (cashPct >= 5) return 'secondary'; // blue
    return 'destructive'; // red
  };

  const getCashBadgeColor = (cashPct: number): string => {
    if (cashPct > 25) return 'bg-green-100 text-green-800 border-green-300';
    if (cashPct >= 5) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getGainColor = (gain: number): string => {
    if (gain > 0) return 'text-green-600';
    if (gain < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGainIcon = (gain: number) => {
    if (gain > 0) return <TrendingUp className="h-3 w-3" />;
    if (gain < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  const enableLinks = !!rawData; // Only enable links if we have raw data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Copied Investors</CardTitle>
        <CardDescription>Top performing popular investors by number of copiers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-left py-3 px-2">Rank</th>
                <th className="text-left py-3 px-2">Investor</th>
                <th className="text-right py-3 px-2">Copiers</th>
                <th className="text-right py-3 px-2">Gain (YTD)</th>
                <th className="text-right py-3 px-2">Trades</th>
                <th className="text-right py-3 px-2">Win Ratio</th>
                <th className="text-right py-3 px-2">Risk Score</th>
                <th className="text-right py-3 px-2">Cash %</th>
                {enableLinks && <th className="text-center py-3 px-2">Profile</th>}
              </tr>
            </thead>
            <tbody>
              {performers.map((performer, index) => {
                const InvestorContent = (
                  <div className="flex items-center gap-3">
                    {performer.avatarUrl ? (
                      <img
                        src={performer.avatarUrl}
                        alt={performer.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(performer.fullName)}&background=random`;
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {performer.fullName?.charAt(0) || performer.username?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[180px]">
                        {performer.fullName && performer.fullName.length > 24
                          ? performer.fullName.substring(0, 24) + '...'
                          : performer.fullName || performer.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{performer.username}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <tr key={performer.username} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <span className="font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {enableLinks ? (
                        <Link
                          href={`/v2/investor/${performer.username}`}
                          className="hover:text-primary transition-colors"
                        >
                          {InvestorContent}
                        </Link>
                      ) : (
                        InvestorContent
                      )}
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      {performer.copiers.toLocaleString()}
                    </td>
                    <td className={`text-right py-3 px-2 font-medium ${getGainColor(performer.gain)}`}>
                      <div className="flex items-center justify-end gap-1">
                        {getGainIcon(performer.gain)}
                        <span>{performer.gain.toFixed(2)}%</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">
                      {performer.trades}
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {performer.winRatio.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">
                      <span className="font-medium">{performer.riskScore}</span>
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge
                        variant="outline"
                        className={getCashBadgeColor(performer.cashPercentage)}
                      >
                        {performer.cashPercentage.toFixed(1)}%
                      </Badge>
                    </td>
                    {enableLinks && (
                      <td className="text-center py-3 px-2">
                        <Link
                          href={`/v2/investor/${performer.username}`}
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