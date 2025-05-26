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
        const { limit = 1500, period = 'CurrYear' } = await request.json();
        
        sendProgress(0, 'Fetching popular investors...');
        
        // Fetch all investors up to the limit
        const allInvestors = await getPopularInvestors(period as PeriodType, limit);
        
        if (allInvestors.length === 0) {
          throw new Error('No investors found');
        }
        
        sendProgress(5, `Found ${allInvestors.length} investors. Starting analysis...`);
        
        // Define the subsets we want to analyze
        const subsetSizes = [100, 500, 1000, 1500].filter(size => size <= allInvestors.length);
        const analyses: { count: number; analysis: CensusAnalysis }[] = [];
        
        // Analyze each subset
        for (let i = 0; i < subsetSizes.length; i++) {
          const subsetSize = subsetSizes[i];
          const subset = allInvestors.slice(0, subsetSize);
          
          const baseProgress = 5 + (i * 85 / subsetSizes.length);
          const nextProgress = 5 + ((i + 1) * 85 / subsetSizes.length);
          
          sendProgress(baseProgress, `Analyzing top ${subsetSize} investors...`);
          
          // Add delay between analyses to avoid caching issues
          if (i > 0) {
            sendProgress(baseProgress, `Waiting before analyzing top ${subsetSize}...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
          }
          
          // Create progress callback for this subset
          const onProgress: ProgressCallback = (progress: number, message: string) => {
            const scaledProgress = baseProgress + (progress * (nextProgress - baseProgress) / 100);
            sendProgress(Math.round(scaledProgress), `Top ${subsetSize}: ${message}`);
          };
          
          // Run the census analysis for this subset
          const analysis = await performCensusAnalysis(subset, onProgress);
          
          if (!analysis) {
            throw new Error(`Failed to analyze top ${subsetSize} investors`);
          }
          
          analyses.push({ count: subsetSize, analysis });
        }

        sendProgress(95, 'Generating HTML report...');

        // Create reports directory if it doesn't exist
        const reportsDir = path.join(process.cwd(), 'public', 'reports');
        await fs.mkdir(reportsDir, { recursive: true });

        // Generate timestamp for filename
        const date = new Date();
        const fileName = `etoro-census-${date.toISOString().split('T')[0]}-${Date.now()}.html`;
        const filePath = path.join(reportsDir, fileName);

        // Generate the HTML report with tabs for different investor counts
        const html = generateReportHTML(analyses);

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  // Get timezone offset in hours
  const timezoneOffset = -date.getTimezoneOffset() / 60;
  const timezoneSign = timezoneOffset >= 0 ? '+' : '';
  const timezoneHours = Math.floor(Math.abs(timezoneOffset));
  const timezoneMinutes = (Math.abs(timezoneOffset) % 1) * 60;
  
  let timezone = `GMT${timezoneSign}${timezoneHours}`;
  if (timezoneMinutes > 0) {
    timezone += `:${String(timezoneMinutes).padStart(2, '0')}`;
  }
  
  return `${year}.${month}.${day} at ${hours}:${minutes} ${timezone}`;
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
            padding: 24px;
        }
        
        .header h1 {
            font-size: 1.875rem;
            font-weight: 700;
            color: #111827;
            letter-spacing: -0.025em;
            margin-bottom: 4px;
        }
        
        .creator {
            font-size: 0.875rem;
            color: #6b7280;
            margin-top: 2px;
        }
        
        .creator a {
            color: #00C896;
            text-decoration: none;
        }
        
        .creator a:hover {
            text-decoration: underline;
        }
        
        .subtitle {
            font-size: 0.875rem;
            color: #6b7280;
            text-align: right;
        }
        
        /* Tabs */
        .tabs {
            display: flex;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            margin-bottom: 32px;
        }
        
        .tab {
            flex: 1;
            padding: 16px 24px;
            background-color: white;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            color: #374151;
            transition: all 0.2s;
            border-bottom: 3px solid transparent;
        }
        
        .tab:hover {
            background-color: white;
        }
        
        .tab.active {
            background-color: #00C896;
            color: white;
            border-bottom-color: #00B085;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        /* Layout */
        .space-y-8 > * + * {
            margin-top: 32px;
        }
        
        .space-y-4 > * + * {
            margin-top: 16px;
        }
        
        .space-y-2 > * + * {
            margin-top: 8px;
        }
        
        /* Summary Box */
        .summary-box {
            text-align: center;
            background-color: white;
            border-radius: 8px;
            padding: 16px;
            border: 1px solid #e5e7eb;
        }
        
        .summary-text {
            font-size: 1.125rem;
            font-weight: 500;
        }
        
        .highlight {
            color: #00C896;
            font-weight: 700;
        }
        
        /* Grid */
        .grid-3 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
        }
        
        /* Cards */
        .card {
            background-color: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
        }
        
        .card-header {
            padding: 20px 24px 0;
        }
        
        .card-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .card-description {
            font-size: 0.875rem;
            color: #6b7280;
        }
        
        .card-content {
            padding: 24px;
        }
        
        /* Metrics */
        .metric-card-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 120px;
            gap: 12px;
        }
        
        .metric-value {
            font-size: 4rem;
            font-weight: 700;
            color: #00C896;
            line-height: 1;
            text-align: center;
        }
        
        .metric-description {
            font-size: 0.875rem;
            color: #6b7280;
            text-align: left;
            width: 100%;
            padding: 0 20px;
        }
        
        /* Fear & Greed Gauge */
        .gauge-container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .gauge-svg {
            width: 192px;
            height: 100px;
            margin-bottom: 16px;
            overflow: visible;
        }
        
        .gauge-value {
            font-size: 2rem;
            font-weight: 700;
        }
        
        .gauge-label {
            font-size: 1.125rem;
            font-weight: 500;
        }
        
        /* Progress Bars */
        .progress-item {
            margin-bottom: 16px;
        }
        
        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .progress-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #111827;
        }
        
        .progress-stats {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .progress-count {
            font-size: 0.875rem;
            color: #6b7280;
        }
        
        .progress-percentage {
            font-size: 0.75rem;
            background-color: white;
            color: #00C896;
            padding: 2px 8px;
            border-radius: 9999px;
            border: 1px solid #00C896;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 9999px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            border-radius: 9999px;
            transition: width 0.3s ease;
        }
        
        .progress-blue {
            background: linear-gradient(to right, #3b82f6, #8b5cf6);
        }
        
        .progress-green {
            background: linear-gradient(to right, #10b981, #34d399);
        }
        
        .progress-yellow {
            background: linear-gradient(to right, #f59e0b, #fbbf24);
        }
        
        .progress-red {
            background: linear-gradient(to right, #ef4444, #f87171);
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        thead {
            background-color: transparent;
        }
        
        th {
            text-align: left;
            padding: 12px 16px;
            font-weight: 500;
            font-size: 0.875rem;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
        }
        
        th.text-right {
            text-align: right;
        }
        
        td {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        td.text-right {
            text-align: right;
        }
        
        tr:hover td {
            background-color: white;
        }
        
        /* Table Elements */
        .name-cell {
            display: flex;
            align-items: center;
            gap: 12px;
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
            background: white;
            border: 2px solid #00C896;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00C896;
            font-size: 0.875rem;
            font-weight: 600;
            flex-shrink: 0;
        }
        
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
            background: white;
            border: 2px solid #00C896;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00C896;
            font-size: 0.75rem;
            font-weight: 500;
            flex-shrink: 0;
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
        
        .positive {
            color: #10b981;
            font-weight: 500;
        }
        
        .negative {
            color: #ef4444;
            font-weight: 500;
        }
        
        .text-orange-500 {
            color: #f97316;
        }
        
        .text-yellow-500 {
            color: #eab308;
        }
        
        .text-lime-500 {
            color: #84cc16;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .badge-blue {
            background-color: white;
            color: #1e40af;
            border: 1px solid #1e40af;
        }
        
        .badge-green {
            background-color: white;
            color: #065f46;
            border: 1px solid #065f46;
        }
        
        .badge-yellow {
            background-color: white;
            color: #92400e;
            border: 1px solid #92400e;
        }
        
        .badge-red {
            background-color: white;
            color: #991b1b;
            border: 1px solid #991b1b;
        }
        
        .badge-primary {
            background-color: white;
            color: #00C896;
            border: 1px solid #00C896;
        }
        
        .badge-purple {
            background-color: white;
            color: #6b21a8;
            border: 1px solid #6b21a8;
        }
        
        .rank {
            font-weight: 500;
            color: #6b7280;
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            flex-wrap: wrap;
        }
        
        .pagination-info {
            font-size: 0.875rem;
            color: #6b7280;
            margin-right: 16px;
        }
        
        .pagination-btn {
            padding: 6px 12px;
            border: 1px solid #e5e7eb;
            background-color: white;
            color: #374151;
            font-size: 0.875rem;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .pagination-btn:hover:not(:disabled) {
            background-color: white;
            border-color: #d1d5db;
        }
        
        .pagination-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .pagination-btn.active {
            background-color: #00C896;
            color: white;
            border-color: #00C896;
        }
        
        .pagination-dots {
            padding: 6px 8px;
            color: #6b7280;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 48px 0 32px;
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
        
        /* Hide elements for pagination */
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>etoro PI Census</h1>
            <p class="creator">created by <a href="https://www.etoro.com/people/plessas" target="_blank" rel="noopener noreferrer">@plessas</a> at ${formatDateTime(new Date())}</p>
        </div>
    </div>
    
    <div class="container">
        <div class="tabs">
            ${analyses.map((data, index) => `
                <button class="tab ${index === 0 ? 'active' : ''}" onclick="showTab(${index})">
                    Top ${data.count} PIs
                </button>
            `).join('')}
        </div>
        
        ${analyses.map((data, index) => `
            <div class="tab-content ${index === 0 ? 'active' : ''}" id="tab-${index}">
                <div class="space-y-8">
                    <!-- Top Row: Fear/Greed + Key Metrics -->
                    <div class="grid-3">
                        <!-- Fear & Greed Gauge -->
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Fear & Greed Index</h3>
                            </div>
                            <div class="card-content">
                                <div class="gauge-container">
                                    <svg class="gauge-svg" viewBox="0 0 192 96" style="overflow: visible;">
                                        <defs>
                                            <linearGradient id="gaugeGradient${index}" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stop-color="#ef4444" />
                                                <stop offset="25%" stop-color="#f97316" />
                                                <stop offset="50%" stop-color="#eab308" />
                                                <stop offset="75%" stop-color="#84cc16" />
                                                <stop offset="100%" stop-color="#22c55e" />
                                            </linearGradient>
                                        </defs>
                                        
                                        <path
                                            d="M 16 80 A 80 80 0 0 1 176 80"
                                            fill="none"
                                            stroke="url(#gaugeGradient${index})"
                                            stroke-width="8"
                                            stroke-linecap="round"
                                        />
                                        
                                        <line
                                            x1="96"
                                            y1="80"
                                            x2="96"
                                            y2="20"
                                            stroke="#111827"
                                            stroke-width="3"
                                            stroke-linecap="round"
                                            transform="rotate(${((data.analysis.fearGreedIndex / 100) * 180) - 90}, 96, 80)"
                                        />
                                        
                                        <circle cx="96" cy="80" r="4" fill="#111827" />
                                    </svg>
                                    
                                    <div class="gauge-value ${
                                        data.analysis.fearGreedIndex <= 20 ? 'negative' :
                                        data.analysis.fearGreedIndex <= 40 ? 'text-orange-500' :
                                        data.analysis.fearGreedIndex <= 60 ? 'text-yellow-500' :
                                        data.analysis.fearGreedIndex <= 80 ? 'text-lime-500' :
                                        'positive'
                                    }">
                                        ${data.analysis.fearGreedIndex}
                                    </div>
                                    <div class="gauge-label ${
                                        data.analysis.fearGreedIndex <= 20 ? 'negative' :
                                        data.analysis.fearGreedIndex <= 40 ? 'text-orange-500' :
                                        data.analysis.fearGreedIndex <= 60 ? 'text-yellow-500' :
                                        data.analysis.fearGreedIndex <= 80 ? 'text-lime-500' :
                                        'positive'
                                    }">
                                        ${
                                            data.analysis.fearGreedIndex <= 20 ? 'Extreme Fear' :
                                            data.analysis.fearGreedIndex <= 40 ? 'Fear' :
                                            data.analysis.fearGreedIndex <= 60 ? 'Neutral' :
                                            data.analysis.fearGreedIndex <= 80 ? 'Greed' :
                                            'Extreme Greed'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Average Unique Instruments -->
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Average Unique Instruments</h3>
                                <p class="card-description">Per portfolio</p>
                            </div>
                            <div class="card-content">
                                <div class="metric-card-content">
                                    <div class="metric-value">${data.analysis.averageUniqueInstruments}</div>
                                    <p class="metric-description">Average number of instruments held</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Average Cash Holding -->
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Average Cash Holding</h3>
                                <p class="card-description">Per portfolio</p>
                            </div>
                            <div class="card-content">
                                <div class="metric-card-content">
                                    <div class="metric-value">${data.analysis.averageCashPercentage.toFixed(1)}%</div>
                                    <p class="metric-description">Average percentage of portfolio in cash</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Portfolio Diversification -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Portfolio Diversification</h3>
                            <p class="card-description">Unique instruments distribution</p>
                        </div>
                        <div class="card-content">
                            <div class="space-y-4">
                                ${Object.entries(data.analysis.uniqueInstrumentsDistribution).map(([range, count]) => {
                                    const total = Object.values(data.analysis.uniqueInstrumentsDistribution).reduce((sum, val) => sum + val, 0);
                                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                    return `
                                        <div class="progress-item">
                                            <div class="progress-header">
                                                <span class="progress-label">${range} instruments</span>
                                                <div class="progress-stats">
                                                    <span class="progress-count">${count} investors</span>
                                                    <span class="progress-percentage">${percentage}%</span>
                                                </div>
                                            </div>
                                            <div class="progress-bar">
                                                <div class="progress-fill progress-blue" style="width: ${percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Cash Allocation -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Cash Allocation</h3>
                            <p class="card-description">Distribution of cash percentages across portfolios</p>
                        </div>
                        <div class="card-content">
                            <div class="space-y-4">
                                ${Object.entries(data.analysis.cashPercentageDistribution).map(([range, count]) => {
                                    const total = Object.values(data.analysis.cashPercentageDistribution).reduce((sum, val) => sum + val, 0);
                                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                    return `
                                        <div class="progress-item">
                                            <div class="progress-header">
                                                <span class="progress-label">${range}</span>
                                                <div class="progress-stats">
                                                    <span class="progress-count">${count} investors</span>
                                                    <span class="progress-percentage">${percentage}%</span>
                                                </div>
                                            </div>
                                            <div class="progress-bar">
                                                <div class="progress-fill progress-blue" style="width: ${percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Returns Distribution -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Returns Distribution</h3>
                            <p class="card-description">Current year performance distribution</p>
                        </div>
                        <div class="card-content">
                            <div class="space-y-4">
                                ${Object.entries(data.analysis.returnsDistribution).map(([range, count]) => {
                                    const total = Object.values(data.analysis.returnsDistribution).reduce((sum, val) => sum + val, 0);
                                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                    const isLoss = range === 'Loss';
                                    return `
                                        <div class="progress-item">
                                            <div class="progress-header">
                                                <span class="progress-label">${range}</span>
                                                <div class="progress-stats">
                                                    <span class="progress-count">${count} investors</span>
                                                    <span class="progress-percentage">${percentage}%</span>
                                                </div>
                                            </div>
                                            <div class="progress-bar">
                                                <div class="progress-fill ${isLoss ? 'progress-red' : 'progress-green'}" style="width: ${percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Risk Score Distribution -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Risk Score Distribution</h3>
                            <p class="card-description">Investor risk profile distribution</p>
                        </div>
                        <div class="card-content">
                            <div class="space-y-4">
                                ${Object.entries(data.analysis.riskScoreDistribution).map(([range, count]) => {
                                    const total = Object.values(data.analysis.riskScoreDistribution).reduce((sum, val) => sum + val, 0);
                                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                    const colorClass = range.includes('Conservative') ? 'progress-green' :
                                                      range.includes('Moderate') ? 'progress-yellow' :
                                                      range.includes('Aggressive') ? 'progress-yellow' : 'progress-red';
                                    return `
                                        <div class="progress-item">
                                            <div class="progress-header">
                                                <span class="progress-label">${range}</span>
                                                <div class="progress-stats">
                                                    <span class="progress-count">${count} investors</span>
                                                    <span class="progress-percentage">${percentage}%</span>
                                                </div>
                                            </div>
                                            <div class="progress-bar">
                                                <div class="progress-fill ${colorClass}" style="width: ${percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Top Holdings -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Most Popular Holdings</h3>
                            <p class="card-description">Instruments held by the highest number of investors (${data.analysis.topHoldings.length} total)</p>
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
                                    </tr>
                                </thead>
                                <tbody id="holdings-tbody-${index}">
                                    ${data.analysis.topHoldings.map((holding, idx) => `
                                        <tr class="holdings-row-${index} ${idx >= 20 ? 'hidden' : ''}" data-page="${Math.floor(idx / 20) + 1}">
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
                                            <td class="text-right" style="font-weight: 500;">${holding.holdersCount}</td>
                                            <td class="text-right">
                                                <span class="badge badge-primary">${holding.holdersPercentage}%</span>
                                            </td>
                                            <td class="text-right" style="font-weight: 500;">${holding.averageAllocation.toFixed(1)}%</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${data.analysis.topHoldings.length > 20 ? `
                                <div class="pagination" id="holdings-pagination-${index}">
                                    <span class="pagination-info">
                                        Showing <span id="holdings-start-${index}">1</span>-<span id="holdings-end-${index}">${Math.min(20, data.analysis.topHoldings.length)}</span> of ${data.analysis.topHoldings.length}
                                    </span>
                                    <div id="holdings-pages-${index}"></div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Top Performers -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Most Followed Investors</h3>
                            <p class="card-description">Investors ranked by number of copiers (${data.analysis.topPerformers.length} total)</p>
                        </div>
                        <div class="card-content">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Investor</th>
                                        <th class="text-right">Gain YTD</th>
                                        <th class="text-right">Win Ratio</th>
                                        <th class="text-right">Cash %</th>
                                        <th class="text-right">Risk Score</th>
                                        <th class="text-right">Copiers</th>
                                    </tr>
                                </thead>
                                <tbody id="performers-tbody-${index}">
                                    ${data.analysis.topPerformers.map((performer, idx) => `
                                        <tr class="performers-row-${index} ${idx >= 20 ? 'hidden' : ''}" data-page="${Math.floor(idx / 20) + 1}">
                                            <td class="rank">#${idx + 1}</td>
                                            <td>
                                                <div class="name-cell">
                                                    ${performer.avatarUrl ? 
                                                        `<img src="${performer.avatarUrl}" alt="${performer.fullName}" class="avatar">` :
                                                        `<div class="avatar-placeholder">${(performer.fullName || 'U').charAt(0).toUpperCase()}</div>`
                                                    }
                                                    <div>
                                                        <div class="name-primary" title="${performer.fullName || 'Unknown'}">${truncateText(performer.fullName || 'Unknown', 24)}</div>
                                                        <div class="name-secondary" title="@${performer.username}">@${truncateText(performer.username, 20)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="text-right ${performer.gain >= 0 ? 'positive' : 'negative'}">
                                                ${performer.gain > 0 ? '+' : ''}${performer.gain.toFixed(1)}%
                                            </td>
                                            <td class="text-right">${performer.winRatio.toFixed(1)}%</td>
                                            <td class="text-right">
                                                <span class="badge badge-blue">${performer.cashPercentage.toFixed(1)}%</span>
                                            </td>
                                            <td class="text-right">
                                                <span class="badge ${
                                                    performer.riskScore <= 3 ? 'badge-green' :
                                                    performer.riskScore <= 6 ? 'badge-yellow' : 'badge-red'
                                                }">
                                                    ${performer.riskScore}/10
                                                </span>
                                            </td>
                                            <td class="text-right" style="font-weight: 500;">
                                                <span class="badge badge-purple">
                                                    ${performer.copiers.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${data.analysis.topPerformers.length > 20 ? `
                                <div class="pagination" id="performers-pagination-${index}">
                                    <span class="pagination-info">
                                        Showing <span id="performers-start-${index}">1</span>-<span id="performers-end-${index}">${Math.min(20, data.analysis.topPerformers.length)}</span> of ${data.analysis.topPerformers.length}
                                    </span>
                                    <div id="performers-pages-${index}"></div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="footer">
        <p>Generated by <a href="https://github.com/weirdapps/etoro_census" target="_blank">eToro Census Tool</a></p>
        <p>Data sourced from eToro API</p>
    </div>
    
    <script>
        // Pagination functionality
        function initPagination(tableType, tabIndex, totalItems) {
            if (totalItems <= 20) return;
            
            const itemsPerPage = 20;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            let currentPage = 1;
            
            function showPage(page) {
                currentPage = page;
                
                // Hide all rows
                const rows = document.querySelectorAll('.' + tableType + '-row-' + tabIndex);
                rows.forEach(row => row.classList.add('hidden'));
                
                // Show rows for current page
                const start = (page - 1) * itemsPerPage;
                const end = Math.min(start + itemsPerPage, totalItems);
                
                for (let i = start; i < end; i++) {
                    rows[i].classList.remove('hidden');
                }
                
                // Update info text
                document.getElementById(tableType + '-start-' + tabIndex).textContent = start + 1;
                document.getElementById(tableType + '-end-' + tabIndex).textContent = end;
                
                // Update pagination buttons
                updatePaginationButtons();
            }
            
            function updatePaginationButtons() {
                const container = document.getElementById(tableType + '-pages-' + tabIndex);
                container.innerHTML = '';
                
                // Previous button
                const prevBtn = document.createElement('button');
                prevBtn.className = 'pagination-btn';
                prevBtn.textContent = 'Previous';
                prevBtn.disabled = currentPage === 1;
                prevBtn.onclick = () => showPage(currentPage - 1);
                container.appendChild(prevBtn);
                
                // Page numbers
                const maxVisible = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                
                if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                }
                
                if (startPage > 1) {
                    addPageButton(1);
                    if (startPage > 2) {
                        const dots = document.createElement('span');
                        dots.className = 'pagination-dots';
                        dots.textContent = '...';
                        container.appendChild(dots);
                    }
                }
                
                for (let i = startPage; i <= endPage; i++) {
                    addPageButton(i);
                }
                
                if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                        const dots = document.createElement('span');
                        dots.className = 'pagination-dots';
                        dots.textContent = '...';
                        container.appendChild(dots);
                    }
                    addPageButton(totalPages);
                }
                
                // Next button
                const nextBtn = document.createElement('button');
                nextBtn.className = 'pagination-btn';
                nextBtn.textContent = 'Next';
                nextBtn.disabled = currentPage === totalPages;
                nextBtn.onclick = () => showPage(currentPage + 1);
                container.appendChild(nextBtn);
                
                function addPageButton(pageNum) {
                    const btn = document.createElement('button');
                    btn.className = 'pagination-btn' + (pageNum === currentPage ? ' active' : '');
                    btn.textContent = pageNum;
                    btn.onclick = () => showPage(pageNum);
                    container.appendChild(btn);
                }
            }
            
            // Initialize
            showPage(1);
        }
        
        // Initialize pagination for all tabs
        ${analyses.map((data, index) => `
            if (document.getElementById('holdings-pagination-${index}')) {
                initPagination('holdings', ${index}, ${data.analysis.topHoldings.length});
            }
            if (document.getElementById('performers-pagination-${index}')) {
                initPagination('performers', ${index}, ${data.analysis.topPerformers.length});
            }
        `).join('\n')}
        
        function showTab(index) {
            // Remove active class from all tabs and contents
            const tabs = document.querySelectorAll('.tab');
            const contents = document.querySelectorAll('.tab-content');
            
            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));
            
            // Add active class to selected tab and content
            tabs[index].classList.add('active');
            contents[index].classList.add('active');
        }
    </script>
</body>
</html>`;
}