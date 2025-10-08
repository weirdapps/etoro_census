# eToro Popular Investors Census

A modern web application for analyzing the portfolios and performance metrics of eToro's most popular investors (PIs). Built with Next.js 15, TypeScript, and Tailwind CSS featuring an **optimized architecture** for robust data collection and analysis.

🔗 **Live Dashboard**: [weirdapps.github.io/etoro_census](https://weirdapps.github.io/etoro_census)  
👤 **Author's eToro Profile**: [@plessas](https://www.etoro.com/people/plessas)

![screenshots of etoro PI census](src/assets/census.gif)

## Features

### 📊 **Comprehensive Analysis**
- **Fear & Greed Index**: Market sentiment using linear scale (30% cash = 0, 0% cash = 100)
- **Portfolio Diversification**: Distribution of unique instruments per portfolio
- **Cash Allocation**: Cash percentage distribution across investors
- **Returns Distribution**: Performance ranges across analyzed investors
- **Risk Score Distribution**: Risk appetite analysis (Conservative, Moderate, Aggressive, Very High Risk)
- **Average Trades**: Mean number of trades executed across investors (current year)
- **Average Win Ratio**: Mean percentage of winning trades across investors

### 👥 **Most Copied Investors**
- Ranked by number of copiers (social proof)
- Profile pictures and investor details
- Performance metrics (YTD gain, trades count, win ratio, risk score)
- Cash % with colored badges (green >25%, blue 5-25%, red <5%)
- Pagination support (20 per page, unlimited total)

### 🏆 **Top Holdings Analysis**
- Most popular instruments with asset images
- Average allocation percentages
- Ownership statistics across portfolios
- Yesterday, Week-to-Date (WTD), and Month-to-Date (MTD) returns for each instrument
- Color-coded return indicators (green: positive, red: negative, blue: zero)
- Pagination support (20 per page, unlimited total)

### ⚡ **Real-time Progress Tracking**
- Server-Sent Events for live analysis updates
- Detailed progress messages during processing
- Optimized batch processing for maximum performance

## Configuration

### **Investor Selection**
- **Range**: 1-1500 investors (input validation)
- **Default**: 100 investors
- **API Limit**: eToro API caps at exactly 1,500 investors

### **Performance Periods**
- Year to Date (default)
- Current Month/Quarter
- Last Year/Two Years
- Historical periods (1, 3, 6 months ago)

## 📱 Social Media Post Generators

Generate formatted posts for the eToro community:

```bash
# Daily census update with Fear & Greed Index
node analysis/daily-post.js

# Weekly summary with trend analysis
node analysis/weekly-post.js

# Monthly report with comprehensive insights
node analysis/monthly-post.js

# Hot hands analysis - investors with winning streaks
node analysis/hot-hands.js
```

All posts feature:
- Sans-serif bold formatting for eToro compatibility
- Top 5 copier gainers/losers tracking
- Performance comparisons between Top 100 and broad market
- Smart insights based on market conditions

## 🚀 Optimized Architecture

### **Single-Pass Data Collection**
- **One API fetch** collects ALL data (investors, portfolios, trade info, instruments, user details)
- **Multiple analyses** generated from the same dataset
- **No redundant API calls** - eliminates rate limiting issues
- **Circuit breakers** and adaptive delays for reliability
- **Trade Info Integration** - Fetches trades count and win ratio with fallback handling

### **Efficient Processing**
- **DataCollectionService**: Comprehensive data gathering with progress tracking
- **AnalysisService**: Fast analysis generation without API dependencies
- **Smart batching**: 50 items per API call with intelligent error handling
- **Timeout protection**: 30-second timeouts with graceful fallbacks

### **Frontend**
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript with strict typing
- **Styling**: Tailwind CSS with Radix UI components
- **Validation**: Zod schemas for data models

### **Backend**
- **Optimized Endpoint**: `/api/optimized-report` for all report generation
- **Streaming**: Server-Sent Events for real-time progress
- **Error Handling**: Comprehensive error boundaries and recovery
- **Data Export**: JSON data export with all collected information

### **eToro API Integration**
- **Authentication**: X-API-KEY, X-USER-KEY, X-REQUEST-ID headers
- **Endpoints**: Popular investors, user portfolios, instrument details, closing prices
- **Data Models**: Strongly typed interfaces for all API responses
- **Rate Limiting**: Intelligent delays and circuit breakers


## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                     # API routes
│   │   ├── optimized-report/   # Main optimized analysis endpoint
│   │   ├── extract-instruments/ # Instrument extraction utility
│   │   ├── list-reports/       # Report listing endpoint
│   │   └── users/              # User data endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main dashboard page
├── components/
│   ├── census/                 # Analysis components
│   │   ├── cash-allocation.tsx
│   │   ├── fear-greed-gauge.tsx
│   │   ├── investor-selector.tsx
│   │   ├── portfolio-diversification.tsx
│   │   ├── returns-distribution.tsx
│   │   ├── risk-score-distribution.tsx
│   │   ├── top-holdings.tsx
│   │   └── top-performers.tsx
│   └── ui/                     # Reusable UI components
├── lib/
│   ├── models/                 # TypeScript interfaces
│   │   ├── census.ts          # Analysis data models
│   │   ├── user.ts            # User and investor models
│   │   └── user-portfolio.ts  # Portfolio data models
│   ├── services/              # Optimized business logic
│   │   ├── data-collection-service.ts # Comprehensive data collection
│   │   ├── analysis-service.ts        # Fast multi-band analysis
│   │   ├── instrument-service.ts      # Asset data service
│   │   └── user-service.ts            # User data service
│   ├── etoro-api-config.ts    # API configuration
│   └── utils.ts               # Utility functions
└── middleware.ts              # Next.js middleware

analysis/
├── daily-post.js                      # Daily census update generator
├── weekly-post.js                     # Weekly summary generator
├── monthly-post.js                    # Monthly report generator
├── generate-all-posts.js              # Batch generate all social posts
├── hot-hands.js                       # Hot hands analysis
├── hot-hands-momentum.js              # Momentum-based hot hands analysis
├── follower-distribution/             # Follower distribution analysis
│   ├── generate-follower-chart.js    # Interactive follower charts
│   └── extract-top-investors.js      # Extract top investor data
├── performance-comparison/            # Performance comparison tools
│   ├── extract-performance-timeseries.js
│   ├── analyze-outperformance-factors.js
│   ├── analyze-outperformance-detailed.js
│   └── create-standalone-chart.js
├── risk-return/                       # Risk vs return analysis
│   ├── calculate-proper-metrics.js   # Calculate risk/return metrics
│   ├── simple-working-chart.html     # Interactive risk/return chart
│   └── README.md                     # Detailed documentation
├── lib/                              # Shared utilities
│   └── utils.js                      # Common functions
└── output/                           # Analysis output files
```

## 🔍 Analysis Tools

The project includes powerful analysis tools for deep insights into investor behavior and performance:

### Social Media Post Generators
```bash
# Generate daily market update
node analysis/daily-post.js

# Generate weekly summary
node analysis/weekly-post.js

# Generate monthly report
node analysis/monthly-post.js

# Generate all posts at once
node analysis/generate-all-posts.js
```

### Performance Analysis
```bash
# Hot hands analysis - investors on winning streaks
node analysis/hot-hands.js

# Momentum-based analysis
node analysis/hot-hands-momentum.js

# Follower distribution analysis
cd analysis/follower-distribution
node generate-follower-chart.js
```

### Advanced Tools
- **Risk vs Return**: See `analysis/risk-return/README.md` for interactive risk/return charts
- **Performance Comparison**: Tools in `analysis/performance-comparison/` for detailed outperformance analysis
- **Follower Distribution**: Power law analysis of follower counts across all 1,500 investors

## Getting Started

### **Prerequisites**
- Node.js 18+ 
- npm/yarn/pnpm
- eToro API credentials

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd etoro_census
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   Create a `.env.local` file:
   ```env
   ETORO_API_BASE_URL=https://www.etoro.com/api/public
   ETORO_API_KEY=your_api_key_here
   ETORO_USER_KEY=your_user_key_here
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to [http://localhost:3600](http://localhost:3600)

### **Production Build**
```bash
npm run build
npm start
```

## API Integration

### **Required Headers**
- `X-API-KEY`: eToro API authentication key
- `X-USER-KEY`: eToro user-specific key  
- `X-REQUEST-ID`: UUID for request tracking

### **Key Endpoints**
- **Popular Investors**: `/v1/user-info/people/search`
- **User Portfolios**: `/v1/user-info/people/{username}/portfolio/live`
- **Trade Info**: `/v1/user-info/people/{username}/tradeinfo?period=currYear`
- **Instrument Details**: `/v1/market-data/instruments`
- **Historical Closing Prices**: `/v1/market-data/instruments/history/closing-price`
- **User Details**: `/v1/user-info/people` (for avatars)

## 🔧 Performance Optimizations

### **Optimized Data Collection**
- **Single-pass collection**: One API fetch collects ALL required data
- **Circuit breakers**: Automatic error recovery with adaptive delays
- **Timeout protection**: 30-second timeouts prevent hanging requests
- **Smart batching**: 50 items per API call with intelligent error handling

### **Multi-Band Analysis**
- **Zero API calls**: Analysis generated from pre-collected data
- **Multiple bands**: 100, 500, 1000, 1500 investor analyses simultaneously
- **Shared data**: Same dataset used for all analysis bands
- **Fast processing**: No waiting for redundant API calls

### **Streaming & Real-time Updates**
- **Server-Sent Events**: Real-time progress via `/api/optimized-report`
- **Detailed progress**: Phase-by-phase updates with error rates
- **Non-blocking UI**: Responsive interface during long operations
- **Graceful degradation**: Comprehensive error handling and recovery

## Contributing

### **Code Style**
- TypeScript with strict typing
- ESLint and Prettier configuration
- Consistent naming conventions
- Comprehensive error handling

### **Component Guidelines**
- Functional components with hooks
- Props interfaces for all components
- Responsive design with Tailwind CSS
- Accessibility considerations

## License

This project is for educational and analysis purposes. Please ensure compliance with eToro's API terms of service.

## Support

For questions or issues, please check the existing documentation or create an issue in the repository.