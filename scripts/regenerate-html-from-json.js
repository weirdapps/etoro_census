#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the functions we need from the optimized report route
// Inline utility functions
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function getCountryFlag(countryId) {
  // Simple country flag mapping - just return empty for now
  return '';
}

/**
 * Regenerate HTML report from existing JSON data
 */
async function regenerateHTMLFromJSON(jsonFilePath, outputHtmlPath) {
  console.log('Reading JSON data from:', jsonFilePath);
  
  // Read the JSON data
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
  
  console.log(`Found data for ${jsonData.metadata.totalInvestors} investors`);
  console.log(`Generated at: ${jsonData.metadata.collectedAtUTC}`);
  console.log(`Number of analysis bands: ${jsonData.analyses.length}`);
  
  // Convert the JSON analyses format to the expected format for HTML generation
  const analyses = jsonData.analyses.map(analysis => ({
    count: analysis.investorCount,
    analysis: {
      fearGreedIndex: analysis.fearGreedIndex,
      averageGain: analysis.averages.gain,
      averageCashPercentage: analysis.averages.cashPercentage,
      averageRiskScore: analysis.averages.riskScore,
      averageTrades: analysis.averages.trades,
      averageWinRatio: analysis.averages.winRatio,
      averageUniqueInstruments: analysis.averages.uniqueInstruments,
      returnsDistribution: analysis.distributions.returns,
      riskScoreDistribution: analysis.distributions.riskScore,
      uniqueInstrumentsDistribution: analysis.distributions.uniqueInstruments,
      cashPercentageDistribution: analysis.distributions.cashPercentage,
      topHoldings: analysis.topHoldings,
      topPerformers: analysis.topPerformers
    }
  }));
  
  console.log('Generating HTML report...');
  
  // Generate the HTML using the same function from the optimized report route
  const html = generateReportHTML(analyses, jsonData.metadata.collectedAtUTC);
  
  // Write the HTML file
  fs.writeFileSync(outputHtmlPath, html, 'utf-8');
  
  console.log('HTML report regenerated successfully!');
  console.log('Output file:', outputHtmlPath);
  console.log(`Report size: ${(html.length / 1024).toFixed(1)} KB`);
}

