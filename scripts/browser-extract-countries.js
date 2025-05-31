// Script to run in browser console on eToro people search page
// This will extract country information from all visible investors

async function extractCountryData() {
  const countryMap = new Map();
  const userCountryData = [];
  
  // Function to extract data from current page
  function extractFromPage() {
    const rows = document.querySelectorAll('[data-automation-id*="trader-row"], .user-row, [class*="user-item"]');
    console.log(`Found ${rows.length} investor rows on current page`);
    
    rows.forEach(row => {
      try {
        // Try different selectors for username
        const usernameEl = row.querySelector('.user-name, .username, [class*="user-name"], a[href*="/people/"]');
        const username = usernameEl?.textContent?.trim() || 
                        usernameEl?.getAttribute('href')?.split('/').pop() || 
                        'Unknown';
        
        // Try different selectors for country
        const countryEl = row.querySelector('.user-location, .location, [class*="location"], [class*="country"]');
        const countryText = countryEl?.textContent?.trim() || '';
        
        // Look for flag image
        const flagImg = row.querySelector('img[src*="flag"], img[alt*="flag"], [class*="flag"] img');
        const flagSrc = flagImg?.src || '';
        
        if (username && countryText) {
          userCountryData.push({
            username,
            country: countryText,
            flagUrl: flagSrc
          });
          
          // Track unique countries
          if (!countryMap.has(countryText)) {
            countryMap.set(countryText, {
              count: 0,
              users: [],
              flagUrl: flagSrc
            });
          }
          
          const countryData = countryMap.get(countryText);
          countryData.count++;
          if (countryData.users.length < 5) { // Keep up to 5 example users
            countryData.users.push(username);
          }
        }
      } catch (e) {
        console.error('Error processing row:', e);
      }
    });
  }
  
  // Extract from current page
  extractFromPage();
  
  // Try to load more results if possible
  const loadMoreButton = document.querySelector('button[class*="load-more"], button:contains("Load More"), [class*="pagination"] button:last-child');
  if (loadMoreButton && !loadMoreButton.disabled) {
    console.log('Found load more button, clicking...');
    loadMoreButton.click();
    
    // Wait for new content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract again
    extractFromPage();
  }
  
  // Display results
  console.log('\n=== Country Summary ===');
  console.log(`Total investors processed: ${userCountryData.length}`);
  console.log(`Unique countries found: ${countryMap.size}\n`);
  
  // Sort countries by frequency
  const sortedCountries = Array.from(countryMap.entries())
    .sort((a, b) => b[1].count - a[1].count);
  
  console.log('Country Distribution:');
  sortedCountries.forEach(([country, data]) => {
    console.log(`${country}: ${data.count} investors`);
    console.log(`  Example users: ${data.users.join(', ')}`);
    if (data.flagUrl) {
      console.log(`  Flag URL: ${data.flagUrl}`);
    }
    console.log('');
  });
  
  // Create CSV data for easy copying
  console.log('\n=== CSV Format (copy this) ===');
  console.log('Username,Country');
  userCountryData.forEach(data => {
    console.log(`${data.username},${data.country}`);
  });
  
  return {
    summary: countryMap,
    details: userCountryData
  };
}

// Run the extraction
console.log('Starting country data extraction...');
extractCountryData().then(result => {
  console.log('\n=== Extraction Complete ===');
  console.log('Data saved to window.countryData');
  window.countryData = result;
});

// Instructions
console.log('\nTo extract more data:');
console.log('1. Scroll down to load more investors');
console.log('2. Run extractCountryData() again');
console.log('3. Access results in window.countryData');