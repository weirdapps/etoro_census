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
      countryId?: string;
    }>;
  }>;
}

async function updateHTMLReport(htmlPath: string, jsonData: JSONExportData) {
  console.log(`Updating ${path.basename(htmlPath)}...`);
  
  let html = await fs.readFile(htmlPath, 'utf-8');
  
  // For each analysis/tab
  for (let tabIndex = 0; tabIndex < jsonData.analyses.length; tabIndex++) {
    const analysis = jsonData.analyses[tabIndex];
    
    // Update YTD returns in holdings table
    const holdingsRows = html.match(new RegExp(`<tr class="holdings-row-${tabIndex}[^>]*>.*?</tr>`, 'gs'));
    if (holdingsRows) {
      holdingsRows.forEach((row, idx) => {
        if (idx < analysis.topHoldings.length) {
          const holding = analysis.topHoldings[idx];
          
          // Find the YTD return cell (last td) and update it
          if (holding.ytdReturn !== undefined) {
            const color = holding.ytdReturn > 0 ? '#10b981' : holding.ytdReturn < 0 ? '#ef4444' : '#3b82f6';
            const sign = holding.ytdReturn > 0 ? '+' : '';
            const newCell = `<span style="color: ${color}">${sign}${holding.ytdReturn.toFixed(1)}%</span>`;
            
            // Replace the dash with actual return
            const updatedRow = row.replace(
              /<td class="text-right font-medium">\s*<span style="color: #6b7280">-<\/span>\s*<\/td>\s*<\/tr>/,
              `<td class="text-right font-medium">${newCell}</td></tr>`
            );
            
            html = html.replace(row, updatedRow);
          }
        }
      });
    }
    
    // Update country flags in performers table
    const performersRows = html.match(new RegExp(`<tr class="performers-row-${tabIndex}[^>]*>.*?</tr>`, 'gs'));
    if (performersRows) {
      performersRows.forEach((row, idx) => {
        if (idx < analysis.topPerformers.length) {
          const performer = analysis.topPerformers[idx];
          
          if (performer.countryId) {
            const flag = getCountryFlag(performer.countryId);
            
            // Update the @username line to include flag
            const updatedRow = row.replace(
              /@([^<]+)<\/div>/,
              `@$1 ${flag}</div>`
            );
            
            html = html.replace(row, updatedRow);
          }
        }
      });
    }
  }
  
  await fs.writeFile(htmlPath, html, 'utf-8');
  console.log(`✅ Updated ${path.basename(htmlPath)}`);
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