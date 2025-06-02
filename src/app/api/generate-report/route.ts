import { NextRequest, NextResponse } from 'next/server';
import { CensusAnalysis, InstrumentHolding, PerformerStats } from '@/lib/models/census';
import { getPopularInvestors } from '@/lib/services/user-service';
import { performCensusAnalysis, ProgressCallback } from '@/lib/services/census-service';
import { PeriodType, PopularInvestor } from '@/lib/models/user';
import { getUserPortfolio } from '@/lib/services/user-service';
import { getCountryFlag } from '@/lib/utils/country-mapping';
import { truncateText } from '@/lib/utils';
import { getInstrumentPriceData } from '@/lib/services/instrument-service';
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
        const { period = 'CurrYear' } = await request.json();
        
        sendProgress(0, 'Fetching popular investors...');
        
        // ALWAYS fetch 1500 investors to ensure consistent data across all bands
        const allInvestors = await getPopularInvestors(period as PeriodType, 1500);
        
        if (allInvestors.length === 0) {
          throw new Error('No investors found');
        }
        
        sendProgress(5, `Found ${allInvestors.length} investors. Starting portfolio analysis...`);
        
        // Log initial investor data
        console.log(`\n=== Initial investor fetch ===`);
        console.log(`Fetched: ${allInvestors.length} investors (always fetching 1500 for consistency)`);
        
        // Sort by copiers immediately to ensure consistent ordering
        allInvestors.sort((a, b) => b.copiers - a.copiers);
        console.log(`Sorted ${allInvestors.length} investors by copiers`);
        
        // Debug: Log first few investors to check gain values
        console.log('\n=== First 5 investors with raw gain values ===');
        allInvestors.slice(0, 5).forEach(inv => {
          console.log(`${inv.userName}: gain=${inv.gain}, fullName=${inv.fullName}`);
        });
        
        sendProgress(15, `Preparing to analyze investor bands...`);
        
        // Generate multiple analyses for different investor counts
        const analyses: { count: number; analysis: CensusAnalysis }[] = [];
        const subsetSizes = [100, 500, 1000, 1500].filter(size => size <= allInvestors.length);
        
        // Run separate analysis for each band
        for (let i = 0; i < subsetSizes.length; i++) {
          const size = subsetSizes[i];
          const subset = allInvestors.slice(0, size);
          
          const progressOffset = 15 + (i * 20); // Each band gets 20% of progress
          sendProgress(progressOffset, `Analyzing top ${size} investors...`);
          
          const onProgress: ProgressCallback = (progress: number, message: string) => {
            const scaledProgress = progressOffset + (progress * 20 / 100);
            sendProgress(Math.round(scaledProgress), message);
          };
          
          try {
            console.log(`\n=== Starting analysis for top ${size} investors ===`);
            
            // Pre-analysis logging to check raw data
            const gains = subset.map(inv => inv.gain);
            const sortedGains = [...gains].sort((a, b) => a - b);
            const median = sortedGains[Math.floor(sortedGains.length / 2)];
            const sum = gains.reduce((acc, g) => acc + g, 0);
            const mean = sum / gains.length;
            
            console.log(`Raw data check for ${size} investors:`);
            console.log(`- Sum of all gains: ${sum.toFixed(2)}`);
            console.log(`- Count: ${gains.length}`);
            console.log(`- Mean (sum/count): ${mean.toFixed(2)}%`);
            console.log(`- Median: ${median.toFixed(2)}%`);
            console.log(`- Min: ${Math.min(...gains).toFixed(2)}%`);
            console.log(`- Max: ${Math.max(...gains).toFixed(2)}%`);
            
            // Check for extreme outliers
            const outliers = gains.filter(g => g > 100);
            if (outliers.length > 0) {
              console.log(`WARNING: ${outliers.length} investors with gains > 100%`);
              console.log(`Outlier examples: ${outliers.slice(0, 10).map(g => g.toFixed(1)).join(', ')}%`);
            }
            
            // Distribution check
            const distribution = {
              'negative': gains.filter(g => g < 0).length,
              '0-10%': gains.filter(g => g >= 0 && g <= 10).length,
              '11-25%': gains.filter(g => g > 10 && g <= 25).length,
              '26-50%': gains.filter(g => g > 25 && g <= 50).length,
              '51-100%': gains.filter(g => g > 50 && g <= 100).length,
              '>100%': gains.filter(g => g > 100).length
            };
            console.log('Distribution:', distribution);
            
            const analysis = await performCensusAnalysis(subset, onProgress);
            
            if (!analysis) {
              console.error(`Failed to analyze top ${size} investors`);
              continue;
            }
            
            // Log what census analysis calculated
            console.log(`Census analysis average gain: ${analysis.averageGain.toFixed(2)}%`);
            
            // If there's a discrepancy, log it
            if (Math.abs(analysis.averageGain - mean) > 0.1) {
              console.log(`DISCREPANCY: Raw mean ${mean.toFixed(2)}% vs Census ${analysis.averageGain.toFixed(2)}%`);
            }
            
            analyses.push({ count: size, analysis });
          } catch (error) {
            console.error(`Error analyzing top ${size} investors:`, error);
          }
        }
        
        if (analyses.length === 0) {
          throw new Error('Failed to analyze any investor bands');
        }
        
        sendProgress(95, 'Generating reports...');

        // Create directories if they don't exist
        const reportsDir = path.join(process.cwd(), 'public', 'reports');
        const dataDir = path.join(process.cwd(), 'public', 'data');
        
        await fs.mkdir(reportsDir, { recursive: true });
        await fs.mkdir(dataDir, { recursive: true });

        // Generate timestamp for filename
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timestamp = `${dateStr}-${date.getUTCHours().toString().padStart(2, '0')}-${date.getUTCMinutes().toString().padStart(2, '0')}`; // YYYY-MM-DD-HH-MM
        const htmlFileName = `etoro-census-${timestamp}.html`;
        const jsonFileName = `etoro-data-${timestamp}.json`;
        const htmlFilePath = path.join(reportsDir, htmlFileName);

        // Log key investor positions for debugging
        console.log(`\n=== Key investor positions ===`);
        console.log(`Top investor: ${allInvestors[0]?.userName} with ${allInvestors[0]?.copiers} copiers and ${allInvestors[0]?.gain}% gain`);
        if (allInvestors.length >= 100) console.log(`Investor #100: ${allInvestors[99]?.userName} with ${allInvestors[99]?.copiers} copiers and ${allInvestors[99]?.gain}% gain`);
        if (allInvestors.length >= 500) console.log(`Investor #500: ${allInvestors[499]?.userName} with ${allInvestors[499]?.copiers} copiers and ${allInvestors[499]?.gain}% gain`);
        if (allInvestors.length >= 1000) console.log(`Investor #1000: ${allInvestors[999]?.userName} with ${allInvestors[999]?.copiers} copiers and ${allInvestors[999]?.gain}% gain`);
        if (allInvestors.length >= 1500) console.log(`Investor #1500: ${allInvestors[1499]?.userName} with ${allInvestors[1499]?.copiers} copiers and ${allInvestors[1499]?.gain}% gain`);

        // Prepare JSON data with all user portfolios
        sendProgress(96, 'Collecting portfolio data for JSON export...');
        const jsonData = await prepareJSONExport(allInvestors, analyses, date);
        
        // Write JSON file to data directory (will be committed to git)
        const jsonFilePath = path.join(dataDir, jsonFileName);
        await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`JSON data saved to: ${jsonFilePath} (${(JSON.stringify(jsonData).length / 1024 / 1024).toFixed(2)} MB)`);
        
        sendProgress(98, 'Generating HTML report...');
        
        // Generate the HTML report with multiple tabs
        const html = generateReportHTML(analyses);

        // Write the HTML file
        await fs.writeFile(htmlFilePath, html, 'utf-8');
        
        


        sendProgress(99, 'Finalizing report...');

        // Return the relative URL for the report
        const reportUrl = `/reports/${htmlFileName}`;

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
  // Helper functions for distribution charts
  const getReturnsColorClass = (range: string) => {
    if (range === 'Loss') return '#ef4444'; // red-500
    if (range === '0-10%') return '#fb923c'; // orange-400
    if (range === '11-25%') return '#facc15'; // yellow-400
    if (range === '26-50%') return '#a3e635'; // lime-400
    if (range === '51-100%') return '#22c55e'; // green-500
    return '#10b981'; // emerald-500
  };

  const getReturnsBadgeColor = (range: string) => {
    if (range === 'Loss') return 'background-color: #fee2e2; color: #dc2626;'; // red
    if (range === '0-10%') return 'background-color: #fed7aa; color: #ea580c;'; // orange
    if (range === '11-25%') return 'background-color: #fef3c7; color: #ca8a04;'; // yellow
    if (range === '26-50%') return 'background-color: #ecfccb; color: #65a30d;'; // lime
    if (range === '51-100%') return 'background-color: #dcfce7; color: #16a34a;'; // green
    return 'background-color: #d1fae5; color: #059669;'; // emerald
  };

  const getRiskColorClass = (range: string) => {
    if (range.includes('Conservative')) return '#22c55e'; // green-500
    if (range.includes('Moderate')) return '#3b82f6'; // blue-500
    if (range.includes('Aggressive')) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getRiskBadgeColor = (range: string) => {
    if (range.includes('Conservative')) return 'background-color: #dcfce7; color: #16a34a;'; // green
    if (range.includes('Moderate')) return 'background-color: #dbeafe; color: #2563eb;'; // blue
    if (range.includes('Aggressive')) return 'background-color: #fed7aa; color: #ea580c;'; // orange
    return 'background-color: #fee2e2; color: #dc2626;'; // red
  };

  const getRiskIcon = (range: string) => {
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
        
        .grid-cols-4 {
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
        
        .card-title {
            font-size: 0.875rem;
            font-weight: 500;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
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
        
        .metric-label {
            font-size: 0.875rem;
            color: #6b7280;
            text-align: center;
            margin-top: 8px;
        }
        
        /* Fear & Greed Gauge */
        .gauge-container {
            position: relative;
            width: 100%;
            margin: 0 auto;
            text-align: center;
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
        
        /* Full width sections */
        .full-width {
            width: 100%;
            background-color: #f9fafb;
            padding: 48px 0;
            margin-top: 48px;
            margin-bottom: 48px;
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
            
            .grid-cols-4 {
                grid-template-columns: 1fr;
            }
            
            .top-row {
                grid-template-columns: 1fr;
            }
        }
        
        /* Grid helper */
        .grid-cols-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
        }
        
        @media (max-width: 1024px) {
            .grid-cols-4 {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 640px) {
            .grid-cols-4 {
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
            <p class="creator">created by <a href="https://www.etoro.com/people/plessas" target="_blank" rel="noopener noreferrer">@plessas</a> at ${formatDateTime(new Date())}</p>
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
                            <div style="position: absolute; left: ${item.analysis.fearGreedIndex}%; top: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: #111827; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-weight: 700; font-size: 1rem;">${item.analysis.fearGreedIndex}</span>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 16px;">
                            <div style="text-align: left;">
                                <div style="font-size: 0.875rem; color: #ef4444; font-weight: 500;">Extreme Fear</div>
                                <div style="font-size: 0.75rem; color: #6b7280;">0</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.125rem; color: ${item.analysis.fearGreedIndex >= 60 ? '#84cc16' : item.analysis.fearGreedIndex >= 40 ? '#fbbf24' : '#ef4444'}; font-weight: 700;">
                                    ${item.analysis.fearGreedIndex < 20 ? 'Extreme Fear' :
                                      item.analysis.fearGreedIndex < 40 ? 'Fear' :
                                      item.analysis.fearGreedIndex < 60 ? 'Neutral' :
                                      item.analysis.fearGreedIndex < 80 ? 'Greed' : 'Extreme Greed'}
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
                <div class="grid grid-cols-4" style="margin-bottom: 32px;">
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
                        <div class="card">
                            <div class="card-header">
                                <h3>Average Trades</h3>
                                <p class="card-description">Per Popular Investor</p>
                            </div>
                            <div class="metric-value">${(item.analysis.averageTrades || 0).toLocaleString()}</div>
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
                                <tbody id="holdings-tbody-${index}">
                                    ${(item.analysis.topHoldings || []).map((holding, idx) => `
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
                            ${(item.analysis.topHoldings || []).length === 0 ? `
                                <div style="text-align: center; padding: 32px 0; color: #6b7280;">
                                    No holdings data available
                                </div>
                            ` : ''}
                            ${(item.analysis.topHoldings || []).length > 20 ? `
                                <div class="pagination">
                                    <div class="pagination-info">
                                        Showing <span id="holdings-showing-${index}">1-20</span> of ${(item.analysis.topHoldings || []).length}
                                    </div>
                                    <div class="pagination-controls">
                                        <button class="pagination-btn" onclick="changePage('holdings', ${index}, -1)" id="holdings-prev-${index}" disabled>Previous</button>
                                        <span id="holdings-page-${index}">Page 1 of ${Math.ceil((item.analysis.topHoldings || []).length / 20)}</span>
                                        <button class="pagination-btn" onclick="changePage('holdings', ${index}, 1)" id="holdings-next-${index}">Next</button>
                                    </div>
                                </div>
                            ` : ''}
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
                                        <th class="text-right">Trades</th>
                                        <th class="text-right">Win Ratio</th>
                                        <th class="text-right">Cash %</th>
                                        <th class="text-right">Risk Score</th>
                                        <th class="text-right">Copiers</th>
                                    </tr>
                                </thead>
                                <tbody id="performers-tbody-${index}">
                                    ${(item.analysis.topPerformers || []).slice(0, item.count).map((performer, idx) => `
                                        <tr class="performers-row-${index} ${idx >= 20 ? 'hidden' : ''}" data-page="${Math.floor(idx / 20) + 1}">
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
                                            <td class="text-right">${performer.trades || 0}</td>
                                            <td class="text-right">${(performer.winRatio || 0).toFixed(1)}%</td>
                                            <td class="text-right">
                                                <span class="badge badge-blue">${(performer.cashPercentage || 0).toFixed(1)}%</span>
                                            </td>
                                            <td class="text-right">
                                                <span class="risk-badge risk-${performer.riskScore || 0}">${performer.riskScore || '-'}/10</span>
                                            </td>
                                            <td class="text-right">
                                                <span class="badge badge-purple">${(performer.copiers || 0).toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${(item.analysis.topPerformers || []).length === 0 ? `
                                <div style="text-align: center; padding: 32px 0; color: #6b7280;">
                                    No performer data available
                                </div>
                            ` : ''}
                            ${(item.analysis.topPerformers || []).slice(0, item.count).length > 20 ? `
                                <div class="pagination">
                                    <div class="pagination-info">
                                        Showing <span id="performers-showing-${index}">1-20</span> of ${Math.min((item.analysis.topPerformers || []).length, item.count)}
                                    </div>
                                    <div class="pagination-controls">
                                        <button class="pagination-btn" onclick="changePage('performers', ${index}, -1)" id="performers-prev-${index}" disabled>Previous</button>
                                        <span id="performers-page-${index}">Page 1 of ${Math.ceil(Math.min((item.analysis.topPerformers || []).length, item.count) / 20)}</span>
                                        <button class="pagination-btn" onclick="changePage('performers', ${index}, 1)" id="performers-next-${index}">Next</button>
                                    </div>
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
        <p>Data sourced from eToro's API - Tool created by <a href="https://www.etoro.com/people/plessas" target="_blank" rel="noopener noreferrer">@plessas</a>, not affiliated with eToro.</p>
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
        
        function changePage(type, tabIndex, direction) {
            const rows = document.querySelectorAll('.' + type + '-row-' + tabIndex);
            const pageSpan = document.getElementById(type + '-page-' + tabIndex);
            const showingSpan = document.getElementById(type + '-showing-' + tabIndex);
            const prevBtn = document.getElementById(type + '-prev-' + tabIndex);
            const nextBtn = document.getElementById(type + '-next-' + tabIndex);
            
            // Get current page
            const currentPageText = pageSpan.textContent;
            const currentPage = parseInt(currentPageText.match(/Page (\\d+)/)[1]);
            const totalPages = parseInt(currentPageText.match(/of (\\d+)/)[1]);
            
            // Calculate new page
            const newPage = currentPage + direction;
            if (newPage < 1 || newPage > totalPages) return;
            
            // Hide all rows
            rows.forEach(row => row.classList.add('hidden'));
            
            // Show rows for new page
            rows.forEach(row => {
                const rowPage = parseInt(row.getAttribute('data-page'));
                if (rowPage === newPage) {
                    row.classList.remove('hidden');
                }
            });
            
            // Update page display
            pageSpan.textContent = 'Page ' + newPage + ' of ' + totalPages;
            
            // Update showing display
            const itemsPerPage = 20;
            const start = (newPage - 1) * itemsPerPage + 1;
            const end = Math.min(newPage * itemsPerPage, rows.length);
            showingSpan.textContent = start + '-' + end;
            
            // Update button states
            prevBtn.disabled = newPage === 1;
            nextBtn.disabled = newPage === totalPages;
        }
    </script>
</body>
</html>`;
}

interface InvestorWithPortfolio extends PopularInvestor {
  portfolio: {
    realizedCreditPct?: number;
    unrealizedCreditPct?: number;
    totalValue?: number;
    profitLoss?: number;
    profitLossPercentage?: number;
    positionsCount: number;
    socialTradesCount: number;
    positions: Array<{
      positionId: number;
      instrumentId: number;
      instrumentName?: string;
      isBuy: boolean;
      leverage: number;
      investmentPct?: number;
      netProfit?: number;
      currentValue?: number;
      currentRate?: number;
      openRate: number;
      openTimestamp: string;
    }>;
    socialTrades: Array<{
      socialTradeId: number;
      parentUsername: string;
      investmentPct?: number;
      netProfit?: number;
      realizedPct?: number;
      unrealizedPct?: number;
      openTimestamp: string;
    }>;
  } | null;
  portfolioError?: string;
}

interface InstrumentData {
  instrumentId: number;
  instrumentName: string;
  symbol: string;
  imageUrl?: string;
  currentPrice?: number;
  closingPrices?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  returns?: {
    yesterday: number;
    weekTD: number;
    monthTD: number;
  };
}

interface AnalysisExport {
  investorCount: number;
  fearGreedIndex: number;
  averages: {
    gain: number;
    cashPercentage: number;
    riskScore: number;
    copiers: number;
    uniqueInstruments: number;
  };
  distributions: {
    returns: { [range: string]: number };
    riskScore: { [range: string]: number };
    uniqueInstruments: { [range: string]: number };
    cashPercentage: { [range: string]: number };
  };
  topHoldings: InstrumentHolding[];
  topPerformers: PerformerStats[];
}

interface JSONExportData {
  metadata: {
    generatedAt: string;
    generatedAtUTC: string;
    totalInvestors: number;
    analysisGroups: { count: number }[];
    dataSource: string;
    period: string;
  };
  investors: InvestorWithPortfolio[];
  instruments: InstrumentData[];
  analyses: AnalysisExport[];
}

async function prepareJSONExport(
  investors: PopularInvestor[], 
  analyses: { count: number; analysis: CensusAnalysis }[],
  date: Date
): Promise<JSONExportData> {
  console.log('Preparing JSON export for', investors.length, 'investors');
  
  // Collect detailed portfolio data for each investor
  const investorsWithPortfolios: InvestorWithPortfolio[] = [];
  
  for (const investor of investors) {
    try {
      const portfolio = await getUserPortfolio(investor.userName);
      
      investorsWithPortfolios.push({
        // Basic investor info
        customerId: investor.customerId,
        userName: investor.userName,
        fullName: investor.fullName,
        hasAvatar: investor.hasAvatar,
        popularInvestor: investor.popularInvestor,
        gain: investor.gain,
        dailyGain: investor.dailyGain,
        riskScore: investor.riskScore,
        copiers: investor.copiers,
        trades: investor.trades,
        winRatio: investor.winRatio,
        country: investor.country,
        avatarUrl: investor.avatarUrl,
        
        // Portfolio data
        portfolio: {
          realizedCreditPct: portfolio.realizedCreditPct,
          unrealizedCreditPct: portfolio.unrealizedCreditPct,
          totalValue: portfolio.totalValue,
          profitLoss: portfolio.profitLoss,
          profitLossPercentage: portfolio.profitLossPercentage,
          positionsCount: portfolio.positions?.length || 0,
          socialTradesCount: portfolio.socialTrades?.length || 0,
          
          // Positions summary (to avoid huge file sizes)
          positions: portfolio.positions?.map(pos => ({
            positionId: pos.positionId,
            instrumentId: pos.instrumentId,
            instrumentName: pos.instrumentName,
            isBuy: pos.isBuy,
            leverage: pos.leverage,
            investmentPct: pos.investmentPct,
            netProfit: pos.netProfit,
            currentValue: pos.currentValue,
            currentRate: pos.currentRate,
            openRate: pos.openRate,
            openTimestamp: pos.openTimestamp
          })) || [],
          
          // Social trades summary
          socialTrades: portfolio.socialTrades?.map(trade => ({
            socialTradeId: trade.socialTradeId,
            parentUsername: trade.parentUsername,
            investmentPct: trade.investmentPct,
            netProfit: trade.netProfit,
            realizedPct: trade.realizedPct,
            unrealizedPct: trade.unrealizedPct,
            openTimestamp: trade.openTimestamp
          })) || []
        }
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`Error fetching portfolio for ${investor.userName}:`, error);
      // Still include the investor even if portfolio fetch fails
      investorsWithPortfolios.push({
        ...investor,
        portfolio: null,
        portfolioError: error instanceof Error ? error.message : 'Failed to fetch portfolio'
      });
    }
  }
  
  // Extract instrument details from all analyses and portfolios
  const allInstruments = new Map<number, InstrumentData>();
  
  // First, collect from analyses
  analyses.forEach(({ analysis }) => {
    analysis.topHoldings?.forEach(holding => {
      if (!allInstruments.has(holding.instrumentId)) {
        allInstruments.set(holding.instrumentId, {
          instrumentId: holding.instrumentId,
          instrumentName: holding.instrumentName,
          symbol: holding.symbol,
          imageUrl: holding.imageUrl,
          returns: holding.yesterdayReturn !== undefined ? {
            yesterday: holding.yesterdayReturn,
            weekTD: holding.weekTDReturn || 0,
            monthTD: holding.monthTDReturn || 0
          } : undefined
        });
      }
    });
  });
  
  // Also collect from all portfolios to ensure we have all instruments
  investorsWithPortfolios.forEach(investor => {
    if (investor.portfolio?.positions) {
      investor.portfolio.positions.forEach(position => {
        if (position.instrumentId && !allInstruments.has(position.instrumentId)) {
          allInstruments.set(position.instrumentId, {
            instrumentId: position.instrumentId,
            instrumentName: position.instrumentName || `Instrument ${position.instrumentId}`,
            symbol: `ID-${position.instrumentId}`,
            imageUrl: undefined
          });
        }
      });
    }
  });
  
  // Fetch closing prices for all instruments
  console.log(`Fetching closing prices for ${allInstruments.size} instruments...`);
  const instrumentIds = Array.from(allInstruments.keys());
  const priceDataMap = await getInstrumentPriceData(instrumentIds);
  
  // Update instruments with price and return data
  allInstruments.forEach((instrument, id) => {
    const priceData = priceDataMap.get(id);
    if (priceData) {
      instrument.currentPrice = priceData.currentPrice;
      instrument.closingPrices = priceData.closingPrices;
      instrument.returns = priceData.returns;
    }
  });
  
  return {
    metadata: {
      generatedAt: date.toISOString(),
      generatedAtUTC: formatDateTime(date),
      totalInvestors: investors.length,
      analysisGroups: analyses.map(a => ({ count: a.count })),
      dataSource: 'eToro API',
      period: 'CurrYear'
    },
    
    // All investor data with portfolios
    investors: investorsWithPortfolios,
    
    // Instrument reference data
    instruments: Array.from(allInstruments.values()),
    
    // Analysis results for each band
    analyses: analyses.map(({ count, analysis }) => ({
      investorCount: count,
      fearGreedIndex: analysis.fearGreedIndex,
      averages: {
        gain: analysis.averageGain,
        cashPercentage: analysis.averageCashPercentage,
        riskScore: analysis.averageRiskScore,
        copiers: analysis.averageTrades,
        uniqueInstruments: analysis.averageUniqueInstruments
      },
      distributions: {
        returns: analysis.returnsDistribution,
        riskScore: analysis.riskScoreDistribution,
        uniqueInstruments: analysis.uniqueInstrumentsDistribution,
        cashPercentage: analysis.cashPercentageDistribution
      },
      topHoldings: analysis.topHoldings,
      topPerformers: analysis.topPerformers
    }))
  };
}