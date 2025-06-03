# Instrument Analysis Tools

Tools for analyzing specific assets/instruments over time.

## Scripts

### 📊 `analyze-instrument-trends.js`
**Most comprehensive instrument analysis tool**
```bash
node analysis-tools/instruments/analyze-instrument-trends.js <instrument-name>
```

**Examples:**
```bash
node analysis-tools/instruments/analyze-instrument-trends.js bitcoin
node analysis-tools/instruments/analyze-instrument-trends.js NVDA
node analysis-tools/instruments/analyze-instrument-trends.js "S&P 500"
```

**Output:**
- Daily holder counts and percentages
- Average allocation per investor
- Rankings in top holdings
- Yesterday/Week/Month returns
- Trend summary with holder changes
- Top individual holders

### ₿ `analyze-btc-holdings.js`
**Bitcoin-specific analysis (fastest for BTC)**
```bash
node analysis-tools/instruments/analyze-btc-holdings.js
```

**Output:**
- Bitcoin holder trends over time
- Percentage of investors holding BTC
- Average allocation percentages
- Ranking in top holdings

### 👥 `find-top-holders.js`
**Find biggest holders of any asset**
```bash
node analysis-tools/instruments/find-top-holders.js <instrument-name>
```

**Examples:**
```bash
node analysis-tools/instruments/find-top-holders.js nvidia
node analysis-tools/instruments/find-top-holders.js bitcoin
```

**Output:**
- Top 10 holders by allocation percentage
- Investor details (copiers, gains, risk scores)
- Total holder statistics

## Use Cases

- **Track specific asset adoption**: How is Tesla trending?
- **Find conviction players**: Who holds 50%+ in NVIDIA?
- **Monitor institutional favorites**: What are top 100 investors buying?
- **Spot rotation patterns**: Which assets are gaining/losing holders?

## Tips

- Use fuzzy matching: "tesla", "TSLA", or "Tesla Motors" all work
- Scripts search both company names and ticker symbols
- Results show data for all available dates in your dataset
- Multi-position investors indicate strong conviction or active trading