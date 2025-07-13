# Follower Distribution Analysis

Scripts for analyzing and visualizing the distribution of followers across eToro's 1,500 Popular Investors.

## Scripts

### `generate-follower-chart.js`
Creates an interactive HTML chart showing the power law distribution of followers with labeled milestones and top investors.

**Features:**
- Linear X-axis (positions 1-1500) with no labels
- Individual data points for each investor
- Red milestone markers (50, 100, 500, 1000 copiers)
- Top 10 investor usernames labeled
- Interactive tooltips

**Usage:**
```bash
node generate-follower-chart.js
```

**Output:** 
- `follower-distribution-chart.html` - Interactive chart
- Console output with milestone positions and top investor data

### `extract-top-investors.js`
Utility script to extract top investor information from census data.

**Usage:**
```bash
node extract-top-investors.js
```

## Chart Features

The follower distribution chart reveals:
- **Power law distribution**: Classic long tail with extreme concentration at the top
- **Milestone rankings**: Where specific follower counts rank you among all Popular Investors
- **Elite tier**: Top 10 investors and their follower counts
- **Visual inequality**: Dramatic differences between investor tiers

## Key Insights

- 43% of Popular Investors have fewer than 50 followers
- 1,000 followers puts you in the top 4% (rank 1,440/1,500)
- The top investor (@thomaspj) has 40,169 followers
- Extreme inequality follows social media dynamics