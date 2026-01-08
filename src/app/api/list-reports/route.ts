import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    const files = await fs.readdir(reportsDir);

    // Filter for HTML files that match the report naming pattern
    const reports = files
      .filter(file => file.match(/^etoro-census-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.html$/))
      .sort()
      .reverse(); // Most recent first

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error listing reports:', error);
    return NextResponse.json({ reports: [] });
  }
}
