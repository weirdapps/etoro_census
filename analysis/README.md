# eToro Census Analysis Scripts

This directory contains analysis scripts for generating insights and social media posts from eToro Popular Investor census data.

## 📱 Social Media Post Generators

### Daily Post Generator
```bash
npm run analysis:daily
```
Generates a formatted daily update comparing today vs yesterday:
- 📊 Performance comparison (Top 100 vs Broad Group)
- 💰 Cash positioning changes
- 💎 Top 10 portfolio holdings with daily changes
- 🚀 Biggest asset moves (additions/reductions)
- 📈 Top 5 copier gainers/losers
- 💡 Smart daily insight

### Weekly Post Generator
```bash
npm run analysis:weekly
```
Creates weekly summary with trend analysis:
- 📈 Performance trends over the week
- ⚖️ Risk sentiment shifts (defensive/aggressive)
- 📊 Trading activity analysis
- 🔄 Major weekly asset moves
- 👥 Top 5 weekly copier changes
- 💡 Weekly key insights

### Monthly Post Generator
```bash
npm run analysis:monthly
```
Comprehensive monthly report with deep insights:
- 🎯 Performance overview with monthly changes
- ⚖️ Risk & cash analysis with trends
- 📊 Trading activity and win ratio trends
- 💎 Top holdings evolution with 🔥/❄️ indicators
- 🔄 Major monthly moves and new entries/exits
- 👥 Monthly copier momentum
- 📝 Monthly market assessment (Bullish/Bearish/Sideways)

### Hot Hands Analysis
```bash
node hot-hands.js
```
Identifies investors with winning streaks:
- Consistent positive performance
- Low volatility (steady gains)
- Active trading patterns
- Risk-adjusted returns

### Momentum-Based Hot Hands
```bash
node hot-hands-momentum.js
```
Advanced momentum-based analysis for identifying trending investors.

### Generate All Posts
```bash
npm run analysis:all
```
Batch generate all social media posts (daily, weekly, monthly) at once.

## 📊 Additional Analysis Tools

### Risk-Return Analysis
Interactive chart viewer for risk vs return visualization:
```bash
cd risk-return/
node calculate-proper-metrics.js
# Then open simple-working-chart.html in browser
```
See `risk-return/README.md` for detailed documentation.

### Follower Distribution Analysis
```bash
cd follower-distribution/
node generate-follower-chart.js
```
Analyzes follower distribution across all 1,500 Popular Investors with interactive charts.

### Performance Comparison
Tools in `performance-comparison/` for detailed outperformance analysis and standalone charts.

## 📁 Project Structure

```
analysis/
├── daily-post.ts                # Daily census update
├── weekly-post.ts               # Weekly summary
├── monthly-post.ts              # Monthly report
├── generate-all-posts.ts        # Batch generate all posts
├── hot-hands.js                 # Hot hands analysis
├── hot-hands-momentum.js        # Momentum-based analysis
├── follower-distribution/       # Follower distribution analysis
│   ├── generate-follower-chart.js
│   └── extract-top-investors.js
├── performance-comparison/      # Performance comparison tools
│   ├── extract-performance-timeseries.js
│   ├── analyze-outperformance-factors.js
│   ├── analyze-outperformance-detailed.js
│   └── create-standalone-chart.js
├── risk-return/                # Risk-return chart viewer
│   ├── calculate-proper-metrics.js
│   ├── simple-working-chart.html
│   └── README.md
├── lib/                        # Shared utilities
│   ├── utils.ts               # Common functions (TypeScript)
│   └── types.ts               # Type definitions
└── output/                    # Analysis results directory
```

## 🔧 Shared Utilities

All scripts use `lib/utils.ts` for common operations:
- Dynamic path resolution (works from any directory)
- Data file loading and parsing
- Instrument mapping and asset info
- Copier change tracking
- Date formatting and number utilities
- No hardcoded paths

## 📂 Data Requirements

Scripts expect data files in `../public/data/` with naming pattern:
```
etoro-data-YYYY-MM-DD-HH-MM.json
```

The utilities automatically locate and load appropriate files based on analysis period.

## 🎨 Output Format

All social media posts feature:
- **Sans-serif bold formatting** for eToro compatibility
- **Emoji indicators** for visual clarity
- **Top 5 tracking** for copier changes
- **Smart insights** based on market conditions
- **Performance metrics** with clear comparisons

## 🚀 Running Scripts

From project root:
```bash
# Social media posts (via npm scripts)
npm run analysis:daily
npm run analysis:weekly
npm run analysis:monthly
npm run analysis:all

# Or directly with tsx:
npx tsx analysis/daily-post.ts
npx tsx analysis/weekly-post.ts
npx tsx analysis/monthly-post.ts
npx tsx analysis/generate-all-posts.ts

# Performance analysis (JavaScript)
node analysis/hot-hands.js
node analysis/hot-hands-momentum.js

# Advanced analysis
cd analysis/follower-distribution && node generate-follower-chart.js
cd analysis/risk-return && node calculate-proper-metrics.js
```

Scripts work from any directory thanks to intelligent path resolution.