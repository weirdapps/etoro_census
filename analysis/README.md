# eToro Census Analysis Tools

This directory contains various analysis tools for processing eToro Popular Investor data.

## Directory Structure

```
analysis/
├── README.md                    # This file
├── generate-daily-post.js       # Daily report generator
├── generate-monthly-post.js     # Monthly report generator  
├── generate-weekly-post.js      # Weekly report generator
└── risk-return/                 # Risk-return analysis tools
    ├── README.md                # Risk-return documentation
    ├── run-analysis.js          # Main analysis runner
    ├── generate-etoro-post.js   # eToro post generator
    ├── risk-return-analysis.js  # Core analysis logic
    ├── get-chart-data.js        # Chart data extractor
    └── generate-risk-return-chart.js # MCP chart utility
```

## Analysis Types

### 1. Risk-Return Analysis
**Location:** `risk-return/`
**Purpose:** Analyzes risk-adjusted performance using Modern Portfolio Theory
**Usage:** `node analysis/risk-return/run-analysis.js`

Features:
- Scatter plot analysis of risk vs return
- Efficient frontier calculations
- Outperformer identification
- eToro post generation

### 2. Daily Reports
**Location:** `generate-daily-post.js`
**Purpose:** Generates daily census summaries
**Usage:** `node analysis/generate-daily-post.js`

### 3. Weekly Reports
**Location:** `generate-weekly-post.js`
**Purpose:** Generates weekly trend analysis
**Usage:** `node analysis/generate-weekly-post.js`

### 4. Monthly Reports
**Location:** `generate-monthly-post.js`
**Purpose:** Generates monthly performance summaries
**Usage:** `node analysis/generate-monthly-post.js`

## Data Requirements

All analysis tools require:
- eToro census data in `public/data/`
- JSON files in format: `etoro-data-YYYY-MM-DD-HH-MM.json`
- Minimum 30 days of data for meaningful analysis

## Output Locations

- **Analysis Results:** `public/analysis-results/`
- **eToro Posts:** `public/analysis-results/etoro-post-YYYY-MM-DD.txt`
- **Charts:** Available at `/risk-return` page

## Periodic Updates

### Recommended Schedule
1. **Daily:** Run daily post generator after census collection
2. **Weekly:** Run weekly analysis on Sundays
3. **Monthly:** Run monthly summary on 1st of month
4. **Risk-Return:** Run when significant data changes occur

### Manual Process
1. Ensure latest census data is available
2. Run appropriate analysis script
3. Review output for accuracy
4. Post to eToro if applicable
5. Update chart data if needed

## Development

To add new analysis types:
1. Create new script in `analysis/` directory
2. Follow existing naming conventions
3. Document in this README
4. Add to main project documentation