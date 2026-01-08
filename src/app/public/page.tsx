'use client';

import { useState } from 'react';
import { AlertCircle, Search, User } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto">
      {/* Search */}
      <div className="mb-12">
        <form onSubmit={handleAnalyze} className="flex gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter eToro username..."
              className="block w-full pl-14 pr-4 py-4 text-lg border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-all"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="px-8 py-4 text-lg bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-8 p-6 rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <span className="text-lg text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground">Analyzing {username}&apos;s portfolio...</p>
        </div>
      )}

      {/* Results */}
      {!loading && data && data.portfolio && (
        <div className="space-y-8">
          {/* Investor Card */}
          <div className="p-8 rounded-2xl border-2 border-border">
            <div className="flex items-center gap-6 mb-8">
              {data.portfolio.avatar ? (
                <img src={data.portfolio.avatar} alt={data.portfolio.fullName} className="w-20 h-20 rounded-full" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h2 className="text-2xl font-bold">{data.portfolio.fullName}</h2>
                  {data.portfolio.country && ETORO_COUNTRY_MAPPING[data.portfolio.country] && (
                    <span className="text-2xl" title={ETORO_COUNTRY_MAPPING[data.portfolio.country].name}>
                      {ETORO_COUNTRY_MAPPING[data.portfolio.country].flag}
                    </span>
                  )}
                  {data.portfolio.isPopularInvestor && (
                    <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                      Popular Investor{data.portfolio.piLevel ? ` L${data.portfolio.piLevel}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">@{data.portfolio.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-6">
              {[
                { label: 'Positions', value: data.portfolio.positionCount },
                { label: 'Risk', value: `${data.portfolio.riskScore}/10` },
                { label: 'Win Rate', value: `${data.portfolio.winRatio?.toFixed(0)}%` },
                { label: 'YTD', value: `${(data.portfolio.ytdReturn || 0) >= 0 ? '+' : ''}${(data.portfolio.ytdReturn || 0).toFixed(1)}%`, color: (data.portfolio.ytdReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: 'Cash', value: `${data.portfolio.cashPercent?.toFixed(0)}%` },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">{stat.label}</div>
                  <div className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Holdings */}
          {data.portfolio.topPositions && data.portfolio.topPositions.length > 0 && (
            <div className="p-8 rounded-2xl border-2 border-border">
              <h3 className="text-xl font-semibold mb-6">Top Holdings</h3>
              <div className="space-y-4">
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
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                      <span className="w-8 text-lg text-muted-foreground">{i + 1}</span>
                      <div className="flex items-center gap-3 flex-1">
                        {pos.logoUrl && (
                          <img src={pos.logoUrl} alt={pos.symbol} className="w-8 h-8 rounded-full"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <span className="text-lg font-medium">{pos.symbol}</span>
                        {isPopular && <span className="text-green-600 text-lg">✓</span>}
                      </div>
                      <div className="text-right w-20">
                        <div className="text-lg font-semibold">{(pos.marketValue || 0).toFixed(1)}%</div>
                      </div>
                      <div className="text-right w-24">
                        {weekTDReturn !== null ? (
                          <span className={`text-lg ${weekTDReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {weekTDReturn >= 0 ? '+' : ''}{weekTDReturn.toFixed(1)}%
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </div>
                      <div className="text-right w-24">
                        {mtdReturn !== null ? (
                          <span className={`text-lg ${mtdReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {mtdReturn >= 0 ? '+' : ''}{mtdReturn.toFixed(1)}%
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing Assets */}
          {data.eliteGroupComparison && (
            <div className="p-8 rounded-2xl border-2 border-border">
              <h3 className="text-xl font-semibold mb-6">Missing from Popular Portfolios</h3>
              {data.eliteGroupComparison.insights?.recommendation && (
                <p className="text-muted-foreground mb-6 p-4 bg-muted/50 rounded-xl">
                  {data.eliteGroupComparison.insights.recommendation}
                </p>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(data.eliteGroupComparison.comparisons).map(([key, group]) => (
                  <div key={key} className="p-6 rounded-xl border border-border">
                    <div className="text-sm font-medium text-muted-foreground mb-4">{group.group}</div>
                    {group.topMissing && group.topMissing.length > 0 && (
                      <div className="space-y-3">
                        {group.topMissing.slice(0, 5).map((stock, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {stock.logoUrl && (
                                <img src={stock.logoUrl} alt={stock.symbol} className="w-6 h-6 rounded-full"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              <span className="font-medium">{stock.symbol}</span>
                            </div>
                            <span className="text-muted-foreground">{stock.penetration}</span>
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

      {/* Welcome */}
      {!hasSearched && !loading && (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground mb-8">
            Enter a username to analyze their portfolio
          </p>
          <div className="flex justify-center gap-12 text-muted-foreground">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <div>Stats</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📈</div>
              <div>Performance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">💡</div>
              <div>Insights</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