// Copy the HTML generation function from the optimized report route
function generateReportHTML(analyses, generatedAt) {
  console.log(`HTML Generator received ${analyses.length} analyses`);
  analyses.forEach((item, idx) => {
    console.log(`  Analysis ${idx}: count=${item.count}, holdings=${item.analysis?.topHoldings?.length || 0}, performers=${item.analysis?.topPerformers?.length || 0}`);
  });
  
  // Helper functions for distribution charts
  const getReturnsColorClass = (range) => {
    if (range === 'Negative') return '#ef4444'; // red-500
    if (range === '0-5%') return '#fb923c'; // orange-400
    if (range === '> 5-10%') return '#facc15'; // yellow-400
    if (range === '> 10-25%') return '#a3e635'; // lime-400
    if (range === '> 25-50%') return '#22c55e'; // green-500
    return '#10b981'; // emerald-500
  };

  const getReturnsBadgeColor = (range) => {
    if (range === 'Negative') return 'background-color: #fee2e2; color: #dc2626;'; // red
    if (range === '0-5%') return 'background-color: #fed7aa; color: #ea580c;'; // orange
    if (range === '> 5-10%') return 'background-color: #fef3c7; color: #ca8a04;'; // yellow
    if (range === '> 10-25%') return 'background-color: #ecfccb; color: #65a30d;'; // lime
    if (range === '> 25-50%') return 'background-color: #dcfce7; color: #16a34a;'; // green
    return 'background-color: #d1fae5; color: #059669;'; // emerald
  };

  const getRiskColorClass = (range) => {
    if (range.includes('Conservative')) return '#22c55e'; // green-500
    if (range.includes('Moderate')) return '#3b82f6'; // blue-500
    if (range.includes('Aggressive')) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getRiskBadgeColor = (range) => {
    if (range.includes('Conservative')) return 'background-color: #dcfce7; color: #16a34a;'; // green
    if (range.includes('Moderate')) return 'background-color: #dbeafe; color: #2563eb;'; // blue
    if (range.includes('Aggressive')) return 'background-color: #fed7aa; color: #ea580c;'; // orange
    return 'background-color: #fee2e2; color: #dc2626;'; // red
  };

  const getRiskIcon = (range) => {
    if (range.includes('Conservative')) return '🛡️';
    if (range.includes('Moderate')) return '⚖️';
    if (range.includes('Aggressive')) return '📈';
    return '🔥';
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eToro Census Report - ${new Date().toLocaleDateString()}</title>
    <script defer src="https://cloud.umami.is/script.js" data-website-id="5730b8f9-c50c-4175-9d28-50db8bfb04dc"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f9fafb;
            color: #111827;
            line-height: 1.5;
        }
        
        .container {
            max-width: 1120px;
            margin: 0 auto;
            padding: 0 24px;
        }
        
        .header {
            background-color: transparent;
            margin-bottom: 32px;
        }
        
        .header-content {
            max-width: 1120px;
            margin: 0 auto;
            padding: 32px 24px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .header .creator {
            font-size: 0.875rem;
            color: #6b7280;
            margin-top: 8px;
        }
        
        .header .creator a {
            color: #00C896;
            text-decoration: none;
            font-weight: 500;
        }
        
        .header .creator a:hover {
            text-decoration: underline;
        }
        
        
        /* Tabs */
        .tabs {
            display: flex;
            justify-content: center;
            margin-bottom: 32px;
            border-bottom: 1px solid #e5e7eb;
            gap: 16px;
            overflow-x: auto;
        }
        
        .tab {
            padding: 12px 24px;
            cursor: pointer;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            font-size: 1rem;
            color: #6b7280;
            transition: all 0.2s;
            white-space: nowrap;
        }
        
        .tab:hover {
            color: #111827;
        }
        
        .tab.active {
            color: #00C896;
            border-bottom-color: #00C896;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        /* Cards and Grid */
        .grid {
            display: grid;
            gap: 24px;
            margin-bottom: 32px;
        }
        
        .grid-cols-2 {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }
        
        .grid-cols-3 {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }
        
        .card {
            background: transparent;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            padding: 24px;
            box-shadow: none;
        }
        
        .card-header {
            margin-bottom: 1.5rem;
            text-align: left;
        }
        
        .card-header h3 {
            font-size: 0.875rem;
            font-weight: 600;
            color: #111827;
            margin: 0 0 0.25rem 0;
            text-align: left;
        }
        
        .card-description {
            font-size: 0.875rem;
            color: #6b7280;
            margin: 0;
            text-align: left;
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #111827;
            line-height: 1;
            text-align: center;
            margin: 16px 0 8px 0;
        }
        
        /* Distribution Charts */
        .distribution-row {
            margin-bottom: 16px;
        }
        
        .distribution-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .distribution-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #111827;
        }
        
        .distribution-stats {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .distribution-count {
            font-size: 0.875rem;
            color: #6b7280;
        }
        
        .distribution-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .progress-bar-container {
            width: 100%;
            height: 8px;
            background-color: #f3f4f6;
            border-radius: 9999px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            border-radius: 9999px;
            transition: width 0.7s ease;
        }
        
        /* Tables */
        .table-container {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: transparent;
        }
        
        th {
            background-color: transparent;
            padding: 12px 16px;
            text-align: left;
            font-weight: 500;
            font-size: 0.75rem;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        td {
            padding: 12px 16px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.875rem;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        tr:hover {
            background-color: transparent;
        }
        
        .text-right {
            text-align: right;
        }
        
        /* Table Elements */
        .name-cell {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .name-primary {
            font-weight: 500;
            color: #111827;
            font-size: 0.875rem;
        }
        
        .name-secondary {
            font-size: 0.75rem;
            color: #6b7280;
        }
        
        .rank {
            font-weight: 600;
            color: #111827;
            font-size: 0.875rem;
        }
        
        /* Instrument images */
        .instrument-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
        }
        
        .instrument-placeholder {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #60a5fa, #a855f7);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
        }
        
        .avatar-placeholder {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.875rem;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        /* Badges */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .badge-green {
            background-color: #dcfce7;
            color: #16a34a;
        }
        
        .badge-red {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        .badge-blue {
            background-color: #dbeafe;
            color: #2563eb;
        }
        
        .badge-yellow {
            background-color: #fef3c7;
            color: #ca8a04;
        }
        
        .badge-purple {
            background-color: #f3e8ff;
            color: #9333ea;
        }
        
        .badge-primary {
            background-color: rgba(0, 200, 150, 0.1);
            color: #00C896;
        }
        
        .badge-positive {
            background-color: rgba(34, 197, 94, 0.1);
            color: #16a34a;
        }
        
        .badge-negative {
            background-color: rgba(239, 68, 68, 0.1);
            color: #dc2626;
        }
        
        .badge-neutral {
            background-color: rgba(59, 130, 246, 0.1);
            color: #2563eb;
        }
        
        .risk-badge {
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .risk-badge.risk-1,
        .risk-badge.risk-2,
        .risk-badge.risk-3 {
            background-color: #dcfce7;
            color: #16a34a;
        }
        
        .risk-badge.risk-4,
        .risk-badge.risk-5,
        .risk-badge.risk-6 {
            background-color: #fef3c7;
            color: #ca8a04;
        }
        
        .risk-badge.risk-7,
        .risk-badge.risk-8,
        .risk-badge.risk-9,
        .risk-badge.risk-10 {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            margin-top: 16px;
        }
        
        .pagination-info {
            font-size: 0.875rem;
            color: #6b7280;
        }
        
        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .pagination-btn {
            padding: 6px 12px;
            border: 1px solid #e5e7eb;
            background-color: transparent;
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .pagination-btn:hover:not(:disabled) {
            background-color: rgba(0, 0, 0, 0.05);
            border-color: #d1d5db;
        }
        
        .pagination-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .hidden {
            display: none;
        }
        
        .space-y-8 > * + * {
            margin-top: 2rem;
        }
        
        /* Footer */
        .footer {
            background-color: transparent;
            margin-top: 64px;
            padding: 32px 0;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .footer a {
            color: #00C896;
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .metric-value {
                font-size: 2rem;
            }
            
            .tabs {
                justify-content: flex-start;
            }
        }
        
        @media (max-width: 640px) {
            .grid-cols-3, .grid-cols-2 {
                grid-template-columns: 1fr;
            }
        }
        
        /* Additional utility classes */
        .font-medium {
            font-weight: 500;
        }
        
        .font-semibold {
            font-weight: 600;
        }
        
        .text-muted {
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>eToro Popular Investors Census</h1>
            <p class="creator">created by <a href="https://www.etoro.com/people/plessas" target="_blank" rel="noopener noreferrer">@plessas</a> at ${generatedAt}</p>
        </div>
    </div>

    <div class="container">
        <!-- Tabs -->
        <div class="tabs">
            ${analyses.map((item, index) => `
                <button class="tab ${index === 0 ? 'active' : ''}" onclick="showTab(${index})">
                    Top ${item.count} PIs
                </button>
            `).join('')}
        </div>

        <!-- Tab Contents -->
        ${analyses.map((item, index) => `
            <div class="tab-content ${index === 0 ? 'active' : ''}" id="tab-${index}">
                <!-- Fear & Greed Index Bar -->
                <div class="card" style="margin-bottom: 32px;">
                    <div class="card-header">
                        <h3>Fear & Greed Index</h3>
                    </div>
                    <div style="padding: 24px 0;">
                        <div style="position: relative; width: 100%; height: 60px; background: #f3f4f6; border-radius: 30px; overflow: hidden;">
                            <!-- Gradient background -->
                            <div style="position: absolute; width: 100%; height: 100%; background: linear-gradient(to right, #ef4444 0%, #f59e0b 25%, #fbbf24 50%, #84cc16 75%, #10b981 100%);"></div>
                            <!-- Marker -->
                            <div style="position: absolute; left: ${(() => {
                                // Map internal scale to 0-100 visual scale
                                let visualPosition;
                                if (item.analysis.fearGreedIndex >= 20) {
                                    visualPosition = Math.max(0, 10 - (item.analysis.fearGreedIndex - 20) * 2);
                                } else if (item.analysis.fearGreedIndex >= 15) {
                                    visualPosition = 10 + ((20 - item.analysis.fearGreedIndex) / 5) * 20;
                                } else if (item.analysis.fearGreedIndex >= 12) {
                                    visualPosition = 30 + ((15 - item.analysis.fearGreedIndex) / 3) * 20;
                                } else if (item.analysis.fearGreedIndex >= 8) {
                                    visualPosition = 50 + ((12 - item.analysis.fearGreedIndex) / 4) * 30;
                                } else {
                                    visualPosition = Math.min(100, 80 + ((8 - item.analysis.fearGreedIndex) / 4) * 20);
                                }
                                return Math.max(0, Math.min(100, visualPosition));
                            })()}%; top: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: #111827; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-weight: 700; font-size: 1rem;">${(() => {
                                    let displayValue;
                                    if (item.analysis.fearGreedIndex >= 20) {
                                        displayValue = Math.max(0, 10 - (item.analysis.fearGreedIndex - 20) * 2);
                                    } else if (item.analysis.fearGreedIndex >= 15) {
                                        displayValue = 10 + ((20 - item.analysis.fearGreedIndex) / 5) * 20;
                                    } else if (item.analysis.fearGreedIndex >= 12) {
                                        displayValue = 30 + ((15 - item.analysis.fearGreedIndex) / 3) * 20;
                                    } else if (item.analysis.fearGreedIndex >= 8) {
                                        displayValue = 50 + ((12 - item.analysis.fearGreedIndex) / 4) * 30;
                                    } else {
                                        displayValue = Math.min(100, 80 + ((8 - item.analysis.fearGreedIndex) / 4) * 20);
                                    }
                                    return Math.round(Math.max(0, Math.min(100, displayValue)));
                                })()}</span>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 16px;">
                            <div style="text-align: left;">
                                <div style="font-size: 0.875rem; color: #ef4444; font-weight: 500;">Extreme Fear</div>
                                <div style="font-size: 0.75rem; color: #6b7280;">0</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.125rem; color: ${item.analysis.fearGreedIndex >= 20 ? '#ef4444' : item.analysis.fearGreedIndex >= 15 ? '#f97316' : item.analysis.fearGreedIndex >= 12 ? '#fbbf24' : item.analysis.fearGreedIndex >= 8 ? '#84cc16' : '#10b981'}; font-weight: 700;">
                                    ${item.analysis.fearGreedIndex >= 20 ? 'Extreme Fear' :
                                      item.analysis.fearGreedIndex >= 15 ? 'Fear' :
                                      item.analysis.fearGreedIndex >= 12 ? 'Neutral' :
                                      item.analysis.fearGreedIndex >= 8 ? 'Greed' : 'Extreme Greed'}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.875rem; color: #10b981; font-weight: 500;">Extreme Greed</div>
                                <div style="font-size: 0.75rem; color: #6b7280;">100</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Key Metrics Grid -->
                <div class="grid grid-cols-3" style="margin-bottom: 32px;">
                        <div class="card">
                            <div class="card-header">
                                <h3>Average Returns</h3>
                                <p class="card-description">Year-to-Date Performance</p>
                            </div>
                            <div class="metric-value">${(item.analysis.averageGain || 0).toFixed(1)}%</div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h3>Average Cash</h3>
                                <p class="card-description">Percent of Portfolio</p>
                            </div>
                            <div class="metric-value">${(item.analysis.averageCashPercentage || 0).toFixed(1)}%</div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h3>Average Risk Score</h3>
                                <p class="card-description">Risk Level (1-10)</p>
                            </div>
                            <div class="metric-value">${(item.analysis.averageRiskScore || 0).toFixed(1)}</div>
                        </div>
                </div>

                <!-- Second Row: Additional Metrics -->
                <div class="grid grid-cols-2" style="margin-bottom: 32px;">
                        <div class="card">
                            <div class="card-header">
                                <h3>Average Trades</h3>
                                <p class="card-description">Per investor (current year)</p>
                            </div>
                            <div class="metric-value">${(item.analysis.averageTrades || 0).toFixed(1)}</div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h3>Average Win Ratio</h3>
                                <p class="card-description">Percentage of winning trades</p>
                            </div>
                            <div class="metric-value">${(item.analysis.averageWinRatio || 0).toFixed(1)}%</div>
                        </div>
                </div>

                <!-- Distribution Charts -->
                <div class="space-y-8">
                    <!-- Returns Distribution -->
                    <div class="card">
                        <div class="card-header">
                            <h3>Returns Distribution</h3>
                            <p class="card-description">Performance ranges across analyzed investors</p>
                        </div>
                        <div class="chart-container">
                            ${Object.entries(item.analysis.returnsDistribution || {}).map(([range, count]) => {
                                const total = Object.values(item.analysis.returnsDistribution || {}).reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                return `
                                    <div class="distribution-row">
                                        <div class="distribution-header">
                                            <span class="distribution-label">${range} returns</span>
                                            <div class="distribution-stats">
                                                <span class="distribution-count">${count} investors</span>
                                                <span class="distribution-badge" style="${getReturnsBadgeColor(range)}">${percentage}%</span>
                                            </div>
                                        </div>
                                        <div class="progress-bar-container">
                                            <div class="progress-bar" style="background: linear-gradient(to right, ${getReturnsColorClass(range)}, ${getReturnsColorClass(range)}dd); width: ${percentage}%;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Risk Score Distribution -->
                    <div class="card">
                        <div class="card-header">
                            <h3>Risk Score Distribution</h3>
                            <p class="card-description">Risk appetite distribution across analyzed investors</p>
                        </div>
                        <div class="chart-container">
                            ${Object.entries(item.analysis.riskScoreDistribution || {}).map(([range, count]) => {
                                const total = Object.values(item.analysis.riskScoreDistribution || {}).reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                return `
                                    <div class="distribution-row">
                                        <div class="distribution-header">
                                            <span class="distribution-label">
                                                <span>${getRiskIcon(range)}</span>
                                                <span>${range}</span>
                                            </span>
                                            <div class="distribution-stats">
                                                <span class="distribution-count">${count} investors</span>
                                                <span class="distribution-badge" style="${getRiskBadgeColor(range)}">${percentage}%</span>
                                            </div>
                                        </div>
                                        <div class="progress-bar-container">
                                            <div class="progress-bar" style="background: linear-gradient(to right, ${getRiskColorClass(range)}, ${getRiskColorClass(range)}dd); width: ${percentage}%;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                            <div style="margin-top: 16px; font-size: 0.75rem; color: #6b7280;">
                                <p>eToro Risk Score ranges from 1 (lowest risk) to 10 (highest risk)</p>
                            </div>
                        </div>
                    </div>

                    <!-- Portfolio Diversification -->
                    <div class="card">
                        <div class="card-header">
                            <h3>Portfolio Diversification</h3>
                            <p class="card-description">Number of unique instruments held by top ${item.count} investors</p>
                        </div>
                        <div class="chart-container">
                            ${Object.entries(item.analysis.uniqueInstrumentsDistribution || {}).map(([range, count]) => {
                                const total = Object.values(item.analysis.uniqueInstrumentsDistribution || {}).reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                return `
                                    <div class="distribution-row">
                                        <div class="distribution-header">
                                            <span class="distribution-label">${range} assets</span>
                                            <div class="distribution-stats">
                                                <span class="distribution-count">${count} investors</span>
                                                <span class="distribution-badge" style="background-color: #dbeafe; color: #2563eb;">${percentage}%</span>
                                            </div>
                                        </div>
                                        <div class="progress-bar-container">
                                            <div class="progress-bar" style="background: linear-gradient(to right, #00C896, #00B085); width: ${percentage}%;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Cash Allocation -->
                    <div class="card">
                        <div class="card-header">
                            <h3>Cash Allocation</h3>
                            <p class="card-description">Percentage of portfolio held in cash by top ${item.count} investors</p>
                        </div>
                        <div class="chart-container">
                            ${Object.entries(item.analysis.cashPercentageDistribution || {}).map(([range, count]) => {
                                const total = Object.values(item.analysis.cashPercentageDistribution || {}).reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                return `
                                    <div class="distribution-row">
                                        <div class="distribution-header">
                                            <span class="distribution-label">${range} cash</span>
                                            <div class="distribution-stats">
                                                <span class="distribution-count">${count} investors</span>
                                                <span class="distribution-badge" style="background-color: #f3e8ff; color: #9333ea;">${percentage}%</span>
                                            </div>
                                        </div>
                                        <div class="progress-bar-container">
                                            <div class="progress-bar" style="background: linear-gradient(to right, #8b5cf6, #7c3aed); width: ${percentage}%;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Tables -->
                <div class="space-y-8" style="margin-top: 2rem;">
                    <!-- Top Holdings -->
                    <div class="card">
                        <div class="card-header">
                            <h3>Most Popular Holdings</h3>
                            <p class="card-description">Instruments held by the highest number of investors in top ${item.count} PIs (${(item.analysis.topHoldings || []).length} total)</p>
                        </div>
                        <div class="card-content">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Asset</th>
                                        <th class="text-right">Holders</th>
                                        <th class="text-right">% of PIs</th>
                                        <th class="text-right">Avg Allocation</th>
                                        <th class="text-right">Yesterday</th>
                                        <th class="text-right">Week TD</th>
                                        <th class="text-right">Month TD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(item.analysis.topHoldings || []).slice(0, 20).map((holding, idx) => `
                                        <tr>
                                            <td class="rank">#${idx + 1}</td>
                                            <td>
                                                <div class="name-cell">
                                                    ${holding.imageUrl ? 
                                                        `<img src="${holding.imageUrl}" alt="${holding.symbol}" class="instrument-icon">` :
                                                        `<div class="instrument-placeholder">${(holding.symbol || 'UN').slice(0, 2).toUpperCase()}</div>`
                                                    }
                                                    <div>
                                                        <div class="name-primary" title="${holding.instrumentName || 'Unknown'}">${truncateText(holding.instrumentName || 'Unknown', 24)}</div>
                                                        <div class="name-secondary">${holding.symbol || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="text-right font-medium">${holding.holdersCount || 0}</td>
                                            <td class="text-right">
                                                <span class="badge badge-primary">${(holding.holdersPercentage || 0).toFixed(1)}%</span>
                                            </td>
                                            <td class="text-right font-medium">
                                                ${(holding.averageAllocation || 0).toFixed(1)}%
                                            </td>
                                            <td class="text-right">
                                                ${holding.yesterdayReturn !== undefined ? `
                                                    <span class="badge ${holding.yesterdayReturn > 0 ? 'badge-positive' : holding.yesterdayReturn < 0 ? 'badge-negative' : 'badge-neutral'}">
                                                        ${holding.yesterdayReturn > 0 ? '+' : ''}${holding.yesterdayReturn.toFixed(1)}%
                                                    </span>
                                                ` : '<span class="badge badge-neutral">-</span>'}
                                            </td>
                                            <td class="text-right">
                                                ${holding.weekTDReturn !== undefined ? `
                                                    <span class="badge ${holding.weekTDReturn > 0 ? 'badge-positive' : holding.weekTDReturn < 0 ? 'badge-negative' : 'badge-neutral'}">
                                                        ${holding.weekTDReturn > 0 ? '+' : ''}${holding.weekTDReturn.toFixed(1)}%
                                                    </span>
                                                ` : '<span class="badge badge-neutral">-</span>'}
                                            </td>
                                            <td class="text-right">
                                                ${holding.monthTDReturn !== undefined ? `
                                                    <span class="badge ${holding.monthTDReturn > 0 ? 'badge-positive' : holding.monthTDReturn < 0 ? 'badge-negative' : 'badge-neutral'}">
                                                        ${holding.monthTDReturn > 0 ? '+' : ''}${holding.monthTDReturn.toFixed(1)}%
                                                    </span>
                                                ` : '<span class="badge badge-neutral">-</span>'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Top Performers -->
                    <div class="card">
                        <div class="card-header">
                            <h3>Most Copied Investors</h3>
                            <p class="card-description">Investors ranked by number of copiers (${Math.min((item.analysis.topPerformers || []).length, item.count)} shown)</p>
                        </div>
                        <div class="card-content">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Investor</th>
                                        <th class="text-right">Gain (YTD)</th>
                                        <th class="text-right">Cash %</th>
                                        <th class="text-right">Risk Score</th>
                                        <th class="text-right">Trades</th>
                                        <th class="text-right">Win Ratio</th>
                                        <th class="text-right">Copiers</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(item.analysis.topPerformers || []).slice(0, Math.min(item.analysis.topPerformers.length, Math.min(item.count, 20))).map((performer, idx) => `
                                        <tr>
                                            <td class="rank">#${idx + 1}</td>
                                            <td>
                                                <div class="name-cell">
                                                    ${performer.avatarUrl ? 
                                                        `<img src="${performer.avatarUrl}" alt="${performer.fullName}" class="avatar">` :
                                                        `<div class="avatar-placeholder">${(performer.fullName || 'U').charAt(0).toUpperCase()}</div>`
                                                    }
                                                    <div>
                                                        <div class="name-primary" title="${performer.fullName || performer.username || 'Unknown'}">
                                                            ${truncateText(performer.fullName || performer.username || 'Unknown', 24)}
                                                        </div>
                                                        <div class="name-secondary" title="@${performer.username}">
                                                            @${truncateText(performer.username, 20)}${performer.countryId ? ` ${getCountryFlag(performer.countryId)}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="text-right font-medium">
                                                <span class="${(performer.gain || 0) >= 0 ? 'badge badge-green' : 'badge badge-red'}">
                                                    ${(performer.gain || 0) > 0 ? '+' : ''}${(performer.gain || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td class="text-right">
                                                <span class="badge badge-blue">${(performer.cashPercentage || 0).toFixed(1)}%</span>
                                            </td>
                                            <td class="text-right">
                                                <span class="risk-badge risk-${performer.riskScore || 0}">${performer.riskScore || '-'}/10</span>
                                            </td>
                                            <td class="text-right">
                                                <span class="badge badge-yellow">${(performer.trades || 0).toLocaleString()}</span>
                                            </td>
                                            <td class="text-right">
                                                <span class="badge badge-green">${(performer.winRatio || 0).toFixed(1)}%</span>
                                            </td>
                                            <td class="text-right">
                                                <span class="badge badge-purple">${(performer.copiers || 0).toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>Generated by <a href="https://github.com/weirdapps/etoro_census" target="_blank">eToro Census Tool</a> - Optimized Architecture</p>
        <p>Data sourced from eToro's API - Tool created by <a href="https://www.etoro.com/people/plessas" target="_blank" rel="noopener noreferrer">@plessas</a>, not affiliated with eToro.</p>
    </div>

    <script>
        function showTab(index) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            document.querySelectorAll('.tab')[index].classList.add('active');
            document.getElementById('tab-' + index).classList.add('active');
        }
    </script>
</body>
</html>`;
}

// Run the script
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node regenerate-html-from-json.js <json-file-path> <output-html-path>');
    process.exit(1);
  }
  
  const jsonPath = args[0];
  const htmlPath = args[1];
  
  regenerateHTMLFromJSON(jsonPath, htmlPath);
}

module.exports = { regenerateHTMLFromJSON };