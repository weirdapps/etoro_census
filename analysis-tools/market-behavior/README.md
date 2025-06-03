# Market Behavior Analysis Tools

Advanced tools for analyzing investor behavior patterns and market trends across all assets.

## Scripts

### 🎯 `analyze-investor-position-deltas.js`
**KEY INSIGHTS TOOL - Investor vs Position Analysis**
```bash
node analysis-tools/market-behavior/analyze-investor-position-deltas.js
```

**Best for understanding:**
- 🚀 **Strong Bullish**: ↑ Investors AND ↑ Positions (momentum)
- 💰 **Accumulation**: Same investors buying MORE (conviction)
- 📊 **Profit Taking**: New investors + old ones reducing
- 📉 **Distribution**: Same investors reducing positions
- 🆕 **New Interest**: Fresh investors entering cautiously

### 📈 `analyze-popularity-trends.js`
**Asset popularity changes (All 1,500 investors)**
```bash
node analysis-tools/market-behavior/analyze-popularity-trends.js
```

**Shows:**
- Top gainers by holder count
- Assets losing popularity
- Most popular assets overall
- Holder and percentage changes

### 👑 `analyze-popularity-trends-top100.js`
**Elite investor behavior (Top 100 only)**
```bash
node analysis-tools/market-behavior/analyze-popularity-trends-top100.js
```

**Shows:**
- What top-copied investors prefer
- Elite vs masses differences
- High concentration assets
- Quality bias in elite portfolios

### 🔄 `analyze-holdings-vs-positions.js`
**Detailed accumulation/distribution patterns**
```bash
node analysis-tools/market-behavior/analyze-holdings-vs-positions.js
```

**Shows:**
- Assets where investors are accumulating
- Assets where investors are reducing
- Multi-position holder statistics
- Behavioral insights (conviction vs profit-taking)

## Key Concepts

### Investor vs Position Dynamics
- **Same investors, more positions** = Accumulation (bullish)
- **More investors, fewer positions** = Distribution (rotation)
- **Both increasing** = Strong momentum
- **Both decreasing** = Bearish sentiment

### Behavioral Patterns
- **Core holders adding** = High conviction in existing investors
- **Profit taking** = Early investors selling to new entrants
- **Growing & accumulating** = Both new adoption and accumulation
- **Exodus & selling** = Coordinated exit

## Use Cases

- **Market sentiment analysis**: Is the market bullish or defensive?
- **Smart money tracking**: What are elite investors doing differently?
- **Rotation detection**: Which sectors are gaining/losing favor?
- **Timing analysis**: Are we in accumulation or distribution phase?
- **Conviction measurement**: Which assets have strongest holder conviction?

## Best Practices

1. **Start with deltas analysis** for overall market picture
2. **Use top-100 analysis** to understand elite behavior
3. **Check specific instruments** for detailed asset analysis
4. **Compare timeframes** to identify lasting vs temporary trends