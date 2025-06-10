# eToro Census Analysis Tools

This directory contains analysis scripts for processing eToro Popular Investors census data. All scripts work with the JSON data files in `public/data/`.

## Directory Structure

- **📊 `instruments/`** - Individual asset analysis tools
- **📈 `market-behavior/`** - Market-wide trend and behavior analysis *(NEW TOOLS ADDED)*
- **📝 `examples/`** - Example queries and demonstrations
- **🗄️ `deprecated/`** - Archived scripts (not recommended for use)

## 🚀 Quick Start - Most Useful Tools

### **Multi-Band Investor Analysis**
```bash
# Comprehensive analysis across investor tiers
node analysis-tools/market-behavior/analyze-investor-bands.js all

# Focus on elite investors only
node analysis-tools/market-behavior/analyze-investor-bands.js 100
```

### **Cash Position & Risk Sentiment**
```bash
# Deep dive into defensive vs aggressive positioning
node analysis-tools/market-behavior/analyze-cash-trends.js all

# Elite investor cash behavior
node analysis-tools/market-behavior/analyze-cash-trends.js 100
```

### **Market Sentiment Overview**
```bash
# Overall market behavior patterns
node analysis-tools/market-behavior/analyze-investor-position-deltas.js

# What elite investors prefer vs masses
node analysis-tools/market-behavior/analyze-popularity-trends-top100.js
```

## Usage

All scripts should be run from the project root:
```bash
cd /Users/plessas/SourceCode/etoro_census
node analysis-tools/[folder]/[script-name].js [arguments]
```

## Data Requirements

Scripts analyze JSON files in `public/data/` with the format:
- `etoro-data-YYYY-MM-DD-HH-MM.json`
- Minimum 2 files needed for trend analysis
- All 1,500 top Popular Investors included in each file

## Key Concepts

### Core Terminology
- **Holders/Investors**: Unique individuals holding an asset (counts each person once)
- **Positions**: Individual trades/positions (one investor can have multiple positions in same asset)
- **Holdings**: Whether an investor owns any amount of an asset
- **Bands**: Investor tiers (Top 100, 500, 1000, 1500)

### Behavioral Patterns
- **Accumulation**: Same investors adding more positions (conviction)
- **Distribution**: Investors reducing positions (profit-taking)
- **Adoption**: New investors starting to hold an asset
- **Rotation**: Moving from one asset to another
- **Risk-On**: Deploying cash into investments
- **Risk-Off**: Moving to cash positions

### Analysis Types
- **Cross-Band Comparison**: How different investor tiers behave
- **Cash Trends**: Defensive vs aggressive positioning
- **Asset Rotation**: What's being bought vs sold
- **Sentiment Analysis**: Overall market risk appetite

## Recent Additions (June 2025)

### 🎯 **analyze-investor-bands.js** *(NEW)*
- Multi-band comprehensive analysis (100, 500, 1000, 1500)
- Asset adoption/exit tracking by investor tier
- Cash position changes across bands
- Cross-band behavioral comparison

### 💰 **analyze-cash-trends.js** *(NEW)*
- Individual investor cash position tracking
- Risk sentiment indicators (defensive vs aggressive)
- Cash distribution analysis across bands
- Performance correlation with positioning

See individual folder READMEs for detailed tool documentation.