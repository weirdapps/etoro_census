# eToro Popular Investors Census

A modern web application for analyzing the portfolios and performance metrics of eToro's most popular investors (PIs). Built with Next.js 15, TypeScript, and Tailwind CSS featuring an **optimized architecture** for robust data collection and analysis.

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

## 🔧 Analysis Tools

The project includes powerful analysis tools for deep behavioral insights:

### **Multi-Band Investor Analysis**
```bash
# Analyze behavior across investor tiers (100, 500, 1000, 1500)
node analysis-tools/market-behavior/analyze-investor-bands.js all
```
- Asset adoption/exit tracking by investor tier
- Cash position changes across bands
- Cross-band behavioral comparison

### **Cash Position & Risk Sentiment Analysis**
```bash
# Individual investor cash tracking with sentiment analysis
node analysis-tools/market-behavior/analyze-cash-trends.js 100
```
- Individual investor cash position changes
- Risk sentiment indicators (defensive vs aggressive)
- Performance correlation analysis

### **Market Behavior Tools**
- `analyze-investor-position-deltas.js` - Overall market sentiment
- `analyze-popularity-trends-top100.js` - Elite vs masses behavior
- `analyze-holdings-vs-positions.js` - Accumulation vs distribution patterns

See `analysis-tools/README.md` for complete documentation.

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
```

## 🔍 Analysis Tools

The project includes comprehensive analysis tools for deep data insights:

### Quick Start
```bash
# Key market insights (start here)
node analyze.js deltas

# Bitcoin analysis
node analyze.js btc

# Any instrument trends
node analyze.js instrument nvidia

# Elite investor behavior
node analyze.js top100

# Help and all commands
node analyze.js help
```

### Tool Categories
- **📊 Market Behavior**: Investor vs position dynamics, trends, accumulation patterns
- **📈 Instruments**: Individual asset analysis, top holders, trends over time  
- **👑 Elite Insights**: Top 100 investor behavior vs general population
- **📝 Examples**: Common queries and data exploration

See [`analysis-tools/README.md`](analysis-tools/README.md) for detailed documentation.

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