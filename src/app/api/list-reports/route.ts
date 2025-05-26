import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    
    // Check if directory exists
    try {
      await fs.access(reportsDir);
    } catch {
      // Directory doesn't exist, return empty array
      return NextResponse.json({ reports: [] });
    }
    
    // Read all files in the reports directory
    const files = await fs.readdir(reportsDir);
    
    // Filter for HTML files and get their stats
    const reports = await Promise.all(
      files
        .filter(file => file.endsWith('.html') && file !== 'index.html')
        .map(async (file) => {
          const filePath = path.join(reportsDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            url: `/reports/${file}`,
            createdAt: stats.birthtime,
            size: stats.size
          };
        })
    );
    
    // Sort by creation date (newest first)
    reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: 'Failed to list reports' },
      { status: 500 }
    );
  }
}