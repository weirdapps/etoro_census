# Risk vs Return Analysis - eToro Popular Investors

## 📊 Analysis Overview

This folder contains the complete risk vs return analysis for the top 100 eToro Popular Investors, showing their performance over the period May 31 - November 11, 2025 (5.5 months).

## 📁 Files

### Essential Files

- **`simple-working-chart.html`** - Main interactive risk vs return chart with Chart.js
  - Shows all 100 investors positioned by risk score (x-axis) and period return (y-axis)
  - Features labeled top performers and smooth efficient frontier curve
  - Mathematical formula: `y = 8.165 * sqrt(x - 1)` (starts at 1,0 ends at 7,20)

- **`calculate-proper-metrics.js`** - Data processing script
  - Processes 169 daily data files from May 31 - November 11, 2025
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

- **Top Performers**: @Ivanectus (63.6%), @Flaten (44.9%), @MercedesSotelo (41.0%), @Enslinjaco (40.2%)
- **Most Copied**: @thomaspj (37K copiers, 25.5% return), @JeppeKirkBonde (27K copiers, 23.7% return)
- **Methodology**: Risk = daily average over 169 days, Return = total period performance
- **Efficient Frontier**: Mathematical curve showing optimal risk/return trade-offs
- **Average Return**: 14.6% over 5.5 months

## 🔧 Technical Details

- **Data Period**: May 31 - November 11, 2025 (169 daily snapshots / 5.5 months)
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

**Exceptional Returns (40%+):**
- @Ivanectus (63.6% return, 1,067 copiers)
- @Flaten (44.9% return, 2,277 copiers)
- @MercedesSotelo (41.0% return, 835 copiers)
- @Enslinjaco (40.2% return, 2,588 copiers)

**High Volume Leaders:**
- @thomaspj (37K copiers, 25.5% return)
- @JeppeKirkBonde (27K copiers, 23.7% return)

**Strong Performers (30%+):**
- @Smudliczek (36.2% return)
- @Kevin_Pando (33.9% return)
- @Michalhla (33.6% return)
- @MarianoPardo (31.2% return)
- @davoyu (31.3% return)

## 🔄 Replication Steps

1. **Data Collection**: Process 169 daily eToro census files (May 31 - November 11, 2025)
2. **Risk Calculation**: Average daily risk scores per investor across all 169 days
3. **Return Calculation**: Total period return (end gain - start gain)
4. **Ranking**: Sort by copier count, select top 100
5. **Visualization**: Plot with efficient frontier overlay

## 📝 Usage Rights

This analysis is for educational purposes. Past performance doesn't guarantee future results. Always do your own research before making investment decisions.