import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Path to the latest census data file
    const dataPath = path.join(process.cwd(), 'public', 'data', 'census-data-latest.json');

    // Check if file exists
    try {
      await fs.access(dataPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Latest census data not available. Please generate a new census report.'
        },
        { status: 404 }
      );
    }

    // Read and parse the JSON data
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const censusData = JSON.parse(fileContent);

    // Extract the analyses array (which contains different band analyses)
    const analyses = censusData.analyses || [];

    // Find the analysis with the highest investor count (typically 1500, 1000, 500, or 100)
    const latestAnalysis = analyses.reduce((max: unknown, current: unknown) => {
      const maxMetrics = (max as {metrics?: {investorCount?: number}})?.metrics;
      const currentMetrics = (current as {metrics?: {investorCount?: number}})?.metrics;
      return (currentMetrics?.investorCount || 0) > (maxMetrics?.investorCount || 0) ? current : max;
    }, analyses[0]);

    if (!latestAnalysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid analysis data found in census file.'
        },
        { status: 404 }
      );
    }

    // Return the analysis data in the same format as census-stream
    return NextResponse.json({
      success: true,
      analysis: latestAnalysis,
      investorCount: (latestAnalysis as {metrics?: {investorCount?: number}})?.metrics?.investorCount || 0,
      timestamp: censusData.metadata?.timestamp || new Date().toISOString(),
      dataSource: 'pre-generated',
      metadata: censusData.metadata
    });

  } catch (error) {
    logger.error('Error loading latest census data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load census data. Please try again or generate a new census.'
      },
      { status: 500 }
    );
  }
}
