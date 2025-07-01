# eToro Census Project Structure

## Overview
A Next.js application that analyzes eToro's top popular investors, generating daily census reports with comprehensive market insights.

## Directory Structure

```
etoro_census/
├── analysis/                    # Post generation scripts
│   ├── generate-daily-post.js   # Daily census update generator
│   ├── generate-weekly-post.js  # Weekly summary generator
│   └── generate-monthly-post.js # Monthly report generator
│
├── public/
│   ├── data/                    # Daily census JSON data files
│   │   └── etoro-data-YYYY-MM-DD-HH-MM.json
│   └── reports/                 # HTML census reports
│       └── etoro-census-YYYY-MM-DD-HH-MM.html
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API endpoints
│   │   │   ├── census-stream/   # SSE for real-time progress
│   │   │   ├── extract-instruments/ # Instrument data extraction
│   │   │   ├── list-reports/    # List available reports
│   │   │   ├── optimized-report/ # Main report generation
│   │   │   └── users/           # User data endpoint
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Main dashboard page
│   │
│   ├── components/
│   │   ├── census/              # Census-specific components
│   │   │   ├── cash-allocation.tsx
│   │   │   ├── fear-greed-gauge.tsx
│   │   │   ├── investor-selector.tsx
│   │   │   ├── portfolio-diversification.tsx
│   │   │   ├── report-generator.tsx
│   │   │   ├── returns-distribution.tsx
│   │   │   ├── risk-score-distribution.tsx
│   │   │   ├── top-holdings.tsx
│   │   │   └── top-performers.tsx
│   │   └── ui/                  # Reusable UI components
│   │
│   └── lib/
│       ├── models/              # TypeScript models
│       ├── services/            # Business logic services
│       │   ├── analysis-service.ts      # Multi-band analysis
│       │   ├── data-collection-service.ts # Optimized data fetching
│       │   ├── instrument-service.ts    # Asset data management
│       │   └── user-service.ts          # User portfolio data
│       └── utils/               # Utility functions
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # Daily automated report generation
│
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── next.config.ts              # Next.js configuration
└── README.md                   # Project documentation
```

## Key Files

### Analysis Scripts
- **generate-daily-post.js**: Creates daily eToro community posts comparing day-to-day changes
- **generate-weekly-post.js**: Generates weekly summaries with trend analysis
- **generate-monthly-post.js**: Produces comprehensive monthly reports with insights

### Data Files
- **etoro-data-*.json**: Complete census data including investor portfolios, metrics, and analysis
- **etoro-census-*.html**: Generated HTML reports for GitHub Pages deployment

### Core Services
- **data-collection-service.ts**: Single-pass data collection with circuit breakers
- **analysis-service.ts**: Multi-band analysis (100/500/1000/1500 investors)
- **optimized-report/route.ts**: Main endpoint for report generation

## Scripts
```bash
npm run dev          # Development server (port 3600)
npm run build        # Production build
npm run lint         # ESLint checking

# Analysis generation
node analysis/generate-daily-post.js    # Generate daily post
node analysis/generate-weekly-post.js   # Generate weekly summary
node analysis/generate-monthly-post.js  # Generate monthly report
```

## Data Flow
1. GitHub Actions triggers daily at 00:00 UTC
2. Optimized report endpoint collects data in single pass
3. Analysis service generates insights for multiple investor bands
4. HTML report and JSON data saved to public directory
5. GitHub Pages deployment serves latest report

## Environment Variables
- `ETORO_API_KEY`: eToro API authentication key
- `ETORO_USER_KEY`: eToro user authentication key