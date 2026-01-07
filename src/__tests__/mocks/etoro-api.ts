import { PopularInvestor, UserDetail, UserTradeInfo } from '@/lib/models/user';
import { UserPortfolio, PortfolioPosition } from '@/lib/models/user-portfolio';
import { InstrumentDetails } from '@/lib/models/instrument';

// Sample investor data for tests
export const mockInvestors: PopularInvestor[] = [
  {
    customerId: 1001,
    userName: 'testinvestor1',
    fullName: 'Test Investor One',
    hasAvatar: true,
    copiers: 5000,
    gain: 25.5,
    riskScore: 4,
    dailyGain: 0.5,
    weeklyGain: 2.3,
    trades: 150,
    winRatio: 68,
    countryId: 197, // UK
  },
  {
    customerId: 1002,
    userName: 'testinvestor2',
    fullName: 'Test Investor Two',
    hasAvatar: true,
    copiers: 3000,
    gain: 18.2,
    riskScore: 5,
    dailyGain: -0.3,
    weeklyGain: 1.1,
    trades: 200,
    winRatio: 55,
    countryId: 69, // Germany
  },
  {
    customerId: 1003,
    userName: 'testinvestor3',
    fullName: 'Test Investor Three',
    hasAvatar: false,
    copiers: 1500,
    gain: 12.0,
    riskScore: 3,
    dailyGain: 0.1,
    weeklyGain: 0.8,
    trades: 80,
    winRatio: 72,
    countryId: 197,
  },
];

// Sample portfolio positions
export const mockPositions: PortfolioPosition[] = [
  {
    instrumentId: 1001,
    instrumentType: 'Stocks',
    investmentPct: 15.5,
    netProfit: 25.3,
    openDate: '2024-01-15',
    currentRate: 185.50,
    openRate: 150.00,
  },
  {
    instrumentId: 1002,
    instrumentType: 'Stocks',
    investmentPct: 12.0,
    netProfit: -5.2,
    openDate: '2024-02-20',
    currentRate: 145.00,
    openRate: 155.00,
  },
  {
    instrumentId: 1003,
    instrumentType: 'ETF',
    investmentPct: 8.5,
    netProfit: 10.1,
    openDate: '2024-03-01',
    currentRate: 450.00,
    openRate: 420.00,
  },
];

export const mockPortfolio: UserPortfolio = {
  positions: mockPositions,
  cashEquity: 10000,
  availableCash: 1500,
  totalValue: 50000,
  profitLoss: 8500,
  profitLossPercentage: 17.0,
};

// Sample trade info
export const mockTradeInfo: UserTradeInfo = {
  trades: 150,
  profitableTrades: 102,
  winRatio: 68,
  avgProfitPct: 12.5,
  avgLossPct: -8.2,
};

// Sample user details
export const mockUserDetails: Record<string, UserDetail> = {
  testinvestor1: {
    username: 'testinvestor1',
    fullName: 'Test Investor One',
    gcid: 1001,
    avatars: [
      { url: 'https://example.com/avatar1-50.png', width: '50', height: '50', type: 'image/png' },
      { url: 'https://example.com/avatar1-150.png', width: '150', height: '150', type: 'image/png' },
    ],
  },
  testinvestor2: {
    username: 'testinvestor2',
    fullName: 'Test Investor Two',
    gcid: 1002,
    avatars: [
      { url: 'https://example.com/avatar2-50.png', width: '50', height: '50', type: 'image/png' },
    ],
  },
};

// Sample instrument details
export const mockInstruments: Record<number, InstrumentDetails> = {
  1001: {
    instrumentId: 1001,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    imageUrl: 'https://example.com/aapl.png',
    instrumentType: 'Stocks',
  },
  1002: {
    instrumentId: 1002,
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    imageUrl: 'https://example.com/googl.png',
    instrumentType: 'Stocks',
  },
  1003: {
    instrumentId: 1003,
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    imageUrl: 'https://example.com/spy.png',
    instrumentType: 'ETF',
  },
};

// Mock collected data for analysis tests
export const mockCollectedData = {
  investors: mockInvestors,
  portfolios: new Map([
    ['testinvestor1', mockPortfolio],
    ['testinvestor2', { ...mockPortfolio, positions: mockPositions.slice(0, 2) }],
    ['testinvestor3', { ...mockPortfolio, positions: mockPositions.slice(1) }],
  ]),
  tradeInfo: new Map([
    ['testinvestor1', mockTradeInfo],
    ['testinvestor2', { ...mockTradeInfo, trades: 200, winRatio: 55 }],
    ['testinvestor3', { ...mockTradeInfo, trades: 80, winRatio: 72 }],
  ]),
  instruments: {
    details: mockInstruments,
    priceData: new Map([
      [1001, { yesterdayReturn: 1.5, weekTdReturn: 3.2, monthTdReturn: 5.8 }],
      [1002, { yesterdayReturn: -0.8, weekTdReturn: 1.1, monthTdReturn: -2.3 }],
      [1003, { yesterdayReturn: 0.3, weekTdReturn: 1.8, monthTdReturn: 4.2 }],
    ]),
  },
  userDetails: new Map(Object.entries(mockUserDetails)),
  metadata: {
    period: 'CurrYear',
    maxRequested: 100,
    totalCollected: 3,
    collectedAtUTC: new Date().toISOString(),
  },
};
