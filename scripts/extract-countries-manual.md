# Manual Country Extraction Guide

Since the browser MCP tools aren't connecting properly, here's how to manually extract country data from eToro:

## Option 1: Export from Browser Console

1. Go to the eToro people search page (where you see the flags)
2. Open browser console (F12 → Console)
3. Run this script:

```javascript
// Extract all visible country data
const results = [];
const rows = document.querySelectorAll('[automation-id*="search-result-item"], .people-row, tr[class*="user"]');

rows.forEach(row => {
  const username = row.querySelector('a[href*="/people/"]')?.textContent?.trim() || 
                   row.querySelector('.username')?.textContent?.trim() || '';
  const country = row.querySelector('.location, [class*="location"]')?.textContent?.trim() || '';
  
  if (username && country) {
    results.push(`${username},${country}`);
  }
});

// Copy to clipboard
const csv = 'Username,Country\n' + results.join('\n');
copy(csv);
console.log('Copied to clipboard! Paste into a text file.');
console.log(`Found ${results.length} users with countries`);
```

## Option 2: Convert your countries.docx

If you have country data in the countries.docx file:
1. Open it in Word/Google Docs
2. Save as CSV or plain text
3. Save it as: `/Users/plessas/SourceCode/etoro_census/data/countries.csv`

## Option 3: Manual List

Based on what we've confirmed so far:
- 82 = Greece 🇬🇷
- 218 = United Kingdom 🇬🇧
- 217 = United Arab Emirates 🇦🇪
- 57 = Denmark 🇩🇰
- 12 = Australia 🇦🇺 (not Austria!)

## What I need from you:

Please provide the country data in this format:
```
CountryID,CountryName
82,Greece
218,United Kingdom
217,United Arab Emirates
57,Denmark
12,Australia
...
```

Or username data like:
```
Username,Country
JeppeKirkBonde,United Arab Emirates
thomaspj,United Kingdom
CPHequities,Denmark
...
```

Then I can process it and create the complete mapping!