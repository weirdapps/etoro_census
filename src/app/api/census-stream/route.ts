import { NextRequest, NextResponse } from 'next/server';
import { PeriodType } from '@/lib/models/user';
import { dataCollectionService } from '@/lib/services/data-collection-service';
import { analysisService } from '@/lib/services/analysis-service';

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

      const sendComplete = (analysis: any, investorCount: number) => {
        const data = JSON.stringify({ 
          type: 'complete', 
          analysis, 
          investorCount 
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const { limit = 100, period = 'CurrYear' } = await request.json();
        
        sendProgress(0, `Starting census analysis for ${limit} investors...`);
        
        // Phase 1: Comprehensive data collection (0-70%)
        sendProgress(5, 'Collecting data from eToro API...');
        const collectedData = await dataCollectionService.collectAllData(
          period as PeriodType,
          limit,
          (progress, message) => {
            const scaledProgress = 5 + (progress * 65 / 100); // 5-70% range
            sendProgress(Math.round(scaledProgress), message);
          }
        );

        // Phase 2: Analysis (70-100%)
        sendProgress(70, 'Analyzing collected data...');
        const analysis = await analysisService.analyzeInvestorSubset(
          collectedData,
          Math.min(limit, collectedData.investors.length),
          (progress, message) => {
            const scaledProgress = 70 + (progress * 30 / 100); // 70-100% range
            sendProgress(Math.round(scaledProgress), message);
          }
        );

        // Send the complete analysis
        sendComplete(analysis, collectedData.investors.length);
        
      } catch (error) {
        console.error('Census analysis error:', error);
        sendError(error instanceof Error ? error.message : 'An unexpected error occurred');
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