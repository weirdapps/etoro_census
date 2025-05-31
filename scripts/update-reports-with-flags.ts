import * as fs from 'fs';
import * as path from 'path';

// Country mappings we've confirmed
const COUNTRY_FLAGS: Record<string, string> = {
  'United Kingdom': '🇬🇧',
  'Greece': '🇬🇷',
  'United Arab Emirates': '🇦🇪',
  'Denmark': '🇩🇰',
  'Australia': '🇦🇺'
};

// Function to update HTML content with country flags
function updateHTMLWithFlags(html: string): string {
  let updatedHtml = html;
  
  // Find all instances of username display in the Most Copied Investors table
  // Pattern: <div class="name-secondary" title="@username">@username</div>
  const usernamePattern = /<div class="name-secondary"[^>]*>(@[^<]+)<\/div>/g;
  
  // For each known country, search for patterns where the country appears near a username
  Object.entries(COUNTRY_FLAGS).forEach(([country, flag]) => {
    // Look for patterns like "Username • Country" or "Username, Country" in the HTML
    const countryPattern = new RegExp(`([^<>]+)\\s*[•,]\\s*${country}`, 'g');
    
    updatedHtml = updatedHtml.replace(countryPattern, (match, username) => {
      return `${username} • ${country} ${flag}`;
    });
  });
  
  // Also update any instances where we can match username to country in the secondary line
  // This is a more targeted approach for the specific HTML structure
  updatedHtml = updatedHtml.replace(
    /(<div class="name-secondary"[^>]*>)(@[^<]+)(<\/div>)/g,
    (match, prefix, username, suffix) => {
      // Check if we can determine the country for this user
      // For now, we'll just add flags to known patterns
      
      // Special cases for users we know
      const knownUsers: Record<string, string> = {
        '@JeppeKirkBonde': '🇦🇪',
        '@thomaspj': '🇬🇧',
        '@CPHequities': '🇩🇰',
        '@triangulacapital': '🇦🇪',
        '@jaynemesis': '🇬🇧',
        '@FundManagerZech': '🇦🇺',
        '@AmitKup': '🇬🇧',
        '@rubymza': '🇬🇧',
        '@plessas': '🇬🇷'
      };
      
      const flag = knownUsers[username];
      if (flag) {
        return `${prefix}${username} ${flag}${suffix}`;
      }
      
      return match;
    }
  );
  
  return updatedHtml;
}

// Function to process a single report file
async function processReport(filePath: string): Promise<void> {
  try {
    console.log(`Processing: ${path.basename(filePath)}`);
    
    // Read the file
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    // Update with flags
    const updatedContent = updateHTMLWithFlags(content);
    
    // Check if any changes were made
    if (content !== updatedContent) {
      // Write back the updated content
      await fs.promises.writeFile(filePath, updatedContent, 'utf-8');
      console.log(`  ✓ Updated with country flags`);
    } else {
      console.log(`  - No changes needed`);
    }
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error);
  }
}

// Main function
async function main() {
  const reportsDir = path.join(process.cwd(), 'public', 'reports');
  
  try {
    // Get all HTML files in the reports directory
    const files = await fs.promises.readdir(reportsDir);
    const htmlFiles = files
      .filter(file => file.endsWith('.html') && file.startsWith('etoro-census-'))
      .map(file => path.join(reportsDir, file));
    
    console.log(`Found ${htmlFiles.length} report files to update\n`);
    
    // Process each file
    for (const file of htmlFiles) {
      await processReport(file);
    }
    
    console.log('\nUpdate complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the update
main().catch(console.error);