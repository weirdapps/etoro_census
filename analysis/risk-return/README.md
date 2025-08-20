# Risk vs Return Analysis - eToro Popular Investors

## 📊 Analysis Overview

This folder contains the complete risk vs return analysis for the top 100 eToro Popular Investors, showing their performance over the period May 31 - July 31, 2025.

## 📁 Files

### Essential Files

- **`simple-working-chart.html`** - Main interactive risk vs return chart with Chart.js
  - Shows all 100 investors positioned by risk score (x-axis) and period return (y-axis)
  - Features labeled top performers and smooth efficient frontier curve
  - Mathematical formula: `y = 8.165 * sqrt(x - 1)` (starts at 1,0 ends at 7,20)

- **`calculate-proper-metrics.js`** - Data processing script
  - Processes 62 daily data files from May 31 - July 31, 2025
  - Calculates daily averaged risk scores and total period returns
  - Ranks investors by copier count (not performance)
  - Run with: `node calculate-proper-metrics.js`

### Documentation

- **`etoro-post.md`** - Social media post template for sharing the analysis
- **`analysis-summary.md`** - Detailed methodology and findings summary
- **`chart-data.json`** - Processed data output (if generated)

## 🚀 Quick Start

1. **View the Chart**: Open `simple-working-chart.html` in any browser
2. **Replicate Analysis**: Run `node calculate-proper-metrics.js` 
3. **Share Results**: Use content from `etoro-post.md`

## 📈 Key Insights

- **Top Performers**: @hugo13250 (27.1%), @MercedesSotelo (25.9%), @Flaten (24.7%)
- **Most Copied**: @thomaspj (39K copiers), @JeppeKirkBonde (28K copiers)
- **Methodology**: Risk = daily average over 62 days, Return = total period performance
- **Efficient Frontier**: Mathematical curve showing optimal risk/return trade-offs

## 🔧 Technical Details

- **Data Period**: May 31 - July 31, 2025 (62 daily snapshots)
- **Sample Size**: Top 100 investors by copier count
- **Chart Library**: Chart.js with custom plugins for labels
- **Mathematical Model**: Square root efficient frontier theory

## 📊 Chart Features

### Interactive Elements
- **100 Investor Data Points**: Sized by copier count, colored by performance
- **Smart Label Positioning**: 9 top performers labeled with strategic positioning
- **Efficient Frontier Curve**: Smooth mathematical curve from (1,0) to (7,20)
- **Responsive Design**: Works on desktop and mobile browsers

### Mathematical Foundation
- **Square Root Formula**: `y = 8.165 * sqrt(x - 1)`
- **Diminishing Returns**: Classic efficient frontier shape
- **Risk Scale**: 1-7 eToro risk scores (daily averaged)
- **Return Scale**: -5% to 30% period returns

## 🎯 Labeled Performers

**Above Efficient Frontier:**
- @hugo13250 (27.09% return)
- @MercedesSotelo (25.94% return)  
- @Flaten (24.72% return)
- @Napoleon-X (23.1% return)
- @victorlee448 (20.66% return)

**High Volume Leaders:**
- @thomaspj (39K copiers, 14.8% return)
- @JeppeKirkBonde (28K copiers, 10.15% return)

**Rising Stars:**
- @Michalhla (18% return)
- @mick_repo (17.92% return)

## 🔄 Replication Steps

1. **Data Collection**: Process 62 daily eToro census files
2. **Risk Calculation**: Average daily risk scores per investor
3. **Return Calculation**: Total period return (end gain - start gain)
4. **Ranking**: Sort by copier count, select top 100
5. **Visualization**: Plot with efficient frontier overlay

## 📝 Usage Rights

This analysis is for educational purposes. Past performance doesn't guarantee future results. Always do your own research before making investment decisions.