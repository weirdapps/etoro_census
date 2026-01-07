import { NextRequest, NextResponse } from 'next/server';
import { PeriodType } from '@/lib/models/user';
import { dataCollectionService } from '@/lib/services/data-collection-service';
import { analysisService } from '@/lib/services/analysis-service';
import { generateReportHTML } from '@/lib/report-generator';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

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

        // Adjust bands based on actual data collected
        let investorBands = [100, 500, 1000, 1500, 2000];
        if (collectedData.investors.length < maxInvestors) {
          sendProgress(61, `Note: eToro API returned only ${collectedData.investors.length} investors (max available)`);
          investorBands = investorBands.filter(count => count <= collectedData.investors.length);

          // Add the actual count as the highest band if it's significant
          if (collectedData.investors.length > 1000 && !investorBands.includes(collectedData.investors.length)) {
            investorBands.push(collectedData.investors.length);
            investorBands.sort((a, b) => a - b);
          }
        } else {
          investorBands = investorBands.filter(count => count <= collectedData.investors.length);
        }

        sendProgress(62, `Will generate ${investorBands.length} analysis bands: ${investorBands.join(', ')}`);

        const analyses = await analysisService.generateMultipleBandAnalyses(
          collectedData,
          investorBands,
          (progress, message) => {
            const scaledProgress = 62 + (progress * 18 / 100); // 62-80% range
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
            portfolioError: investor.portfolioError,

            // Trade info data
            tradeInfo: investor.tradeInfo || null,
            tradeInfoError: investor.tradeInfoError
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

          userDetails: Array.from(collectedData.userDetails.entries()).map(([, details]) => ({
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
              winRatio: analysis.averageWinRatio,
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
        const jsonString = JSON.stringify(jsonData, null, 2);
        await fs.writeFile(jsonFilePath, jsonString, 'utf-8');

        // Also save gzipped version for efficient storage/transfer
        const gzippedData = await gzip(Buffer.from(jsonString));
        const gzipFilePath = path.join(dataDir, `${jsonFileName}.gz`);
        await fs.writeFile(gzipFilePath, gzippedData);

        const originalSize = (jsonString.length / 1024 / 1024).toFixed(2);
        const gzipSize = (gzippedData.length / 1024 / 1024).toFixed(2);
        console.log(`Comprehensive data saved: ${jsonFilePath} (${originalSize} MB, gzip: ${gzipSize} MB)`);

        sendProgress(90, 'Generating HTML report...');

        // Debug: Log the analyses data being passed to HTML generator
        analyses.forEach((item, index) => {
          console.log(`Analysis ${index}: count=${item.count}, holdings=${item.analysis.topHoldings?.length || 0}, performers=${item.analysis.topPerformers?.length || 0}`);
        });

        // Generate the HTML report using original analyses data
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
