'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart3, Shield, Target,
  AlertCircle, CheckCircle, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import EliteGroupComparison from '@/components/intelligence/EliteGroupComparison';
import { Disclaimer } from '@/components/Disclaimer';

export default function SimplifiedIntelligencePage() {
  const [activeTab, setActiveTab] = useState('performance');
  const [data, setData] = useState<Record<string, unknown>>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing intelligence analysis...');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadingMessage('Fetching your portfolio data...');

    try {
      // Simulate progressive loading messages
      setTimeout(() => setLoadingMessage('Analyzing market trends...'), 1000);
      setTimeout(() => setLoadingMessage('Comparing with top investors...'), 2000);

      const response = await fetch('/api/personal');
      const result = await response.json();

      // Update loading message with actual portfolio count
      if (result.data?.portfolio) {
        setLoadingMessage(`Loading ${result.data.portfolio.positionCount} positions...`);
      }

      setData(result.data);
      console.log('Intelligence data loaded:', result.data);
      console.log('Portfolio data:', result.data?.portfolio);
    } catch (error) {
      console.error('Failed to fetch intelligence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'holdings', label: 'Top Holdings', icon: Target },
    { id: 'risk', label: 'Risk Analysis', icon: Shield },
    { id: 'opportunities', label: 'Opportunities', icon: TrendingUp }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Intelligence</h1>
          <p className="text-sm text-gray-600 mt-1">Real market insights based on 1,500+ top investors</p>
        </div>

        <div className="mb-6">
          <Disclaimer />
        </div>

        {/* Portfolio Summary Cards */}
        {data?.portfolio ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-lg shadow p-3">
              <div className="text-xs text-gray-600">Portfolio Value</div>
              <div className="text-xl font-bold mt-1">${(data.portfolio.totalValue || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3">
              <div className="text-xs text-gray-600">Assets</div>
              <div className="text-xl font-bold mt-1">{data.portfolio.positionCount || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3">
              <div className="text-xs text-gray-600">Cash</div>
              <div className="text-xl font-bold mt-1">${(data.portfolio.cashBalance || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3">
              <div className="text-xs text-gray-600">Risk</div>
              <div className="text-xl font-bold mt-1">{data.risk?.riskMetrics?.overallRiskScore || 'N/A'}/10</div>
            </div>
            <div className="bg-white rounded-lg shadow p-3">
              <div className="text-xs text-gray-600">Return</div>
              <div className={`text-xl font-bold mt-1 ${data.portfolio.ytdProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.portfolio.ytdProfitPercent >= 0 ? '+' : ''}{(data.portfolio.ytdProfitPercent || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <p className="text-yellow-800">Portfolio data not available. Data state: {JSON.stringify(!!data)}, Portfolio state: {JSON.stringify(!!data?.portfolio)}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex space-x-1 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-4">
          {activeTab === 'performance' && data?.performance && (
            <PerformanceTab data={data.performance} />
          )}
          {activeTab === 'holdings' && data?.holdings && (
            <HoldingsTab data={data.holdings} />
          )}
          {activeTab === 'risk' && data?.risk && (
            <RiskTab data={data.risk} />
          )}
          {activeTab === 'opportunities' && (
            <OpportunitiesTab
              eliteGroups={data?.eliteGroupComparison}
              smartMoney={data?.smartMoney}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PerformanceTab({ data }: { data: Record<string, unknown> }) {
  const isOutperforming = data.comparison?.status === 'OUTPERFORMING';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Performance Comparison</h2>

      {/* Main Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Your Portfolio</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>YTD Return:</span>
              <span className="font-bold">{data.yourPerformance?.ytdReturn}</span>
            </div>
            <div className="flex justify-between">
              <span>Portfolio Value:</span>
              <span className="font-bold">{data.yourPerformance?.portfolioValue}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Balance:</span>
              <span className="font-bold">{data.yourPerformance?.cashBalance}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Value:</span>
              <span className="font-bold">{data.yourPerformance?.totalValue}</span>
            </div>
            <div className="flex justify-between">
              <span>Positions:</span>
              <span className="font-bold">{data.yourPerformance?.positionCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Market Average</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>YTD Return:</span>
              <span className="font-bold">{data.marketAverages?.ytdReturn}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Positions:</span>
              <span className="font-bold">{data.marketAverages?.averagePositions}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Win Rate:</span>
              <span className="font-bold">{data.marketAverages?.averageWinRate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Status */}
      <div className={`p-4 rounded-lg ${isOutperforming ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isOutperforming ? (
              <ArrowUpRight className="w-6 h-6 text-green-600 mr-2" />
            ) : (
              <ArrowDownRight className="w-6 h-6 text-red-600 mr-2" />
            )}
            <div>
              <p className="font-semibold text-lg">{data.comparison?.message}</p>
              <p className="text-sm text-gray-600">
                Performance: {data.comparison?.outperformance} | {data.comparison?.percentileRank}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HoldingsTab({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Top Holdings Analysis</h2>
        <div className="text-sm text-gray-600">
          Coverage: <span className="font-bold">{data.yourStats?.coverageOfTop20}</span>
        </div>
      </div>

      {/* Top Holdings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Rank</th>
              <th className="text-left py-2">Symbol</th>
              <th className="text-left py-2">Held By</th>
              <th className="text-left py-2">Yesterday</th>
              <th className="text-left py-2">Week TD</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.topHoldings?.slice(0, 10).map((holding: Record<string, unknown>) => (
              <tr key={holding.rank} className="border-b">
                <td className="py-2">{holding.rank}</td>
                <td className="py-2 font-semibold">{holding.symbol}</td>
                <td className="py-2">{holding.heldBy}</td>
                <td className={`py-2 ${parseFloat(holding.performance.yesterday) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {holding.performance.yesterday}
                </td>
                <td className={`py-2 ${parseFloat(holding.performance.weekTD) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {holding.performance.weekTD}
                </td>
                <td className="py-2">
                  {holding.inYourPortfolio ? (
                    <span className="text-green-600">✓ Owned</span>
                  ) : (
                    <span className="text-gray-400">Not owned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-500" />
            Consider Adding
          </h3>
          <div className="space-y-2">
            {data.recommendations.slice(0, 3).map((rec: Record<string, unknown>, i: number) => (
              <div key={i} className="p-3 bg-blue-50 rounded-lg">
                <span className="font-semibold">{rec.symbol}</span>
                <span className="ml-2 text-sm text-gray-600">{rec.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskTab({ data }: { data: Record<string, unknown> }) {
  const riskLevel = data.riskMetrics?.riskLevel;
  const riskColor = riskLevel === 'LOW' ? 'green' : riskLevel === 'MEDIUM' ? 'yellow' : 'red';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Risk Assessment</h2>

      {/* Risk Score */}
      <div className={`p-6 rounded-lg bg-${riskColor}-50 border-2 border-${riskColor}-200`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Overall Risk Score</p>
            <p className="text-3xl font-bold">{data.riskMetrics?.overallRiskScore}/10</p>
            <p className={`text-sm mt-1 text-${riskColor}-700`}>{data.riskMetrics?.riskLevel} RISK</p>
          </div>
          <Shield className={`w-16 h-16 text-${riskColor}-500`} />
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Concentration Risk</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Top 5 Holdings:</span>
              <span className="font-semibold">{data.riskMetrics?.riskFactors?.concentration?.value}</span>
            </div>
            <div className="flex justify-between">
              <span>Largest Position:</span>
              <span className="font-semibold">{data.riskMetrics?.riskFactors?.concentration?.largestPosition}</span>
            </div>
            <div className="flex justify-between">
              <span>Impact:</span>
              <span className="font-semibold">{data.riskMetrics?.riskFactors?.concentration?.impact}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Diversification</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Positions:</span>
              <span className="font-semibold">{data.riskMetrics?.riskFactors?.diversification?.totalPositions}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Buffer:</span>
              <span className="font-semibold">{data.riskMetrics?.riskFactors?.cashBuffer?.percent}</span>
            </div>
            <div className="flex justify-between">
              <span>Crypto Exposure:</span>
              <span className="font-semibold">{data.riskMetrics?.riskFactors?.assetTypes?.cryptoExposure}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="font-semibold text-blue-900 mb-2">Risk Factor Analysis</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Leverage: </span>
            <span className="font-semibold">{data.riskMetrics?.riskFactors?.leverage?.percent} ({data.riskMetrics?.riskFactors?.leverage?.impact})</span>
          </div>
          <div>
            <span className="text-gray-600">Cash Buffer: </span>
            <span className="font-semibold">{data.riskMetrics?.riskFactors?.cashBuffer?.impact}</span>
          </div>
          <div>
            <span className="text-gray-600">Crypto Risk: </span>
            <span className="font-semibold">{data.riskMetrics?.riskFactors?.assetTypes?.impact}</span>
          </div>
        </div>
      </div>

      {/* Market Comparison */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Market Comparison</p>
        <div className="flex items-center justify-between">
          <span>Your Risk: {data.comparison?.yourRiskScore}</span>
          <span>Market Avg: {data.comparison?.marketAverageRisk}</span>
          <span className="font-semibold">{data.comparison?.interpretation}</span>
        </div>
      </div>
    </div>
  );
}

function OpportunitiesTab({ eliteGroups, smartMoney }: { eliteGroups: Record<string, unknown>; smartMoney: Record<string, unknown> }) {
  return (
    <div className="space-y-6">
      {/* Smart Money Section */}
      {smartMoney && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Smart Money Flow</h2>
            <div className="text-sm text-gray-600">
              Alignment Score: <span className="font-bold text-green-600">{smartMoney.summary?.alignmentScore?.toFixed(0)}%</span>
            </div>
          </div>

          {/* Missing Opportunities */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
              Missing Opportunities
            </h3>
            {smartMoney.opportunities?.length > 0 ? (
              <div className="space-y-2">
                {smartMoney.opportunities.slice(0, 5).map((opp: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <span className="font-semibold">{opp.symbol}</span>
                      <span className="ml-2 text-sm text-gray-600">
                        Held by {opp.heldByTopInvestors} of top investors
                      </span>
                    </div>
                    <span className="text-sm text-yellow-700">
                      Avg allocation: {opp.averageAllocation}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No major opportunities identified</p>
            )}
          </div>

          {/* Aligned Positions */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Aligned with Smart Money
            </h3>
            {smartMoney.alignedPositions?.length > 0 ? (
              <div className="space-y-2">
                {smartMoney.alignedPositions.slice(0, 5).map((pos: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold">{pos.symbol}</span>
                    <div className="text-sm">
                      <span className="text-gray-600">Your: {pos.yourAllocation}</span>
                      <span className="mx-2">|</span>
                      <span className="text-gray-600">Smart: {pos.smartMoneyAllocation}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No aligned positions found</p>
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      {smartMoney && eliteGroups && (
        <div className="border-t pt-6"></div>
      )}

      {/* Elite Groups Section */}
      {eliteGroups && (
        <div>
          <h2 className="text-xl font-bold mb-4">Elite Group Comparison</h2>
          <EliteGroupComparison data={eliteGroups} />
        </div>
      )}
    </div>
  );
}
