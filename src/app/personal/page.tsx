'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, User } from 'lucide-react';
import { ETORO_COUNTRY_MAPPING } from '@/lib/utils/country-mapping';
import { Disclaimer } from '@/components/Disclaimer';
import EliteGroupComparison from '@/components/intelligence/EliteGroupComparison';

export default function PersonalPortfolioPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/personal');
      const result = await response.json();

      // Check for API credentials error
      if (!response.ok || result.error === 'API_CREDENTIALS_MISSING') {
        throw new Error(result.message || 'Failed to load portfolio data. API credentials may be missing.');
      }

      console.log('Personal API Response:', {
        hasEliteGroupComparison: !!result.data?.eliteGroupComparison,
        comparisons: result.data?.eliteGroupComparison?.comparisons,
        broadMarketMissing: result.data?.eliteGroupComparison?.comparisons?.broadMarket?.topMissing,
        topCopiersMissing: result.data?.eliteGroupComparison?.comparisons?.topCopiers?.topMissing,
        topPerformersMissing: result.data?.eliteGroupComparison?.comparisons?.topPerformers?.topMissing,
        lowRiskMissing: result.data?.eliteGroupComparison?.comparisons?.lowRisk?.topMissing
      });

      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch personal portfolio:', error);
      setError(error instanceof Error ? error.message : 'Failed to load portfolio data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.portfolio) {
    return (
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Portfolio Intelligence</h1>
            <p className="text-gray-600">Real market insights based on 1,500+ top investors</p>
          </div>

          <div className="mb-8">
            <Disclaimer />
          </div>

          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Personal Portfolio Analysis Unavailable</h3>
                <p className="text-red-800 mb-4">
                  {error || 'This feature requires eToro API credentials to be configured.'}
                </p>
                <div className="bg-white bg-opacity-50 p-4 rounded border border-red-200">
                  <p className="text-sm font-semibold text-red-900 mb-2">For Vercel Deployment:</p>
                  <ol className="text-sm text-red-800 list-decimal list-inside space-y-1">
                    <li>Go to your Vercel Project Settings</li>
                    <li>Navigate to Environment Variables</li>
                    <li>Add <code className="bg-red-100 px-1 rounded">ETORO_API_KEY</code> and <code className="bg-red-100 px-1 rounded">ETORO_USER_KEY</code></li>
                    <li>Redeploy your application</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const portfolio = data.portfolio as any;
  const eliteGroupComparison = data.eliteGroupComparison as any;
  const holdings = data.holdings as any;

  console.log('Rendering Personal Page:', {
    hasEliteGroupComparison: !!eliteGroupComparison,
    comparisonsKeys: eliteGroupComparison?.comparisons ? Object.keys(eliteGroupComparison.comparisons) : [],
    broadMarketData: eliteGroupComparison?.comparisons?.broadMarket,
    topCopiersData: eliteGroupComparison?.comparisons?.topCopiers
  });

  // Get username from environment or use default
  const username = process.env.NEXT_PUBLIC_ETORO_USERNAME || 'You';

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Portfolio Intelligence</h1>
          <p className="text-gray-600">Your portfolio compared against 1,500+ most copied PIs</p>
        </div>

        <div className="mb-8">
          <Disclaimer />
        </div>

        <div className="space-y-6">
          {/* 1. Investor Information */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Portfolio</h2>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-gray-600">Personal Analysis</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-gray-600">Portfolio Size</div>
                <div className="text-2xl font-bold text-gray-900">
                  {portfolio.positionCount} assets
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Risk Score</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.risk?.riskMetrics?.overallRiskScore || 'N/A'}/10
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Portfolio Value</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${(portfolio.totalValue || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">YTD Return</div>
                <div className={`text-2xl font-bold ${
                  (portfolio.ytdProfitPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(portfolio.ytdProfitPercent || 0) >= 0 ? '+' : ''}
                  {(portfolio.ytdProfitPercent || 0).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Cash</div>
                <div className="text-2xl font-bold text-gray-900">
                  {((portfolio.cashBalance / (portfolio.totalValue + portfolio.cashBalance)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* 2. Top Holdings */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Top Holdings</h2>
            {holdings?.yourHoldings && holdings.yourHoldings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Rank</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Logo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Market Value</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Allocation</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Popular</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holdings.yourHoldings.slice(0, 20).map((pos: any, i: number) => {
                      const logoUrl = pos.instrumentId
                        ? `https://etoro-cdn.etorostatic.com/market-avatars/${pos.instrumentId}/150x150.png`
                        : null;

                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            #{i + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {logoUrl && (
                              <img
                                src={logoUrl}
                                alt={pos.symbol}
                                className="w-8 h-8 rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{pos.symbol}</div>
                              <div className="text-xs text-gray-500">{pos.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-gray-900">
                              ${Number(pos.marketValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-bold text-gray-900">
                              {pos.allocation}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="text-sm">
                              <div className={`font-medium ${
                                Number(pos.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {Number(pos.profit || 0) >= 0 ? '+' : ''}${Number(pos.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className={`text-xs ${
                                Number(pos.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({pos.profitPercent})
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {pos.isPopular && (
                              <span className="text-green-600 text-lg">✓</span>
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
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio Comparison</h2>
            <EliteGroupComparison data={eliteGroupComparison} />
          </div>
        </div>
      </div>
    </div>
  );
}
