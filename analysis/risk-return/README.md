# Risk vs Return Analysis

This directory contains tools for analyzing risk-adjusted performance of eToro Popular Investors.

## Files

### Core Analysis
- `risk-return-analysis.js` - Main analysis engine that processes eToro data
- `run-analysis.js` - Complete analysis runner with JSON output
- `generate-etoro-post.js` - Creates formatted eToro social media posts

### Data Utilities
- `get-chart-data.js` - Extracts data for chart visualization
- `generate-risk-return-chart.js` - MCP chart generation utility

## Quick Start

### 1. Run Complete Analysis
```bash
# From project root
node analysis/risk-return/run-analysis.js
```

This will:
- Analyze all available eToro census data
- Generate comprehensive risk-return metrics
- Save results to `public/analysis-results/`
- Display summary statistics

### 2. Generate eToro Post
```bash
# From project root
node analysis/risk-return/generate-etoro-post.js
```

This will:
- Run the analysis
- Format results for eToro social media
- Save post text to `public/analysis-results/`
- Display ready-to-copy text

### 3. Extract Chart Data
```bash
# From project root
node analysis/risk-return/get-chart-data.js
```

This will:
- Extract scatter plot data
- Display formatted JavaScript array
- Useful for updating the chart component

## Analysis Output

### Key Metrics
- **Scatter Data**: Risk score vs return for each investor
- **Efficient Frontier**: Theoretical optimal combinations
- **Outperformers**: Investors beating the efficient frontier
- **Quadrant Analysis**: Performance by risk/return categories

### Data Structure
```javascript
{
  metadata: {
    analysisDate: "2025-07-09T12:00:00Z",
    dataPoints: 46,
    period: "May 31 - July 9, 2025"
  },
  scatterData: [
    {
      x: 5.54,           // Risk score
      y: 11.12,          // Period return %
      username: "thomaspj",
      fullName: "Thomas Parry Jones",
      copiers: 40343,
      ytdReturn: 33.31,
      averageRiskScore: 5.54
    }
  ],
  // ... more data
}
```

## Periodic Updates

### Manual Process
1. Wait for new census data to be collected
2. Run `node analysis/risk-return/run-analysis.js`
3. Update chart data in `/src/app/risk-return/page.tsx`
4. Generate new eToro post with updated metrics

### Automation (Future)
- Could be automated with GitHub Actions
- Trigger on new census data
- Auto-update chart component
- Generate posts automatically

## Chart Integration

The analysis feeds into the interactive chart at `/risk-return` which shows:
- Risk vs return scatter plot
- Efficient frontier curve
- Labeled outperformers
- Interactive tooltips

To update the chart with new data:
1. Run `get-chart-data.js`
2. Copy the output array
3. Replace the `analysisData` in `/src/app/risk-return/page.tsx`

## Theory

The analysis applies Modern Portfolio Theory concepts:
- **Risk Score**: eToro's 1-10 risk assessment
- **Returns**: Period percentage returns
- **Efficient Frontier**: Theoretical optimal risk-return combinations
- **Alpha**: Outperformance above the efficient frontier

### Risk Score Filtering
- Includes only investors with 4.0-7.0 risk scores
- Excludes extreme outliers for cleaner visualization
- Typically filters out 1-2 investors per analysis

## Troubleshooting

### Common Issues
1. **No data files**: Ensure census data exists in `public/data/`
2. **Missing dependencies**: Run `npm install` 
3. **Analysis errors**: Check data file formatting
4. **Chart not updating**: Manually copy new data array

### Data Requirements
- Requires eToro census JSON files
- Files should be in `public/data/etoro-data-YYYY-MM-DD-HH-MM.json` format
- Minimum 30 days of data recommended for meaningful analysis