# eToro Census JSON Data Exports

This directory contains daily JSON exports of eToro Popular Investors census data generated using the **optimized data collection architecture**.

## Directory Structure

```
public/data/
├── current/           # Recent data (last 7 days, uncompressed)
│   └── etoro-data-YYYY-MM-DD-HH-MM.json
├── archive/           # Historical data (compressed with gzip)
│   ├── 2025/
│   │   ├── 06/
│   │   │   └── etoro-data-2025-06-15-02-03.json.gz
│   │   └── ...
│   └── 2026/
├── census-data-latest.json   # Most recent data (always uncompressed)
├── latest-census.json        # Alternative latest data reference
└── README.md
```

## File Naming Convention

- `etoro-data-YYYY-MM-DD-HH-MM.json` - Complete census data with UTC timestamp

## Data Retention Policy

- **Last 7 days**: Kept uncompressed in `current/` for fast access
- **Older data**: Compressed with gzip (~90% size reduction) in `archive/`
- **No data is deleted**: All historical data is preserved

## Working with Compressed Data

### Decompress for Analysis

```bash
# List available archives
node scripts/decompress-for-analysis.js --list

# Decompress specific month
node scripts/decompress-for-analysis.js 2025-06

# Decompress specific date
node scripts/decompress-for-analysis.js 2025-06-15

# Decompress all archives
node scripts/decompress-for-analysis.js --all

# Files are extracted to public/data/temp-analysis/
```

### Manual Decompression

```bash
# Decompress a single file
gunzip -k archive/2025/06/etoro-data-2025-06-15-02-03.json.gz

# View without decompressing
zcat archive/2025/06/etoro-data-2025-06-15-02-03.json.gz | head -100
```

## JSON Structure

Each JSON file contains the following structure:

```json
{
  "metadata": {
    "generatedAt": "ISO 8601 timestamp",
    "generatedAtUTC": "Human-readable UTC timestamp",
    "totalInvestors": 1500,
    "analysisGroups": [
      { "count": 100 },
      { "count": 500 },
      { "count": 1000 },
      { "count": 1500 }
    ],
    "dataSource": "eToro API",
    "period": "CurrYear"
  },

  "investors": [
    {
      "customerId": 123456,
      "userName": "investor_username",
      "fullName": "Investor Full Name",
      "hasAvatar": true,
      "popularInvestor": true,
      "gain": 15.5,
      "dailyGain": 0.5,
      "riskScore": 5,
      "copiers": 1234,
      "trades": 567,
      "winRatio": 65.5,
      "country": "US",
      "avatarUrl": "https://...",

      "portfolio": {
        "realizedCreditPct": 5.2,
        "unrealizedCreditPct": 10.3,
        "totalValue": 50000,
        "profitLoss": 7500,
        "profitLossPercentage": 15.0,
        "positionsCount": 25,
        "socialTradesCount": 3,

        "positions": [
          {
            "positionId": 12345,
            "instrumentId": 100,
            "instrumentName": "Apple Inc",
            "isBuy": true,
            "leverage": 1,
            "investmentPct": 5.5,
            "netProfit": 250,
            "currentValue": 2750,
            "currentRate": 175.50,
            "openRate": 165.00,
            "openTimestamp": "2024-01-15T10:30:00"
          }
        ],

        "socialTrades": [...]
      }
    }
  ],

  "instruments": [...],

  "analyses": [
    {
      "investorCount": 100,
      "fearGreedIndex": 65,
      "averages": {...},
      "distributions": {...},
      "topHoldings": [...],
      "topPerformers": [...]
    }
  ]
}
```

## Data Fields

### Investor Fields
- `customerId`: Unique eToro customer ID
- `userName`: eToro username (handle)
- `fullName`: Display name
- `gain`: Year-to-date performance percentage
- `riskScore`: Risk level from 1 (lowest) to 10 (highest)
- `copiers`: Number of users copying this investor
- `winRatio`: Percentage of profitable trades

### Portfolio Fields
- `investmentPct`: Percentage of portfolio allocated to this position
- `netProfit`: Current profit/loss in USD
- `leverage`: Leverage used (1 = no leverage)

## Storage Statistics

| Metric | Uncompressed | Compressed |
|--------|--------------|------------|
| Per file | ~77 MB | ~8 MB |
| Compression ratio | - | ~90% |
| 30 days | ~2.3 GB | ~240 MB |
| 1 year | ~28 GB | ~2.8 GB |

## Usage Notes

- Files are generated daily at 00:00 UTC (automatic) and can be generated manually
- Generated using **optimized single-pass data collection** - no redundant API calls
- All performance metrics are Year-to-Date (YTD)
- Portfolio data represents a snapshot at the time of generation
- Multiple files per day are preserved with unique timestamps
- **Comprehensive data**: Includes all investor details, portfolios, instruments, and price data

## Maintenance

The compression script runs automatically in the GitHub Actions workflow.

```bash
# Dry run (see what would happen)
node scripts/compress-historical-data.js --dry-run

# Compress files older than 7 days
node scripts/compress-historical-data.js
```

## Architecture Benefits

- **Single API collection**: One comprehensive data fetch for all 1500 investors
- **Multiple analyses**: 100, 500, 1000, 1500 investor bands from the same dataset
- **No rate limiting**: Eliminates redundant API calls that caused previous issues
- **Complete data export**: Full dataset available for further analysis and research

## Privacy Note

This data is publicly available through eToro's API and contains only public information about Popular Investors who have opted into the program.
