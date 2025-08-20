# eToro Census Analysis Scripts

This directory contains analysis scripts for generating insights and social media posts from eToro Popular Investor census data.

## 📱 Social Media Post Generators

### Daily Post Generator
```bash
node daily-post.js
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
node weekly-post.js
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
node monthly-post.js
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

## 📊 Risk-Return Analysis

Interactive chart viewer for risk-return analysis:
```bash
open analysis/risk-return/updated-chart-viewer.html
```

## 📁 Project Structure

```
analysis/
├── daily-post.js          # Daily census update
├── weekly-post.js         # Weekly summary
├── monthly-post.js        # Monthly report
├── hot-hands.js           # Hot hands analysis
├── risk-return/           # Risk-return chart viewer
├── lib/                   # Shared utilities
│   └── utils.js          # Common functions
└── output/               # Analysis results directory
```

## 🔧 Shared Utilities

All scripts use `lib/utils.js` for common operations:
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
node analysis/daily-post.js
node analysis/weekly-post.js
node analysis/monthly-post.js
node analysis/hot-hands.js
```

Scripts work from any directory thanks to intelligent path resolution.