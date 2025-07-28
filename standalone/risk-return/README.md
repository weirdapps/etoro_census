# Risk vs Return Analysis

This directory contains tools for analyzing risk-adjusted performance of eToro Popular Investors.

## Files

### Core Analysis
- `risk-return-analysis.js` - Main analysis engine that processes eToro data
- `run-analysis.js` - Complete analysis runner with JSON output
- `generate-etoro-post.js` - Creates formatted eToro social media posts

### Interactive Charts
- `clean-chart.html` - **PRIMARY CHART** - Professional risk-return visualization with mathematically correct efficient frontier
- `chart-viewer.html` - Legacy chart viewer (React-based)
- `updated-chart-viewer.html` - Updated chart viewer with real data
- `simple-chart.html` - Simplified version for reference

### Data Utilities
- `get-chart-data.js` - Extracts data for chart visualization
- `generate-risk-return-chart.js` - MCP chart generation utility
- `generate-custom-chart.js` - Custom chart generation
- `show-chart-with-menago76.js` - Special chart highlighting specific investor

### Component Files
- `risk-return-chart.jsx` - React component for chart integration
- `chart-data.json` - Exported chart data
- `analysis-summary.md` - Analysis documentation

## Quick Start

### 1. View Risk-Return Chart
Open `clean-chart.html` in your browser to see the complete risk-return analysis with:
- 99 eToro Popular Investors plotted by risk vs return
- Mathematically correct hyperbolic efficient frontier
- 6 labeled exceptional performers above the frontier
- Interactive tooltips with investor details

### 2. Run Complete Analysis
```bash
# From project root
node standalone/risk-return/run-analysis.js
```

### 3. Generate eToro Post
```bash
# From project root
node standalone/risk-return/generate-etoro-post.js
```

## Chart Features

### clean-chart.html (Primary Chart)
- **99 Investors**: Risk range 2.5-7.5, properly scaled coordinates
- **Mathematical Efficiency Frontier**: True hyperbolic curve σ = √(a + b/μ)
- **Labeled Outperformers**: @MercedesSotelo, @Flaten, @hugo13250, @Napoleon-X, @mick_repo, @Michalhla
- **Analysis Period**: May 31 - July 27, 2025
- **Interactive Tooltips**: Hover for investor details
- **Professional Styling**: eToro branding with clean design

### Technical Details
- **X-axis Scaling**: Risk 2.5-7.5 → Coordinates 150-1150
- **Y-axis Scaling**: Return -10% to 30% → Coordinates 550-50
- **Coordinate Formula**: X = 150 + (risk - 2.5) × 200, Y = 550 - (return + 10) × 12.5
- **Efficient Frontier**: Moved up 5% to be more selective

## Data Structure
```javascript
{
  metadata: {
    analysisDate: "2025-07-27T12:00:00Z",
    dataPoints: 99,
    period: "May 31 - July 27, 2025"
  },
  scatterData: [
    {
      x: 5.42,           // Risk score
      y: 15.38,          // Period return %
      username: "thomaspj",
      fullName: "Thomas Parry Jones", 
      copiers: 39564,
      averageRiskScore: 5.42
    }
  ]
}
```

## Theory

The analysis applies Modern Portfolio Theory:
- **Risk Score**: eToro's risk assessment (2.5-7.5 range)
- **Returns**: Period percentage returns
- **Efficient Frontier**: Mathematical hyperbola representing optimal risk-return combinations
- **Outperformers**: Investors above the efficient frontier demonstrating superior risk-adjusted returns

### Mathematical Foundation
- **Hyperbolic Efficient Frontier**: Uses equation σ = √(a + b/μ) where σ is risk and μ is return
- **Continuous Rising Curve**: Demonstrates diminishing marginal returns as risk increases
- **Scientifically Accurate**: Based on Modern Portfolio Theory literature

## Recent Updates (July 2025)

✅ **Fixed Mathematical Accuracy**: Implemented true hyperbolic efficient frontier  
✅ **Corrected Scaling**: All 99 investors properly positioned according to risk/return values  
✅ **Removed Outliers**: Excluded 2 investors outside 2.5-7.5 risk range  
✅ **Enhanced Labeling**: 6 exceptional performers clearly labeled  
✅ **Professional Styling**: Clean, publication-ready visualization  

## Usage

1. **For Analysis**: Use `clean-chart.html` as the primary chart
2. **For Development**: Reference other chart files for different approaches
3. **For Integration**: Use the React component and data files for web integration
4. **For Updates**: Run analysis scripts when new data is available

## Troubleshooting

### Common Issues
1. **Chart not loading**: Ensure all data-tooltip attributes are properly formatted
2. **Scaling issues**: Verify coordinate calculations match the formulas
3. **Missing investors**: Check if risk scores are within 2.5-7.5 range
4. **Curve problems**: Mathematical hyperbola should continuously rise

### Requirements
- Modern web browser for HTML charts
- Node.js for analysis scripts
- eToro census data in proper JSON format