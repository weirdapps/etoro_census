import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PeriodType } from '@/lib/models/user';
import { dataCollectionService } from '@/lib/services/data-collection-service';
import { analysisService, analysisServiceV2 } from '@/lib/services/analysis-service';

// Input validation schema
const CensusStreamInputSchema = z.object({
  limit: z.number().int().min(1).max(2000).default(100),
  period: z.enum(['CurrYear', 'CurrMonth', 'CurrWeek']).default('CurrYear'),
  useV2: z.boolean().default(false)
});

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

      const sendComplete = (analysis: object, investorCount: number, rawData?: object) => {
        const data = JSON.stringify({
          type: 'complete',
          analysis,
          investorCount,
          rawData
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Parse and validate input
        const rawInput = await request.json();
        const parseResult = CensusStreamInputSchema.safeParse(rawInput);

        if (!parseResult.success) {
          const errorMessages = parseResult.error.issues.map(e => `${String(e.path.join('.'))}: ${e.message}`).join(', ');
          sendError(`Invalid input: ${errorMessages}`);
          controller.close();
          return;
        }

        const { limit, period, useV2 } = parseResult.data;

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

        // Use V2 analysis service (S-curve Fear & Greed) if requested
        const analysis = useV2
          ? await analysisServiceV2.analyzeInvestorSubset(
              collectedData,
              Math.min(limit, collectedData.investors.length),
              (progress, message) => {
                const scaledProgress = 70 + (progress * 30 / 100); // 70-100% range
                sendProgress(Math.round(scaledProgress), message);
              }
            )
          : await analysisService.analyzeInvestorSubset(
              collectedData,
              Math.min(limit, collectedData.investors.length),
              (progress, message) => {
                const scaledProgress = 70 + (progress * 30 / 100); // 70-100% range
                sendProgress(Math.round(scaledProgress), message);
              }
            );

        // Send the complete analysis with raw data for V2
        // Convert Maps to objects for JSON serialization
        let serializedData;
        if (useV2 && collectedData) {
          serializedData = {
            ...collectedData,
            instruments: {
              details: collectedData.instruments.details instanceof Map
                ? Object.fromEntries(collectedData.instruments.details)
                : collectedData.instruments.details,
              priceData: collectedData.instruments.priceData instanceof Map
                ? Object.fromEntries(collectedData.instruments.priceData)
                : collectedData.instruments.priceData
            },
            userDetails: collectedData.userDetails instanceof Map
              ? Object.fromEntries(collectedData.userDetails)
              : collectedData.userDetails
          };
        }
        sendComplete(analysis, collectedData.investors.length, serializedData);
        
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