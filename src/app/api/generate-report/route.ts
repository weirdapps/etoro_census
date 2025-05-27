import { NextRequest, NextResponse } from 'next/server';
import { CensusAnalysis } from '@/lib/models/census';
import { getPopularInvestors } from '@/lib/services/user-service';
import { performCensusAnalysis, ProgressCallback } from '@/lib/services/census-service';
import { PeriodType } from '@/lib/models/user';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: number, message: string) => {
        const data = JSON.stringify({ type: 'progress', progress, message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendError = (error: string) => {
        const data = JSON.stringify({ type: 'error', error });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendComplete = (reportUrl: string) => {
        const data = JSON.stringify({ type: 'complete', reportUrl });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const { investorCount = 1500, limit = 1500, period = 'CurrYear' } = await request.json();
        const actualLimit = investorCount || limit;
        
        sendProgress(0, 'Fetching popular investors...');
        
        // Fetch requested number of investors
        const allInvestors = await getPopularInvestors(period as PeriodType, actualLimit);
        
        if (allInvestors.length === 0) {
          throw new Error('No investors found');
        }
        
        sendProgress(5, `Found ${allInvestors.length} investors. Starting portfolio analysis...`);
        
        // NEW APPROACH: Fetch all portfolio data ONCE
        const onProgress: ProgressCallback = (progress: number, message: string) => {
          const scaledProgress = 5 + (progress * 85 / 100);
          sendProgress(Math.round(scaledProgress), message);
        };
        
        // Perform full census analysis on all investors
        const fullAnalysis = await performCensusAnalysis(allInvestors, onProgress);
        
        if (!fullAnalysis) {
          throw new Error('Failed to analyze investors');
        }
        
        sendProgress(92, 'Generating report...');

        sendProgress(95, 'Generating HTML report...');

        // Create reports directory if it doesn't exist
        const reportsDir = path.join(process.cwd(), 'public', 'reports');
        await fs.mkdir(reportsDir, { recursive: true });

        // Generate timestamp for filename
        const date = new Date();
        const fileName = `etoro-census-${date.toISOString().split('T')[0]}-${Date.now()}.html`;
        const filePath = path.join(reportsDir, fileName);

        // Generate the HTML report
        const html = generateReportHTML([{ count: actualLimit, analysis: fullAnalysis }]);

        // Write the HTML file
        await fs.writeFile(filePath, html, 'utf-8');
        
        // Also copy to index.html to make it the latest report
        const indexPath = path.join(reportsDir, 'index.html');
        await fs.writeFile(indexPath, html, 'utf-8');
        
        // Also copy to docs folder for GitHub Pages
        const docsDir = path.join(process.cwd(), 'docs');
        await fs.mkdir(docsDir, { recursive: true });
        const docsIndexPath = path.join(docsDir, 'index.html');
        await fs.writeFile(docsIndexPath, html, 'utf-8');

        // Return the relative URL for the report
        const reportUrl = `/reports/${fileName}`;

        sendProgress(100, 'Report generated successfully!');
        sendComplete(reportUrl);
        
      } catch (error) {
        console.error('Report generation error:', error);
        sendError(error instanceof Error ? error.message : 'Failed to generate report');
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function formatDateTime(date: Date): string {
  // Always use UTC to avoid timezone confusion
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  return `${year}.${month}.${day} at ${hours}:${minutes} UTC`;
}


function generateReportHTML(analyses: { count: number; analysis: CensusAnalysis }[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eToro Census Report - ${new Date().toLocaleDateString()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: white;
            color: #111827;
            line-height: 1.5;
        }
        
        .container {
            max-width: 1120px;
            margin: 0 auto;
            padding: 0 24px;
        }
        
        .header {
            background-color: white;
            border-bottom: 1px solid #e5e7eb;
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
        
        .header .subtitle {
            font-size: 1.125rem;
            color: #6b7280;
        }
        
        .header .timestamp {
            font-size: 0.875rem;
            color: #9ca3af;
            margin-top: 8px;
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
        
        .grid-cols-4 {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }
        
        .card {
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .card-title {
            font-size: 0.875rem;
            font-weight: 500;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .metric-value {
            font-size: 4rem;
            font-weight: 700;
            color: #111827;
            line-height: 1;
            text-align: center;
            margin: 20px 0;
        }
        
        .metric-label {
            font-size: 1rem;
            color: #6b7280;
            text-align: center;
        }
        
        /* Fear & Greed Gauge */
        .gauge-container {
            position: relative;
            width: 100%;
            max-width: 280px;
            margin: 0 auto;
        }
        
        .gauge-arc {
            width: 100%;
            height: auto;
        }
        
        .gauge-needle {
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 3px;
            height: 50%;
            background-color: #111827;
            transform-origin: bottom center;
            transition: transform 0.5s ease;
        }
        
        .gauge-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 16px;
            font-size: 0.75rem;
        }
        
        .fear-label {
            color: #ef4444;
        }
        
        .greed-label {
            color: #10b981;
        }
        
        /* Charts */
        .chart-container {
            width: 100%;
            padding: 24px;
        }
        
        .bar-chart {
            display: flex;
            align-items: flex-end;
            height: 200px;
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .bar-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
        }
        
        .bar {
            width: 100%;
            background-color: #00C896;
            border-radius: 4px 4px 0 0;
            transition: background-color 0.3s;
            position: relative;
        }
        
        .bar:hover {
            background-color: #00B085;
        }
        
        .bar-value {
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            font-weight: 600;
            color: #111827;
        }
        
        .bar-label {
            margin-top: 8px;
            font-size: 0.75rem;
            color: #6b7280;
            text-align: center;
            max-width: 100px;
        }
        
        /* Tables */
        .table-container {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background-color: #f9fafb;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.875rem;
            color: #111827;
            border-bottom: 1px solid #e5e7eb;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
        }
        
        tr:hover {
            background-color: #f9fafb;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-green {
            color: #10b981;
        }
        
        .text-red {
            color: #ef4444;
        }
        
        /* Instrument images */
        .instrument-image {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 12px;
            vertical-align: middle;
        }
        
        /* Full width sections */
        .full-width {
            width: 100vw;
            margin-left: calc(-50vw + 50%);
            background-color: #f9fafb;
            padding: 48px 0;
            margin-top: 48px;
            margin-bottom: 48px;
        }
        
        /* Footer */
        .footer {
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
                font-size: 3rem;
            }
            
            .tabs {
                justify-content: flex-start;
            }
            
            .grid-cols-4 {
                grid-template-columns: 1fr;
            }
        }
        
        /* Top row with gauge and metrics */
        .top-row {
            display: grid;
            grid-template-columns: 1fr 3fr;
            gap: 24px;
            margin-bottom: 32px;
            align-items: stretch;
        }
        
        @media (max-width: 1024px) {
            .top-row {
                grid-template-columns: 1fr;
            }
        }
        
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 12px;
            vertical-align: middle;
            background-color: #e5e7eb;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .badge-green {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .badge-red {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .badge-blue {
            background-color: #dbeafe;
            color: #1e40af;
        }
        
        .badge-yellow {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .placeholder-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
            margin-right: 12px;
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>eToro Popular Investors Census</h1>
            <p class="subtitle">Comprehensive analysis of top performers and portfolio trends</p>
            <p class="timestamp">Report generated on ${formatDateTime(new Date())}</p>
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
                <div class="container">
                    <!-- Top Row: Fear/Greed + Key Metrics -->
                    <div class="top-row">
                        <!-- Fear & Greed Gauge -->
                        <div class="card">
                            <div class="card-content">
                                <h3 class="card-title">Fear & Greed Index</h3>
                                <div class="gauge-container">
                                    <svg class="gauge-arc" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                                                <stop offset="25%" style="stop-color:#f59e0b;stop-opacity:1" />
                                                <stop offset="50%" style="stop-color:#fbbf24;stop-opacity:1" />
                                                <stop offset="75%" style="stop-color:#84cc16;stop-opacity:1" />
                                                <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M 10 90 A 80 80 0 0 1 190 90" fill="none" stroke="url(#gaugeGradient)" stroke-width="20" stroke-linecap="round"/>
                                        <line x1="100" y1="90" x2="100" y2="30" stroke="#111827" stroke-width="3" stroke-linecap="round" transform="rotate(${(item.analysis.fearGreedIndex - 50) * 1.8} 100 90)"/>
                                        <circle cx="100" cy="90" r="6" fill="#111827"/>
                                    </svg>
                                    <div class="metric-value">${item.analysis.fearGreedIndex}</div>
                                    <div class="metric-label">
                                        ${item.analysis.fearGreedIndex < 20 ? 'Extreme Fear' :
                                          item.analysis.fearGreedIndex < 40 ? 'Fear' :
                                          item.analysis.fearGreedIndex < 60 ? 'Neutral' :
                                          item.analysis.fearGreedIndex < 80 ? 'Greed' : 'Extreme Greed'}
                                    </div>
                                </div>
                                <div class="gauge-labels">
                                    <span class="fear-label">Fear</span>
                                    <span class="greed-label">Greed</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Key Metrics Grid -->
                        <div class="grid grid-cols-4">
                            <div class="card">
                                <h3 class="card-title">Average Returns</h3>
                                <div class="metric-value">${item.analysis.averageGain.toFixed(1)}%</div>
                            </div>
                            <div class="card">
                                <h3 class="card-title">Average Cash</h3>
                                <div class="metric-value">${item.analysis.averageCashPercentage.toFixed(1)}%</div>
                            </div>
                            <div class="card">
                                <h3 class="card-title">Average Risk Score</h3>
                                <div class="metric-value">${item.analysis.averageRiskScore.toFixed(1)}</div>
                            </div>
                            <div class="card">
                                <h3 class="card-title">Average Copiers</h3>
                                <div class="metric-value">${item.analysis.averageCopiers.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Distribution Charts - Full Width -->
                <div class="full-width">
                    <div class="container">
                        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                            <!-- Returns Distribution -->
                            <div class="card">
                                <h3 class="card-title">Returns Distribution</h3>
                                <div class="chart-container">
                                    <div class="bar-chart">
                                        ${Object.entries(item.analysis.returnsDistribution).map(([range, count]) => {
                                            const maxCount = Math.max(...Object.values(item.analysis.returnsDistribution));
                                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                            return `
                                                <div class="bar-group">
                                                    <div class="bar" style="height: ${height}%;">
                                                        <span class="bar-value">${count}</span>
                                                    </div>
                                                    <span class="bar-label">${range}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>

                            <!-- Risk Score Distribution -->
                            <div class="card">
                                <h3 class="card-title">Risk Score Distribution</h3>
                                <div class="chart-container">
                                    <div class="bar-chart">
                                        ${Object.entries(item.analysis.riskScoreDistribution).map(([range, count]) => {
                                            const maxCount = Math.max(...Object.values(item.analysis.riskScoreDistribution));
                                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                            return `
                                                <div class="bar-group">
                                                    <div class="bar" style="height: ${height}%;">
                                                        <span class="bar-value">${count}</span>
                                                    </div>
                                                    <span class="bar-label">${range}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>

                            <!-- Portfolio Diversification -->
                            <div class="card">
                                <h3 class="card-title">Portfolio Diversification</h3>
                                <div class="chart-container">
                                    <div class="bar-chart">
                                        ${Object.entries(item.analysis.uniqueInstrumentsDistribution).map(([range, count]) => {
                                            const maxCount = Math.max(...Object.values(item.analysis.uniqueInstrumentsDistribution));
                                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                            return `
                                                <div class="bar-group">
                                                    <div class="bar" style="height: ${height}%;">
                                                        <span class="bar-value">${count}</span>
                                                    </div>
                                                    <span class="bar-label">${range}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>

                            <!-- Cash Allocation -->
                            <div class="card">
                                <h3 class="card-title">Cash Allocation</h3>
                                <div class="chart-container">
                                    <div class="bar-chart">
                                        ${Object.entries(item.analysis.cashPercentageDistribution).map(([range, count]) => {
                                            const maxCount = Math.max(...Object.values(item.analysis.cashPercentageDistribution));
                                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                            return `
                                                <div class="bar-group">
                                                    <div class="bar" style="height: ${height}%;">
                                                        <span class="bar-value">${count}</span>
                                                    </div>
                                                    <span class="bar-label">${range}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tables -->
                <div class="container">
                    <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 48px;">
                        <!-- Top Holdings -->
                        <div class="card">
                            <h3 class="card-title">Top Holdings</h3>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Instrument</th>
                                            <th class="text-right">Average Allocation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${item.analysis.topHoldings.slice(0, 10).map(holding => `
                                            <tr>
                                                <td>
                                                    ${holding.imageUrl ? 
                                                        `<img src="${holding.imageUrl}" alt="${holding.symbol}" class="instrument-image" onerror="this.style.display='none'">` : 
                                                        ''}
                                                    <strong>${truncateText(holding.name, 24)}</strong>
                                                    <span style="color: #6b7280; margin-left: 8px;">${holding.symbol}</span>
                                                </td>
                                                <td class="text-right">
                                                    <span class="badge badge-blue">${holding.averageAllocation.toFixed(2)}%</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Top Performers -->
                        <div class="card">
                            <h3 class="card-title">Top Performers</h3>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Investor</th>
                                            <th class="text-right">Returns</th>
                                            <th class="text-right">Copiers</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${item.analysis.topPerformers.slice(0, 10).map(performer => `
                                            <tr>
                                                <td>
                                                    ${performer.avatarUrl ? 
                                                        `<img src="${performer.avatarUrl}" alt="${performer.fullName}" class="avatar" onerror="this.style.display='none'">` : 
                                                        `<span class="placeholder-avatar">${performer.fullName.charAt(0).toUpperCase()}</span>`}
                                                    <strong>${truncateText(performer.fullName, 24)}</strong>
                                                </td>
                                                <td class="text-right">
                                                    <span class="${performer.gain >= 0 ? 'text-green' : 'text-red'}">
                                                        ${performer.gain >= 0 ? '+' : ''}${performer.gain.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td class="text-right">
                                                    <span class="badge badge-yellow">${performer.copiers.toLocaleString()}</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>Generated by <a href="https://github.com/weirdapps/etoro_census" target="_blank">eToro Census</a></p>
        <p>Data sourced from eToro's public API</p>
    </div>

    <script>
        function showTab(index) {
            // Hide all tabs and contents
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Show selected tab and content
            document.querySelectorAll('.tab')[index].classList.add('active');
            document.getElementById('tab-' + index).classList.add('active');
        }
    </script>
</body>
</html>`;
}