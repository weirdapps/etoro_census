# eToro Census JSON Data Exports

This directory contains daily JSON exports of eToro Popular Investors census data.

## File Structure

- `daily/YYYY-MM-DD.json` - Daily census data file containing all 1500 investors' information

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
      // Basic investor info
      "customerId": 123456,
      "userName": "investor_username",
      "fullName": "Investor Full Name",
      "hasAvatar": true,
      "popularInvestor": true,
      "gain": 15.5,  // Year-to-date gain percentage
      "dailyGain": 0.5,
      "riskScore": 5,  // 1-10 scale
      "copiers": 1234,
      "trades": 567,
      "winRatio": 65.5,
      "country": "US",
      "avatarUrl": "https://...",
      
      // Portfolio data
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
        
        "socialTrades": [
          {
            "socialTradeId": 54321,
            "parentUsername": "copied_investor",
            "investmentPct": 10.0,
            "netProfit": 500,
            "realizedPct": 2.5,
            "unrealizedPct": 5.0,
            "openTimestamp": "2024-02-01T08:00:00"
          }
        ]
      }
    }
  ],
  
  "instruments": [
    {
      "instrumentId": 100,
      "instrumentName": "Apple Inc",
      "symbol": "AAPL",
      "imageUrl": "https://..."
    }
  ],
  
  "analyses": [
    {
      "investorCount": 100,
      "fearGreedIndex": 65,
      "averages": {
        "gain": 12.5,
        "cashPercentage": 15.3,
        "riskScore": 4.5,
        "copiers": 500,
        "uniqueInstruments": 18
      },
      "distributions": {
        "returns": {
          "Loss": 10,
          "0-10%": 30,
          "11-25%": 40,
          "26-50%": 15,
          "51-100%": 4,
          "100%+": 1
        },
        "riskScore": { ... },
        "uniqueInstruments": { ... },
        "cashPercentage": { ... }
      },
      "topHoldings": [ ... ],
      "topPerformers": [ ... ]
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

## Usage Notes

- Files are generated daily at 00:00 UTC
- All performance metrics are Year-to-Date (YTD)
- Portfolio data represents a snapshot at the time of generation
- Large files (typically 20-50MB) - consider streaming/pagination for processing

## Privacy Note

This data is publicly available through eToro's API and contains only public information about Popular Investors who have opted into the program.