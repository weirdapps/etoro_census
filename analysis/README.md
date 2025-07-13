# eToro Census Analysis Tools

This directory contains various analysis tools for processing eToro Popular Investor data.

## Directory Structure

```
analysis/
├── README.md                          # This file
├── generate-daily-post.js            # Daily report generator
├── generate-monthly-post.js          # Monthly report generator  
├── generate-weekly-post.js           # Weekly report generator
└── follower-distribution/            # Follower analysis tools
    ├── README.md                      # Follower analysis documentation
    ├── generate-follower-chart.js    # Interactive chart generator
    └── extract-top-investors.js      # Top investor data extraction
```

## Analysis Types

### 1. Daily Reports
**Location:** `generate-daily-post.js`
**Purpose:** Generates daily census summaries
**Usage:** `node analysis/generate-daily-post.js`

### 2. Weekly Reports
**Location:** `generate-weekly-post.js`
**Purpose:** Generates weekly trend analysis
**Usage:** `node analysis/generate-weekly-post.js`

### 3. Monthly Reports
**Location:** `generate-monthly-post.js`
**Purpose:** Generates monthly performance summaries
**Usage:** `node analysis/generate-monthly-post.js`

### 4. Follower Distribution Analysis
**Location:** `follower-distribution/`
**Purpose:** Analyzes follower distribution across Popular Investors
**Usage:** 
```bash
cd follower-distribution/
node generate-follower-chart.js      # Creates interactive chart
node extract-top-investors.js [N]    # Extracts top N investors (default: 10)
```

## Data Requirements

All analysis tools require:
- eToro census data in `public/data/`
- JSON files in format: `etoro-data-YYYY-MM-DD-HH-MM.json`
- Minimum 30 days of data for meaningful analysis

## Output Locations

- **Analysis Results:** `public/analysis-results/`
- **Posts:** Various formats depending on analysis type

## Periodic Updates

### Recommended Schedule
1. **Daily:** Run daily post generator after census collection
2. **Weekly:** Run weekly analysis on Sundays
3. **Monthly:** Run monthly summary on 1st of month

### Manual Process
1. Ensure latest census data is available
2. Run appropriate analysis script
3. Review output for accuracy
4. Post to eToro if applicable

## Development

To add new analysis types:
1. Create new script in `analysis/` directory
2. Follow existing naming conventions
3. Document in this README
4. Add to main project documentation