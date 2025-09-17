'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AssetService, AssetDetails } from '@/lib/services/asset-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [assetDetails, setAssetDetails] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssetDetails = () => {
      try {
        // Get raw data from sessionStorage
        const rawDataStr = sessionStorage.getItem('censusRawData');
        if (!rawDataStr) {
          setError('No census data available. Please run an analysis first.');
          setLoading(false);
          return;
        }

        const rawData = JSON.parse(rawDataStr);
        const instrumentId = parseInt(params.instrumentId as string);

        const details = AssetService.getAssetDetails(instrumentId, rawData);
        if (!details) {
          setError('Asset not found');
        } else {
          setAssetDetails(details);
        }
      } catch (err) {
        console.error('Error loading asset details:', err);
        setError('Failed to load asset details');
      } finally {
        setLoading(false);
      }
    };

    loadAssetDetails();
  }, [params.instrumentId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (error || !assetDetails) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-16">
          <p className="text-destructive mb-4">{error || 'Asset not found'}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getReturnColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-blue-600';
  };

  const getReturnIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {/* Asset Header */}
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-start gap-6">
          {assetDetails.imageUrl && (
            <img
              src={assetDetails.imageUrl}
              alt={assetDetails.displayName}
              className="w-24 h-24 rounded-lg"
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{assetDetails.displayName}</h1>
            <p className="text-xl text-muted-foreground mt-1">{assetDetails.symbol}</p>
            <div className="flex items-center gap-4 mt-4">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                ${assetDetails.currentPrice.toFixed(2)}
              </Badge>
              {assetDetails.priceSource && (
                <span className="text-sm text-muted-foreground">{assetDetails.priceSource}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Yesterday</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 text-2xl font-bold ${getReturnColor(assetDetails.returns.yesterday)}`}>
              {getReturnIcon(assetDetails.returns.yesterday)}
              <span>{assetDetails.returns.yesterday.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Week TD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 text-2xl font-bold ${getReturnColor(assetDetails.returns.weekTD)}`}>
              {getReturnIcon(assetDetails.returns.weekTD)}
              <span>{assetDetails.returns.weekTD.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Month TD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 text-2xl font-bold ${getReturnColor(assetDetails.returns.monthTD)}`}>
              {getReturnIcon(assetDetails.returns.monthTD)}
              <span>{assetDetails.returns.monthTD.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Holder Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Holders</span>
              <span className="font-bold">{assetDetails.totalHolders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Allocation</span>
              <span className="font-bold">{assetDetails.averageAllocation.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Allocation Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assetDetails.allocationDistribution.map(dist => (
              <div key={dist.range} className="flex justify-between">
                <span className="text-muted-foreground">{dist.range}</span>
                <span className="font-bold">{dist.count} investors</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Holders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Holders</CardTitle>
          <CardDescription>Investors with the largest allocations to this asset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Investor</th>
                  <th className="text-right py-3 px-4">Allocation</th>
                  <th className="text-right py-3 px-4">Gain (YTD)</th>
                  <th className="text-right py-3 px-4">Copiers</th>
                  <th className="text-right py-3 px-4">Risk Score</th>
                  <th className="text-right py-3 px-4">Position P/L</th>
                </tr>
              </thead>
              <tbody>
                {assetDetails.holders.slice(0, 20).map((holder, index) => (
                  <tr key={holder.username} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/v2/investor/${holder.username}`}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        <span className="text-muted-foreground">{index + 1}.</span>
                        {holder.avatarUrl ? (
                          <img
                            src={holder.avatarUrl}
                            alt={holder.fullName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs">{holder.fullName.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{holder.fullName}</div>
                          <div className="text-sm text-muted-foreground">@{holder.username}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="text-right py-3 px-4">
                      <Badge variant="outline">{holder.allocation.toFixed(2)}%</Badge>
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getReturnColor(holder.gain)}`}>
                      {holder.gain.toFixed(2)}%
                    </td>
                    <td className="text-right py-3 px-4">{holder.copiers.toLocaleString()}</td>
                    <td className="text-right py-3 px-4">{holder.riskScore}</td>
                    <td className={`text-right py-3 px-4 font-medium ${getReturnColor(holder.position.netProfit)}`}>
                      {holder.position.netProfit.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}