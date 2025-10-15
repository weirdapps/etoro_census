'use client';

import { useState } from 'react';
import { Search, TrendingUp, AlertCircle, User } from 'lucide-react';
import EliteGroupComparison from '@/components/intelligence/EliteGroupComparison';

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
      console.log('Public portfolio data loaded:', result.data);
    } catch (err) {
      console.error('Failed to fetch public portfolio:', err);
      setError('Failed to analyze portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            eToro Portfolio Analyzer
          </h1>
          <p className="text-gray-600">
            Compare any eToro investor's portfolio against 1,500+ top performers
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-6">
          <form onSubmit={handleAnalyze} className="bg-white rounded-lg shadow-lg p-4">
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
                  placeholder="e.g., plessas, jaynemesis"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Analyze
                  </>
                )}
              </button>
            </div>

            {/* Example usernames */}
            <div className="mt-3 text-sm text-gray-500">
              Try: <button
                type="button"
                onClick={() => setUsername('plessas')}
                className="text-green-600 hover:underline font-medium"
              >
                plessas
              </button>, <button
                type="button"
                onClick={() => setUsername('jaynemesis')}
                className="text-green-600 hover:underline font-medium"
              >
                jaynemesis
              </button>
            </div>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Analyzing {username}'s portfolio...</p>
            <p className="text-gray-500 text-sm mt-2">
              Comparing against elite investor groups
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && data && data.portfolio && (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    @{data.portfolio.username}
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">Portfolio Overview</p>
                </div>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">Total Value</div>
                  <div className="text-xl font-bold mt-1">
                    ${(data.portfolio.totalValue || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">YTD Return</div>
                  <div className={`text-xl font-bold mt-1 ${
                    (data.portfolio.ytdReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(data.portfolio.ytdReturn || 0) >= 0 ? '+' : ''}
                    {(data.portfolio.ytdReturn || 0).toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">Positions</div>
                  <div className="text-xl font-bold mt-1">
                    {data.portfolio.positionCount || 0}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">Risk Score</div>
                  <div className="text-xl font-bold mt-1">
                    {data.portfolio.riskScore || 'N/A'}/10
                  </div>
                </div>
              </div>

              {/* Top Positions */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Top 5 Holdings</h3>
                {data.portfolio.topPositions && data.portfolio.topPositions.length > 0 ? (
                  <div className="space-y-2">
                    {data.portfolio.topPositions.map((pos: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{pos.symbol || 'N/A'}</span>
                          {pos.instrumentName && (
                            <span className="text-xs text-gray-500 ml-2">
                              {pos.instrumentName}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          ${(pos.marketValue || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No position data available</p>
                )}
              </div>
            </div>

            {/* Elite Group Comparison */}
            {data.eliteGroupComparison && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Elite Group Comparison
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  See how {data.portfolio.username}'s portfolio compares to top investors
                </p>
                <EliteGroupComparison data={data.eliteGroupComparison} />
              </div>
            )}
          </div>
        )}

        {/* No Results Yet */}
        {!loading && !data && !error && hasSearched && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No results to display</p>
            <p className="text-gray-500 text-sm mt-2">
              Enter a username and click Analyze
            </p>
          </div>
        )}

        {/* Welcome State */}
        {!hasSearched && !loading && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                How it works
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Enter Username</h3>
                  <p className="text-sm text-gray-600">
                    Type any eToro investor's username
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Analyze Portfolio</h3>
                  <p className="text-sm text-gray-600">
                    Compare against 1,500+ top performers
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Get Insights</h3>
                  <p className="text-sm text-gray-600">
                    Discover opportunities and alignment
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
