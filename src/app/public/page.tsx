'use client';

import { useState } from 'react';
import { AlertCircle, User } from 'lucide-react';
import { ETORO_COUNTRY_MAPPING } from '@/lib/utils/country-mapping';

interface PortfolioPosition {
  instrumentId: number;
  symbol: string;
  logoUrl?: string;
  marketValue?: number;
}

interface PortfolioData {
  avatar?: string;
  fullName?: string;
  username?: string;
  country?: number;
  isPopularInvestor?: boolean;
  piLevel?: number;
  positionCount?: number;
  riskScore?: number;
  winRatio?: number;
  ytdReturn?: number;
  cashPercent?: number;
  topPositions?: PortfolioPosition[];
}

interface BroadMarketHolding {
  instrumentId: number;
  symbol?: string;
  penetration: number;
}

interface PerformanceData {
  instrumentId: number;
  symbol?: string;
  weekTDReturn?: number;
  monthTDReturn?: number;
}

interface ComparisonGroup {
  group: string;
  topMissing?: Array<{
    symbol: string;
    logoUrl?: string;
    penetration: string;
  }>;
}

interface EliteGroupComparison {
  insights?: {
    recommendation?: string;
  };
  comparisons: Record<string, ComparisonGroup>;
}

interface PublicPortfolioResponse {
  portfolio?: PortfolioData;
  broadMarketHoldings?: BroadMarketHolding[];
  performanceData?: PerformanceData[];
  eliteGroupComparison?: EliteGroupComparison;
}

export default function PublicPortfolioPage() {
  const [username, setUsername] = useState('');
  const [data, setData] = useState<PublicPortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/public/${username.trim()}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to analyze portfolio');
        return;
      }

      setData(result.data);
    } catch (err) {
      console.error('Failed to fetch public portfolio:', err);
      setError('Failed to analyze portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header + Search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
          <p className="text-sm text-muted-foreground">
            Compare any portfolio against 1,500+ most copied PIs
          </p>
        </div>
        <form onSubmit={handleAnalyze} className="flex gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter eToro username..."
              className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-background dark:border-border"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Analyzing {username}&apos;s portfolio...</p>
        </div>
      )}

      {/* Results */}
      {!loading && data && data.portfolio && (
        <div className="space-y-4">
          {/* Investor Information */}
          <div className="bg-white dark:bg-card rounded-lg border p-4">
            <div className="flex items-center gap-4 mb-4">
              {data.portfolio.avatar ? (
                <img src={data.portfolio.avatar} alt={data.portfolio.fullName} className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold truncate">{data.portfolio.fullName}</h2>
                  {data.portfolio.country && ETORO_COUNTRY_MAPPING[data.portfolio.country] && (
                    <span title={ETORO_COUNTRY_MAPPING[data.portfolio.country].name}>
                      {ETORO_COUNTRY_MAPPING[data.portfolio.country].flag}
                    </span>
                  )}
                  {data.portfolio.isPopularInvestor && (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                      PI{data.portfolio.piLevel ? ` L${data.portfolio.piLevel}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{data.portfolio.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Positions</div>
                <div className="text-lg font-bold">{data.portfolio.positionCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Risk</div>
                <div className="text-lg font-bold">{data.portfolio.riskScore}/10</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
                <div className="text-lg font-bold">{data.portfolio.winRatio?.toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">YTD</div>
                <div className={`text-lg font-bold ${(data.portfolio.ytdReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(data.portfolio.ytdReturn || 0) >= 0 ? '+' : ''}{(data.portfolio.ytdReturn || 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cash</div>
                <div className="text-lg font-bold">{data.portfolio.cashPercent?.toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Top Holdings */}
          <div className="bg-white dark:bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3">Top Holdings</h3>
            {data.portfolio.topPositions && data.portfolio.topPositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="py-2 text-left font-medium">#</th>
                      <th className="py-2 text-left font-medium">Asset</th>
                      <th className="py-2 text-right font-medium">Alloc</th>
                      <th className="py-2 text-center font-medium">Popular</th>
                      <th className="py-2 text-right font-medium">WTD</th>
                      <th className="py-2 text-right font-medium">MTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.portfolio.topPositions.slice(0, 10).map((pos, i) => {
                      let isPopular = false;
                      if (data.broadMarketHoldings) {
                        const broadHolding = data.broadMarketHoldings.find(
                          (h) => h.instrumentId === pos.instrumentId || h.symbol?.toUpperCase() === pos.symbol?.toUpperCase()
                        );
                        if (broadHolding && broadHolding.penetration >= 20) isPopular = true;
                      }

                      let weekTDReturn: number | null = null;
                      let mtdReturn: number | null = null;
                      if (data.performanceData) {
                        const perfHolding = data.performanceData.find(
                          (h) => h.instrumentId === pos.instrumentId || h.symbol?.toUpperCase() === pos.symbol?.toUpperCase()
                        );
                        if (perfHolding) {
                          weekTDReturn = perfHolding.weekTDReturn ?? null;
                          mtdReturn = perfHolding.monthTDReturn ?? null;
                        }
                      }

                      return (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="py-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              {pos.logoUrl && (
                                <img src={pos.logoUrl} alt={pos.symbol} className="w-5 h-5 rounded-full"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              <span className="font-medium">{pos.symbol}</span>
                            </div>
                          </td>
                          <td className="py-2 text-right font-medium">{(pos.marketValue || 0).toFixed(1)}%</td>
                          <td className="py-2 text-center">{isPopular && <span className="text-green-600">✓</span>}</td>
                          <td className="py-2 text-right">
                            {weekTDReturn !== null ? (
                              <span className={weekTDReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {weekTDReturn >= 0 ? '+' : ''}{weekTDReturn.toFixed(1)}%
                              </span>
                            ) : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="py-2 text-right">
                            {mtdReturn !== null ? (
                              <span className={mtdReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {mtdReturn >= 0 ? '+' : ''}{mtdReturn.toFixed(1)}%
                              </span>
                            ) : <span className="text-muted-foreground">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No holdings data available</p>
            )}
          </div>

          {/* Portfolio Comparison */}
          {data.eliteGroupComparison && (
            <div className="bg-white dark:bg-card rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3">Missing from Popular Portfolios</h3>
              {data.eliteGroupComparison.insights?.recommendation && (
                <p className="text-xs text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
                  {data.eliteGroupComparison.insights.recommendation}
                </p>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(data.eliteGroupComparison.comparisons).map(([key, group]) => (
                  <div key={key} className="border rounded p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">{group.group}</div>
                    {group.topMissing && group.topMissing.length > 0 && (
                      <div className="space-y-1">
                        {group.topMissing.slice(0, 5).map((stock, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1.5">
                              {stock.logoUrl && (
                                <img src={stock.logoUrl} alt={stock.symbol} className="w-4 h-4 rounded-full"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              <span className="font-medium">{stock.symbol}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{stock.penetration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Welcome State */}
      {!hasSearched && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Enter a username above to analyze their portfolio
          </p>
          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <span>📊 Stats & holdings</span>
            <span>📈 Performance data</span>
            <span>💡 Missing assets</span>
          </div>
        </div>
      )}
    </div>
  );
}
