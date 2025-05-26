import { NextRequest } from 'next/server';
import { getPopularInvestors } from '@/lib/services/user-service';
import { performCensusAnalysis, ProgressCallback } from '@/lib/services/census-service';
import { PeriodType } from '@/lib/models/user';

export async function POST(request: NextRequest) {
  console.log('Census stream API called');
  
  const body = await request.json();
  const { limit = 25, period = 'CurrMonth' } = body;
  
  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`Fetching ${limit} investors for period ${period}`);
        
        // Send initial progress
        controller.enqueue(`data: ${JSON.stringify({
          type: 'progress',
          progress: 0,
          message: 'Fetching popular investors...'
        })}\n\n`);
        
        const investors = await getPopularInvestors(period as PeriodType, limit);
        console.log(`Found ${investors.length} investors`);
        
        if (investors.length === 0) {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'error',
            error: 'No investors found'
          })}\n\n`);
          controller.close();
          return;
        }

        // Create progress callback
        const onProgress: ProgressCallback = (progress: number, message: string) => {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'progress',
            progress,
            message
          })}\n\n`);
        };

        console.log('Starting census analysis...');
        const analysis = await performCensusAnalysis(investors, onProgress);
        console.log('Census analysis completed');

        // Send final result
        controller.enqueue(`data: ${JSON.stringify({
          type: 'complete',
          analysis,
          investorCount: investors.length
        })}\n\n`);
        
        controller.close();
      } catch (error) {
        console.error('Error performing census analysis:', error);
        controller.enqueue(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to perform census analysis'
        })}\n\n`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}