# eToro Census Analysis Tools

This directory contains comprehensive analysis tools for processing eToro Popular Investor data and generating actionable insights.

## 🔥 Featured Scripts

### **Dynamic Hot Hands Analysis** (RECOMMENDED)
**Location:** `dynamic-hot-hands-analysis.js`  
**Purpose:** Identifies top momentum investors with recent performance tracking  
**Features:** Auto-updates date thresholds, trending assets, performance metrics  
**Usage:** `node analysis/dynamic-hot-hands-analysis.js`

### **Performance Analysis Suite**
**Location:** `corrected-stock-analysis.js`, `top100-performance-analysis.js`  
**Purpose:** Risk-adjusted performance analysis with proper unique investor counting  
**Usage:** `node analysis/corrected-stock-analysis.js`

## Directory Structure

```
analysis/
├── README.md                          # This file
├── dynamic-hot-hands-analysis.js     # 🔥 Primary analysis tool
├── hot-hands-recent-additions.js     # Legacy fixed-date version
├── corrected-stock-analysis.js       # Fixed algorithm for stock recommendations
├── top100-performance-analysis.js    # Risk-adjusted performance scoring
├── stock-recommendations-report.js   # ⚠️ DEPRECATED - Contains algorithm bug
├── CORRECTED_INVESTMENT_REPORT.md    # Honest assessment after fixes
├── INVESTMENT_INSIGHTS_REPORT.md     # Original flawed analysis (reference)
├── generate-daily-post.js            # 📱 Daily social media posts
├── generate-weekly-post.js           # 📱 Weekly trend analysis  
├── generate-monthly-post.js          # 📱 Monthly insights
└── follower-distribution/            # Follower analysis tools
    ├── README.md                      # Follower analysis documentation
    ├── generate-follower-chart.js    # Interactive chart generator
    └── extract-top-investors.js      # Top investor data extraction
```

## Analysis Types

### 1. 🔥 Hot Hands Analysis (Primary Tool)
**Location:** `dynamic-hot-hands-analysis.js`  
**Purpose:** Real-time momentum analysis with trending positions  
**Features:** 
- Auto-finds latest data files
- Dynamic 90/45-day thresholds
- Hot hands scoring (YTD 70% + recent momentum 30%)
- Trending assets identification
- Performance win rate tracking
**Usage:** `node analysis/dynamic-hot-hands-analysis.js`

### 2. 📊 Performance Analysis
**Location:** `corrected-stock-analysis.js`  
**Purpose:** Fixed algorithm for accurate stock overlap analysis  
**Features:**
- Proper unique investor counting
- Risk-adjusted scoring
- Core holdings identification
- Realistic conviction levels
**Usage:** `node analysis/corrected-stock-analysis.js`

### 3. 📱 Social Media Posts (Enhanced July 2025)
**Locations:** `generate-daily-post.js`, `generate-weekly-post.js`, `generate-monthly-post.js`  
**Purpose:** Social media content with Fear & Greed Index, copier tracking, insights  
**Features:**
- Fear & Greed Index calculation with market mood emojis
- Copier activity tracking (gains/losses with thresholds)
- Username format: "Name (@username)" for social compatibility
- Unicode sans serif bold fonts (eToro-compatible)
- Trading activity metrics and top holdings analysis
**Usage:** 
```bash
node analysis/generate-daily-post.js    # Daily + Fear & Greed Index
node analysis/generate-weekly-post.js   # Weekly trends + copier changes
node analysis/generate-monthly-post.js  # Monthly insights + risk sentiment
```

### 4. 📈 Follower Distribution Analysis
**Location:** `follower-distribution/`  
**Purpose:** Power law distribution analysis with interactive charts  
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