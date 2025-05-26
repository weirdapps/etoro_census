import { NextRequest, NextResponse } from 'next/server';
import { getPopularInvestors } from '@/lib/services/user-service';
import { performCensusAnalysis } from '@/lib/services/census-service';
import { PeriodType } from '@/lib/models/user';

// Simple in-memory store for progress tracking
const progressStore = new Map<string, { progress: number; message: string; error?: string }>();

export async function POST(request: NextRequest) {
  const sessionId = Date.now().toString();
  
  try {
    const { limit, period } = await request.json();
    
    // Initialize progress
    progressStore.set(sessionId, { progress: 0, message: 'Initializing...' });
    
    // Step 1: Fetch investors (10%)
    progressStore.set(sessionId, { progress: 10, message: 'Fetching popular investors...' });
    const investors = await getPopularInvestors(period as PeriodType || 'CurrMonth', limit || 50);
    
    if (investors.length === 0) {
      progressStore.set(sessionId, { progress: 0, message: 'No investors found', error: 'No investors found' });
      return NextResponse.json(
        { success: false, error: 'No investors found', sessionId },
        { status: 404 }
      );
    }

    // Step 2: Analyze portfolios with progress tracking (10% to 80%)
    progressStore.set(sessionId, { progress: 20, message: `Analyzing ${investors.length} portfolios...` });
    
    // Step 3: Perform analysis (80% to 95%)
    progressStore.set(sessionId, { progress: 80, message: 'Performing census analysis...' });
    const analysis = await performCensusAnalysis(investors);

    // Step 4: Finalize (95% to 100%)
    progressStore.set(sessionId, { progress: 95, message: 'Finalizing results...' });
    
    // Final result
    progressStore.set(sessionId, { progress: 100, message: 'Analysis complete!' });
    
    // Clean up progress after 30 seconds
    setTimeout(() => {
      progressStore.delete(sessionId);
    }, 30000);

    return NextResponse.json({
      success: true,
      analysis,
      investorCount: investors.length,
      sessionId,
      requestedCount: limit,
      actualCount: investors.length,
      hasLimit: investors.length < limit
    });
    
  } catch (error) {
    console.error('Error performing census analysis:', error);
    progressStore.set(sessionId, { 
      progress: 0, 
      message: 'Analysis failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to perform census analysis', sessionId },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }
  
  const progress = progressStore.get(sessionId);
  
  if (!progress) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  
  return NextResponse.json(progress);
}