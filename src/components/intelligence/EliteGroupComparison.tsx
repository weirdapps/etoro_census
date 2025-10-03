import React, { useState } from 'react';
import { Users, TrendingUp, Shield, Globe, Check, AlertCircle, Star } from 'lucide-react';

interface GroupComparison {
  group: string;
  investorCount: number;
  topMissing: Array<{
    symbol: string;
    penetration: string;
    avgAllocation: string;
  }>;
  consensusPicks: string[];
}

interface EliteGroupComparisonData {
  yourPortfolio: {
    positionCount: number;
    totalValue: string;
  };
  comparisons: {
    broadMarket: GroupComparison;
    topCopiers: GroupComparison;
    topPerformers: GroupComparison;
    lowRisk: GroupComparison;
  };
  insights: {
    mustHaveStocks: string[];
    performerEdgePicks: string[];
    conservativePicks: string[];
    recommendation: string;
  };
}

export default function EliteGroupComparison({ data }: { data: EliteGroupComparisonData | null }) {
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'topCopiers' | 'topPerformers' | 'lowRisk'>('lowRisk');

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Elite Group Comparison</h2>
        <p className="text-gray-500">Loading elite group analysis...</p>
      </div>
    );
  }

  const groups = [
    {
      id: 'all',
      name: 'Broad Market',
      description: 'All 1500+ Popular Investors',
      icon: <Globe className="w-5 h-5" />,
      color: 'blue',
      data: data.comparisons.broadMarket
    },
    {
      id: 'topCopiers',
      name: 'Most Copied',
      description: 'Top 100 by Social Proof',
      icon: <Users className="w-5 h-5" />,
      color: 'purple',
      data: data.comparisons.topCopiers
    },
    {
      id: 'topPerformers',
      name: 'Top Performers',
      description: 'Top 100 YTD Returns',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'green',
      data: data.comparisons.topPerformers
    },
    {
      id: 'lowRisk',
      name: 'Conservative',
      description: 'Top 100 Lowest Risk',
      icon: <Shield className="w-5 h-5" />,
      color: 'indigo',
      data: data.comparisons.lowRisk
    }
  ];

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <div className="space-y-6">
      {/* Group Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id as any)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedGroup === group.id
                ? `border-${group.color}-500 bg-${group.color}-50`
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`${selectedGroup === group.id ? `text-${group.color}-600` : 'text-gray-600'}`}>
                {group.icon}
              </div>
              {selectedGroup === group.id && (
                <Check className={`w-5 h-5 text-${group.color}-600`} />
              )}
            </div>
            <h3 className={`font-semibold text-sm ${
              selectedGroup === group.id ? `text-${group.color}-900` : 'text-gray-900'
            }`}>
              {group.name}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{group.description}</p>
            <p className="text-xs font-medium mt-2 text-gray-700">
              {group.data.investorCount} investors
            </p>
          </button>
        ))}
      </div>

      {/* Key Insights */}
      {data.insights && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Cross-Group Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.insights.mustHaveStocks.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">🔥 Must-Have Stocks</h4>
                <p className="text-xs text-gray-600 mb-2">Held by ALL elite groups</p>
                <div className="flex flex-wrap gap-1">
                  {data.insights.mustHaveStocks.map(stock => (
                    <span key={stock} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      {stock}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.insights.performerEdgePicks.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">⚡ Performance Edge</h4>
                <p className="text-xs text-gray-600 mb-2">Unique to top performers</p>
                <div className="flex flex-wrap gap-1">
                  {data.insights.performerEdgePicks.map(stock => (
                    <span key={stock} className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                      {stock}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.insights.conservativePicks.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">🛡️ Safe Havens</h4>
                <p className="text-xs text-gray-600 mb-2">Conservative consensus</p>
                <div className="flex flex-wrap gap-1">
                  {data.insights.conservativePicks.map(stock => (
                    <span key={stock} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      {stock}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-700 flex items-start">
              <AlertCircle className="w-4 h-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="font-medium">{data.insights.recommendation}</span>
            </p>
          </div>
        </div>
      )}

      {/* Selected Group Details */}
      {selectedGroupData && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  {selectedGroupData.icon}
                  <span className="ml-2">{selectedGroupData.name} Analysis</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedGroupData.data.investorCount} investors • {selectedGroupData.description}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Missing Opportunities */}
            {selectedGroupData.data.topMissing && selectedGroupData.data.topMissing.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Top Opportunities You're Missing
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Symbol
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Held By
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Avg Allocation
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedGroupData.data.topMissing.map((stock, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{stock.symbol}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm text-gray-900">{stock.penetration}</div>
                              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`bg-${selectedGroupData.color}-500 h-2 rounded-full`}
                                  style={{ width: stock.penetration }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{stock.avgAllocation}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button className={`text-xs font-medium text-${selectedGroupData.color}-600 hover:text-${selectedGroupData.color}-500`}>
                              Consider Adding
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Consensus Picks */}
            {selectedGroupData.data.consensusPicks && selectedGroupData.data.consensusPicks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Consensus Picks (&gt;60% penetration)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedGroupData.data.consensusPicks.map(stock => (
                    <span
                      key={stock}
                      className={`px-3 py-1 bg-${selectedGroupData.color}-100 text-${selectedGroupData.color}-700 text-sm font-semibold rounded-full`}
                    >
                      {stock}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}