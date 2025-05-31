import fs from 'fs/promises';
import path from 'path';
import { getCountryFlag } from '../src/lib/utils/country-mapping';

interface JSONExportData {
  metadata: any;
  investors: any[];
  instruments: any[];
  analyses: Array<{
    investorCount: number;
    topHoldings: Array<{
      instrumentId: number;
      instrumentName: string;
      symbol: string;
      imageUrl?: string;
      ytdReturn?: number;
      holdersCount: number;
      holdersPercentage: number;
      averageAllocation: number;
    }>;
    topPerformers: Array<{
      username: string;
      fullName: string;
      avatarUrl?: string;
      gain: number;
      copiers: number;
      trades: number;
      winRatio: number;
      cashPercentage: number;
      riskScore: number;
      countryId?: number;
    }>;
  }>;
}

async function updateHTMLReport(htmlPath: string, jsonData: JSONExportData) {
  console.log(`Updating ${path.basename(htmlPath)}...`);
  
  let html = await fs.readFile(htmlPath, 'utf-8');
  
  // First, clean up any existing double flags (matches any flag emoji)
  html = html.replace(/(@[^<\s]+)\s+([\u{1F1E6}-\u{1F1FF}]{2})\s+\2/gu, '$1 $2');
  
  // For each analysis/tab
  for (let tabIndex = 0; tabIndex < jsonData.analyses.length; tabIndex++) {
    const analysis = jsonData.analyses[tabIndex];
    
    // Note: YTD returns are not available in the JSON data, so we can't update them
    // The data needs to be captured during the initial report generation
    
    // Update country flags in performers table (only if not already present)
    const performersRows = html.match(new RegExp(`<tr class="performers-row-${tabIndex}[^>]*>.*?</tr>`, 'gs'));
    if (performersRows) {
      performersRows.forEach((row, idx) => {
        if (idx < analysis.topPerformers.length) {
          const performer = analysis.topPerformers[idx];
          
          if (performer.countryId) {
            const flag = getCountryFlag(performer.countryId);
            
            // Debug logging for specific users
            if (['Andre031988', 'JavierPrada', 'Bader41'].includes(performer.username)) {
              console.log(`  - ${performer.username}: countryId=${performer.countryId}, flag=${flag}`);
            }
            
            // Replace any existing flag (including globe) with the correct one
            // Handle messy HTML with multiple flags/newlines
            const updatedRow = row.replace(
              /(@[^<\s]+)(?:\s+(?:[\u{1F1E6}-\u{1F1FF}]{2}|🌍))*(?:\s*\n\s*(?:[\u{1F1E6}-\u{1F1FF}]{2}|🌍))*<\/div>/gu,
              `@${performer.username} ${flag}</div>`
            );
            
            if (updatedRow !== row) {
              html = html.replace(row, updatedRow);
            }
          }
        }
      });
    }
  }
  
  await fs.writeFile(htmlPath, html, 'utf-8');
  console.log(`✅ Updated ${path.basename(htmlPath)} (Note: YTD returns not available in JSON data)`);
}

async function main() {
  const reportsDir = path.join(process.cwd(), 'public', 'reports');
  const dataDir = path.join(process.cwd(), 'public', 'data');
  
  // Get all HTML reports (excluding index.html)
  const htmlFiles = (await fs.readdir(reportsDir))
    .filter(f => f.startsWith('etoro-census-') && f.endsWith('.html'))
    .sort();
  
  console.log(`Found ${htmlFiles.length} reports to update\n`);
  
  for (const htmlFile of htmlFiles) {
    // Extract timestamp from filename
    const match = htmlFile.match(/etoro-census-(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})\.html/);
    if (!match) continue;
    
    const [_, date, hour, minute] = match;
    
    // Find corresponding JSON file (may have slightly different timestamp)
    const jsonFiles = await fs.readdir(dataDir);
    const possibleJsons = jsonFiles.filter(f => 
      f.startsWith(`etoro-data-${date}`) && f.endsWith('.json')
    ).sort();
    
    if (possibleJsons.length === 0) {
      console.log(`⚠️  No JSON data found for ${htmlFile}, skipping...`);
      continue;
    }
    
    // Use the closest JSON file by timestamp
    const jsonFile = possibleJsons.find(f => {
      const jsonMatch = f.match(/etoro-data-\d{4}-\d{2}-\d{2}-(\d{2})-(\d{2})\.json/);
      if (jsonMatch) {
        const [_, jHour, jMinute] = jsonMatch;
        // Allow for some time difference (reports might be generated a few minutes apart)
        const timeDiff = Math.abs(
          parseInt(hour) * 60 + parseInt(minute) - 
          (parseInt(jHour) * 60 + parseInt(jMinute))
        );
        return timeDiff <= 30; // Within 30 minutes
      }
      return false;
    }) || possibleJsons[0]; // Fallback to first match
    
    console.log(`\nProcessing: ${htmlFile}`);
    console.log(`Using JSON: ${jsonFile}`);
    
    try {
      const jsonPath = path.join(dataDir, jsonFile);
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent) as JSONExportData;
      
      const htmlPath = path.join(reportsDir, htmlFile);
      await updateHTMLReport(htmlPath, jsonData);
      
    } catch (error) {
      console.error(`❌ Error updating ${htmlFile}:`, error);
    }
  }
  
  // Also update index.html if it exists
  const indexPath = path.join(reportsDir, 'index.html');
  try {
    await fs.access(indexPath);
    console.log('\nUpdating index.html...');
    
    // Find the latest JSON file
    const jsonFiles = await fs.readdir(dataDir);
    const latestJson = jsonFiles
      .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
      .sort()
      .pop();
    
    if (latestJson) {
      const jsonPath = path.join(dataDir, latestJson);
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent) as JSONExportData;
      
      await updateHTMLReport(indexPath, jsonData);
    }
  } catch (error) {
    console.log('No index.html found');
  }
  
  console.log('\n✅ All reports updated!');
}

// Run the script
main().catch(console.error);