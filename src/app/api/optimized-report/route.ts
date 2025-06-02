import { NextRequest, NextResponse } from 'next/server';
import { PeriodType } from '@/lib/models/user';
import { dataCollectionService, ComprehensiveDataCollection } from '@/lib/services/data-collection-service';
import { analysisService } from '@/lib/services/analysis-service';
import { truncateText } from '@/lib/utils';
import { getCountryFlag } from '@/lib/utils/country-mapping';
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

      const sendComplete = (reportUrl: string, dataUrl: string) => {
        const data = JSON.stringify({ type: 'complete', reportUrl, dataUrl });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const { period = 'CurrYear', maxInvestors = 1500 } = await request.json();
        
        sendProgress(0, 'Starting optimized report generation...');
        
        // Phase 1: Comprehensive data collection (0-60%)
        sendProgress(5, 'Phase 1: Collecting all data from eToro API...');
        const collectedData = await dataCollectionService.collectAllData(
          period as PeriodType,
          maxInvestors,
          (progress, message) => {
            const scaledProgress = 5 + (progress * 55 / 100); // 5-60% range
            sendProgress(Math.round(scaledProgress), `Data Collection: ${message}`);
          }
        );

        // Phase 2: Multi-band analysis (60-80%)
        sendProgress(60, 'Phase 2: Generating analyses for all investor bands...');
        const investorBands = [100, 500, 1000, 1500].filter(count => count <= collectedData.investors.length);
        const analyses = await analysisService.generateMultipleBandAnalyses(
          collectedData,
          investorBands,
          (progress, message) => {
            const scaledProgress = 60 + (progress * 20 / 100); // 60-80% range
            sendProgress(Math.round(scaledProgress), `Analysis: ${message}`);
          }
        );

        // Phase 3: Report generation (80-95%)
        sendProgress(80, 'Phase 3: Generating HTML report and saving data...');
        
        // Create directories
        const reportsDir = path.join(process.cwd(), 'public', 'reports');
        const dataDir = path.join(process.cwd(), 'public', 'data');
        await fs.mkdir(reportsDir, { recursive: true });
        await fs.mkdir(dataDir, { recursive: true });

        // Generate timestamp for filename
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timestamp = `${dateStr}-${date.getUTCHours().toString().padStart(2, '0')}-${date.getUTCMinutes().toString().padStart(2, '0')}`;
        const htmlFileName = `etoro-census-${timestamp}.html`;
        const jsonFileName = `etoro-data-${timestamp}.json`;

        sendProgress(85, 'Saving comprehensive data to JSON...');
        
        // Save the comprehensive collected data
        const jsonData = {
          metadata: collectedData.metadata,
          investors: collectedData.investors.map(investor => ({
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
            portfolio: investor.portfolio ? {
              realizedCreditPct: investor.portfolio.realizedCreditPct,
              unrealizedCreditPct: investor.portfolio.unrealizedCreditPct,
              totalValue: investor.portfolio.totalValue,
              profitLoss: investor.portfolio.profitLoss,
              profitLossPercentage: investor.portfolio.profitLossPercentage,
              positionsCount: investor.portfolio.positions?.length || 0,
              socialTradesCount: investor.portfolio.socialTrades?.length || 0,
              positions: investor.portfolio.positions?.map(pos => ({
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
              socialTrades: investor.portfolio.socialTrades?.map(trade => ({
                socialTradeId: trade.socialTradeId,
                parentUsername: trade.parentUsername,
                investmentPct: trade.investmentPct,
                netProfit: trade.netProfit,
                realizedPct: trade.realizedPct,
                unrealizedPct: trade.unrealizedPct,
                openTimestamp: trade.openTimestamp
              })) || []
            } : null,
            portfolioError: investor.portfolioError
          })),
          
          // Convert Maps to arrays for JSON serialization
          instruments: {
            details: Array.from(collectedData.instruments.details.entries()).map(([id, details]) => ({
              instrumentId: id,
              ...details
            })),
            priceData: Array.from(collectedData.instruments.priceData.entries()).map(([id, priceData]) => ({
              instrumentId: id,
              ...priceData
            }))
          },
          
          userDetails: Array.from(collectedData.userDetails.entries()).map(([username, details]) => ({
            username,
            ...details
          })),
          
          // Analysis results for each band
          analyses: analyses.map(({ count, analysis }) => ({
            investorCount: count,
            fearGreedIndex: analysis.fearGreedIndex,
            averages: {
              gain: analysis.averageGain,
              cashPercentage: analysis.averageCashPercentage,
              riskScore: analysis.averageRiskScore,
              trades: analysis.averageTrades,
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

        const jsonFilePath = path.join(dataDir, jsonFileName);
        await fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
        
        console.log(`Comprehensive data saved to: ${jsonFilePath} (${(JSON.stringify(jsonData).length / 1024 / 1024).toFixed(2)} MB)`);

        sendProgress(90, 'Generating HTML report...');
        
        // Generate the HTML report
        const html = generateReportHTML(analyses, collectedData.metadata.collectedAtUTC);
        const htmlFilePath = path.join(reportsDir, htmlFileName);
        await fs.writeFile(htmlFilePath, html, 'utf-8');

        sendProgress(95, 'Finalizing optimized report...');

        // Return URLs
        const reportUrl = `/reports/${htmlFileName}`;
        const dataUrl = `/data/${jsonFileName}`;

        sendProgress(100, 'Optimized report generated successfully!');
        sendComplete(reportUrl, dataUrl);
        
      } catch (error) {
        console.error('Optimized report generation error:', error);
        sendError(error instanceof Error ? error.message : 'Failed to generate optimized report');
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

function generateReportHTML(analyses: { count: number; analysis: any }[], generatedAt: string): string {
  // Helper functions for distribution charts (same as original)
  const getReturnsColorClass = (range: string) => {
    if (range === 'Negative') return '#ef4444';
    if (range === '0-5%') return '#fb923c';
    if (range === '> 5-10%') return '#facc15';
    if (range === '> 10-25%') return '#a3e635';
    if (range === '> 25-50%') return '#22c55e';
    return '#10b981';
  };

  const getReturnsBadgeColor = (range: string) => {
    if (range === 'Negative') return 'background-color: #fee2e2; color: #dc2626;';
    if (range === '0-5%') return 'background-color: #fed7aa; color: #ea580c;';
    if (range === '> 5-10%') return 'background-color: #fef3c7; color: #ca8a04;';
    if (range === '> 10-25%') return 'background-color: #ecfccb; color: #65a30d;';
    if (range === '> 25-50%') return 'background-color: #dcfce7; color: #16a34a;';
    return 'background-color: #d1fae5; color: #059669;';
  };

  const getRiskColorClass = (range: string) => {
    if (range.includes('Conservative')) return '#22c55e';
    if (range.includes('Moderate')) return '#3b82f6';
    if (range.includes('Aggressive')) return '#f97316';
    return '#ef4444';
  };

  const getRiskBadgeColor = (range: string) => {
    if (range.includes('Conservative')) return 'background-color: #dcfce7; color: #16a34a;';
    if (range.includes('Moderate')) return 'background-color: #dbeafe; color: #2563eb;';
    if (range.includes('Aggressive')) return 'background-color: #fed7aa; color: #ea580c;';
    return 'background-color: #fee2e2; color: #dc2626;';
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
        
        .optimization-note {
            background: linear-gradient(135deg, #00C896, #00B085);
            color: white;
            padding: 16px;
            margin: 0 24px 32px 24px;
            border-radius: 8px;
            text-align: center;
            font-weight: 500;
        }
        
        .container {
            max-width: 1120px;
            margin: 0 auto;
            padding: 0 24px;
        }
        
        /* Continue with the same CSS as original report but add optimization styles */
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

        /* Add all the existing CSS styles here - keeping it concise for this example */
        .grid { display: grid; gap: 24px; margin-bottom: 32px; }
        .grid-cols-4 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
        .card { background: transparent; border-radius: 8px; border: 1px solid #e5e7eb; padding: 24px; }
        .metric-value { font-size: 2.5rem; font-weight: 700; color: #111827; text-align: center; margin: 16px 0 8px 0; }
        .badge { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .badge-positive { background-color: rgba(34, 197, 94, 0.1); color: #16a34a; }
        .badge-negative { background-color: rgba(239, 68, 68, 0.1); color: #dc2626; }
        .badge-neutral { background-color: rgba(59, 130, 246, 0.1); color: #2563eb; }
        .footer { background-color: transparent; margin-top: 64px; padding: 32px 0; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>eToro Popular Investors Census</h1>
            <p class="creator">created by <a href="https://www.etoro.com/people/plessas" target="_blank" rel="noopener noreferrer">@plessas</a> at ${generatedAt}</p>
        </div>
    </div>

    <div class="optimization-note">
        🚀 <strong>Optimized Architecture:</strong> This report was generated using our new optimized data collection system - single API fetch for all data, then multiple analysis generations. No more rate limiting issues!
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
                <!-- Key Metrics Grid -->
                <div class="grid grid-cols-4">
                    <div class="card">
                        <div class="metric-value">${(item.analysis.averageGain || 0).toFixed(1)}%</div>
                        <div style="text-align: center; color: #6b7280;">Average Returns</div>
                    </div>
                    <div class="card">
                        <div class="metric-value">${(item.analysis.averageCashPercentage || 0).toFixed(1)}%</div>
                        <div style="text-align: center; color: #6b7280;">Average Cash</div>
                    </div>
                    <div class="card">
                        <div class="metric-value">${(item.analysis.averageRiskScore || 0).toFixed(1)}</div>
                        <div style="text-align: center; color: #6b7280;">Average Risk Score</div>
                    </div>
                    <div class="card">
                        <div class="metric-value">${(item.analysis.averageTrades || 0).toLocaleString()}</div>
                        <div style="text-align: center; color: #6b7280;">Average Trades</div>
                    </div>
                </div>

                <!-- Sample Holdings Table -->
                <div class="card">
                    <h3 style="margin-bottom: 16px;">Most Popular Holdings (Top 10)</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <th style="padding: 8px; text-align: left; font-size: 0.75rem; color: #6b7280;">Asset</th>
                                <th style="padding: 8px; text-align: right; font-size: 0.75rem; color: #6b7280;">Holders</th>
                                <th style="padding: 8px; text-align: right; font-size: 0.75rem; color: #6b7280;">Yesterday</th>
                                <th style="padding: 8px; text-align: right; font-size: 0.75rem; color: #6b7280;">Week TD</th>
                                <th style="padding: 8px; text-align: right; font-size: 0.75rem; color: #6b7280;">Month TD</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(item.analysis.topHoldings || []).slice(0, 10).map(holding => `
                                <tr style="border-bottom: 1px solid #f3f4f6;">
                                    <td style="padding: 8px;">
                                        <div style="font-weight: 500;">${truncateText(holding.instrumentName || 'Unknown', 24)}</div>
                                        <div style="font-size: 0.75rem; color: #6b7280;">${holding.symbol || ''}</div>
                                    </td>
                                    <td style="padding: 8px; text-align: right;">${holding.holdersCount || 0}</td>
                                    <td style="padding: 8px; text-align: right;">
                                        ${holding.yesterdayReturn !== undefined ? `
                                            <span class="badge ${holding.yesterdayReturn > 0 ? 'badge-positive' : holding.yesterdayReturn < 0 ? 'badge-negative' : 'badge-neutral'}">
                                                ${holding.yesterdayReturn > 0 ? '+' : ''}${holding.yesterdayReturn.toFixed(1)}%
                                            </span>
                                        ` : '<span class="badge badge-neutral">-</span>'}
                                    </td>
                                    <td style="padding: 8px; text-align: right;">
                                        ${holding.weekTDReturn !== undefined ? `
                                            <span class="badge ${holding.weekTDReturn > 0 ? 'badge-positive' : holding.weekTDReturn < 0 ? 'badge-negative' : 'badge-neutral'}">
                                                ${holding.weekTDReturn > 0 ? '+' : ''}${holding.weekTDReturn.toFixed(1)}%
                                            </span>
                                        ` : '<span class="badge badge-neutral">-</span>'}
                                    </td>
                                    <td style="padding: 8px; text-align: right;">
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