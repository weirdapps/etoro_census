'use client';

import { useState } from 'react';
import { AlertCircle, User } from 'lucide-react';
import { ETORO_COUNTRY_MAPPING } from '@/lib/utils/country-mapping';
import { Disclaimer } from '@/components/Disclaimer';

export default function PublicPortfolioPage() {
  const [username, setUsername] = useState('');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
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
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            eToro Portfolio Analyzer
          </h1>
          <p className="text-gray-600">
            Compare any investor's portfolio against 1,500+ most copied PIs
          </p>
        </div>

        <div className="mb-8">
          <Disclaimer />
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <form onSubmit={handleAnalyze} className="bg-white rounded-lg border border-gray-300 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              eToro Username
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing {username}'s portfolio...</p>
          </div>
        )}

        {/* Results */}
        {!loading && data && data.portfolio && (
          <div className="space-y-6">
            {/* 1. Investor Information */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-start gap-6 mb-6">
                <div className="flex-shrink-0">
                  {data.portfolio.avatar ? (
                    <img
                      src={data.portfolio.avatar}
                      alt={data.portfolio.fullName}
                      className="w-20 h-20 rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h2 className="text-2xl font-bold text-gray-900">{data.portfolio.fullName}</h2>
                    {data.portfolio.isPopularInvestor && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded whitespace-nowrap">
                        Popular Investor {data.portfolio.piLevel ? `(Level ${data.portfolio.piLevel})` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-gray-600">@{data.portfolio.username}</p>
                    {data.portfolio.country && ETORO_COUNTRY_MAPPING[data.portfolio.country] && (
                      <span className="text-xl" title={ETORO_COUNTRY_MAPPING[data.portfolio.country].name}>
                        {ETORO_COUNTRY_MAPPING[data.portfolio.country].flag}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Portfolio Size</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.portfolio.positionCount} assets
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Risk Score</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.portfolio.riskScore}/10
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Win Ratio</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.portfolio.winRatio?.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">YTD Return</div>
                  <div className={`text-2xl font-bold ${
                    (data.portfolio.ytdReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(data.portfolio.ytdReturn || 0) >= 0 ? '+' : ''}
                    {(data.portfolio.ytdReturn || 0).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Cash</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.portfolio.cashPercent?.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Top Holdings */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Top Holdings</h2>
              {data.portfolio.topPositions && data.portfolio.topPositions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Rank</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Logo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Your Allocation</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Popular Asset</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Week TD %</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">MTD %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.portfolio.topPositions.slice(0, 10).map((pos: any, i: number) => {
                        // Find penetration from broadMarketHoldings (uses 'penetration' field)
                        let isPopular = false;
                        if (data.broadMarketHoldings && Array.isArray(data.broadMarketHoldings)) {
                          const broadHolding = data.broadMarketHoldings.find(
                            (h: any) => h.instrumentId === pos.instrumentId || h.symbol?.toUpperCase() === pos.symbol?.toUpperCase()
                          );
                          if (broadHolding && broadHolding.penetration >= 20) {
                            isPopular = true;
                          }
                        }

                        // Find performance data from performanceData (census file has weekTDReturn, monthTDReturn)
                        let weekTDReturn = null;
                        let mtdReturn = null;
                        if (data.performanceData && Array.isArray(data.performanceData)) {
                          const perfHolding = data.performanceData.find(
                            (h: any) => h.instrumentId === pos.instrumentId || h.symbol?.toUpperCase() === pos.symbol?.toUpperCase()
                          );
                          if (perfHolding) {
                            weekTDReturn = perfHolding.weekTDReturn !== undefined ? perfHolding.weekTDReturn : null;
                            mtdReturn = perfHolding.monthTDReturn !== undefined ? perfHolding.monthTDReturn : null;
                          }
                        }

                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              #{i + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {pos.logoUrl && (
                                <img
                                  src={pos.logoUrl}
                                  alt={pos.symbol}
                                  className="w-8 h-8 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{pos.symbol}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="text-sm font-bold text-gray-900">
                                {(pos.marketValue || 0).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {isPopular && (
                                <span className="text-green-600 text-lg">✓</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {weekTDReturn !== null ? (
                                <span className={`text-sm font-medium ${
                                  weekTDReturn >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {weekTDReturn >= 0 ? '+' : ''}{weekTDReturn.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {mtdReturn !== null ? (
                                <span className={`text-sm font-medium ${
                                  mtdReturn >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {mtdReturn >= 0 ? '+' : ''}{mtdReturn.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No holdings data available</p>
              )}
            </div>

            {/* 3. Portfolio Comparison */}
            {data.eliteGroupComparison && (
              <div className="bg-white rounded-lg border border-gray-300 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio Comparison</h2>

                {/* Recommendation */}
                {data.eliteGroupComparison.insights?.recommendation && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-gray-800">
                      {data.eliteGroupComparison.insights.recommendation}
                    </p>
                  </div>
                )}

                {/* Breakdown by Investor Group */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Missing by Investor Group
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(data.eliteGroupComparison.comparisons).map(([key, group]: [string, any]) => (
                      <div key={key} className="border border-gray-200 rounded p-4">
                        <div className="text-sm font-semibold text-gray-900 mb-3">
                          {group.group}
                        </div>
                        {group.topMissing && group.topMissing.length > 0 && (
                          <div className="space-y-2">
                            {group.topMissing.slice(0, 5).map((stock: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  {stock.logoUrl && (
                                    <img
                                      src={stock.logoUrl}
                                      alt={stock.symbol}
                                      className="w-6 h-6 rounded-full"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <span className="font-medium text-gray-900">{stock.symbol}</span>
                                </div>
                                <span className="text-gray-600">{stock.penetration}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* New Analysis */}
          </div>
        )}

        {/* Welcome State */}
        {!hasSearched && !loading && (
          <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Enter any eToro username to see their portfolio analysis, top holdings,
              and discover which assets elite investors hold that they're missing.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-lg font-semibold text-gray-900 mb-2">1. Enter Username</div>
                <p className="text-sm text-gray-600">
                  Type any eToro investor's username
                </p>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 mb-2">2. View Analysis</div>
                <p className="text-sm text-gray-600">
                  See performance stats and top holdings
                </p>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 mb-2">3. Get Suggestions</div>
                <p className="text-sm text-gray-600">
                  Discover assets held by top performers
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
