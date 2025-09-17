'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { InvestorService, InvestorProfile } from '@/lib/services/investor-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, TrendingUp, TrendingDown, Users, Activity,
  Calendar, Target, Award, AlertTriangle, DollarSign
} from 'lucide-react';

export default function InvestorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvestorProfile = () => {
      try {
        // Get raw data from sessionStorage
        const rawDataStr = sessionStorage.getItem('censusRawData');
        if (!rawDataStr) {
          setError('No census data available. Please run an analysis first.');
          setLoading(false);
          return;
        }

        const rawData = JSON.parse(rawDataStr);
        const username = params.username as string;

        const investorProfile = InvestorService.getInvestorProfile(username, rawData);
        if (!investorProfile) {
          setError('Investor not found');
        } else {
          setProfile(investorProfile);
        }
      } catch (err) {
        console.error('Error loading investor profile:', err);
        setError('Failed to load investor profile');
      } finally {
        setLoading(false);
      }
    };

    loadInvestorProfile();
  }, [params.username]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Loading investor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-16">
          <p className="text-destructive mb-4">{error || 'Investor not found'}</p>
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

  const getCashBadgeVariant = (cashPct: number): "default" | "secondary" | "destructive" | "outline" => {
    if (cashPct > 25) return 'default'; // green
    if (cashPct >= 5) return 'secondary'; // blue
    return 'destructive'; // red
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {/* Profile Header */}
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-start gap-6">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName}
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <span className="text-3xl font-bold">{profile.fullName.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{profile.fullName}</h1>
              {profile.isVerified && (
                <Badge variant="default" className="gap-1">
                  <Award className="h-3 w-3" /> Verified
                </Badge>
              )}
              {profile.isPi && (
                <Badge variant="secondary">Popular Investor</Badge>
              )}
            </div>
            <p className="text-xl text-muted-foreground mt-1">@{profile.username}</p>
            {profile.country && (
              <p className="text-sm text-muted-foreground mt-2">{profile.country}</p>
            )}
            {profile.aboutMe && (
              <p className="mt-4 text-sm">{profile.aboutMe}</p>
            )}
          </div>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gain (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 text-2xl font-bold ${getReturnColor(profile.gain)}`}>
              {getReturnIcon(profile.gain)}
              <span>{profile.gain.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Copiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>{profile.copiers.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <span>{profile.riskScore}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Win Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold text-green-600">
              <Target className="h-5 w-5" />
              <span>{profile.winRatio.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Positions</span>
              <span className="font-bold">{profile.portfolio.positionsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cash Position</span>
              <Badge variant={getCashBadgeVariant(profile.portfolio.cashPercentage)}>
                {profile.portfolio.cashPercentage.toFixed(1)}%
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Portfolio P/L</span>
              <span className={`font-bold ${getReturnColor(profile.portfolio.profitLossPercentage)}`}>
                {profile.portfolio.profitLossPercentage.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trades (YTD)</span>
              <span className="font-bold">{profile.trades}</span>
            </div>
          </CardContent>
        </Card>

        {profile.tradeInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Trading Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Weeks</span>
                <span className="font-bold">{profile.tradeInfo.activeWeeksPct.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profitable Weeks</span>
                <span className="font-bold text-green-600">
                  {profile.tradeInfo.profitableWeeksPct.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Position Size</span>
                <span className="font-bold">${profile.tradeInfo.avgPosSize.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Drawdown</span>
                <span className="font-bold text-red-600">
                  {profile.tradeInfo.weeklyDd.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Leverage Distribution */}
      {profile.tradeInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Leverage Usage</CardTitle>
            <CardDescription>Distribution of leverage across trades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Low Leverage (1x)</span>
                <span className="text-sm font-medium">{profile.tradeInfo.lowLeveragePct.toFixed(0)}%</span>
              </div>
              <Progress value={profile.tradeInfo.lowLeveragePct} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Medium Leverage (2x)</span>
                <span className="text-sm font-medium">{profile.tradeInfo.mediumLeveragePct.toFixed(0)}%</span>
              </div>
              <Progress value={profile.tradeInfo.mediumLeveragePct} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">High Leverage (5x+)</span>
                <span className="text-sm font-medium">{profile.tradeInfo.highLeveragePct.toFixed(0)}%</span>
              </div>
              <Progress value={profile.tradeInfo.highLeveragePct} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
          <CardDescription>All open positions in the portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Asset</th>
                  <th className="text-right py-3 px-4">Allocation</th>
                  <th className="text-right py-3 px-4">P/L</th>
                  <th className="text-right py-3 px-4">Leverage</th>
                  <th className="text-center py-3 px-4">Direction</th>
                  <th className="text-right py-3 px-4">Open Date</th>
                </tr>
              </thead>
              <tbody>
                {profile.portfolio.positions.map((position, index) => (
                  <tr key={`${position.instrumentId}-${index}`} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/v2/asset/${position.instrumentId}`}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        {position.instrumentImage && (
                          <img
                            src={position.instrumentImage}
                            alt={position.instrumentName || ''}
                            className="w-8 h-8 rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{position.instrumentName || `Asset ${position.instrumentId}`}</div>
                          {position.instrumentSymbol && (
                            <div className="text-sm text-muted-foreground">{position.instrumentSymbol}</div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="text-right py-3 px-4">
                      <Badge variant="outline">{position.allocation.toFixed(2)}%</Badge>
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getReturnColor(position.netProfit)}`}>
                      {position.netProfit.toFixed(2)}%
                    </td>
                    <td className="text-right py-3 px-4">{position.leverage}x</td>
                    <td className="text-center py-3 px-4">
                      <Badge variant={position.isBuy ? 'default' : 'destructive'}>
                        {position.isBuy ? 'BUY' : 'SELL'}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                      {new Date(position.openDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trading Activity Timeline */}
      {profile.tradeInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">First Activity:</span>
              <span>{new Date(profile.tradeInfo.firstActivity).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last Activity:</span>
              <span>{new Date(profile.tradeInfo.lastActivity).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}