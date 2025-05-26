import { PopularInvestor, UserDetail } from '../models/user';
import { UserPortfolio } from '../models/user-portfolio';
import { CensusAnalysis, PortfolioStats, InstrumentHolding, PerformerStats } from '../models/census';
import { getUserPortfolio, getUsersDetailsByUsernames, getUserAvatarUrl } from './user-service';
import { getInstrumentDetails, getInstrumentDisplayName, getInstrumentSymbol, getInstrumentImageUrl, InstrumentDisplayData } from './instrument-service';

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export async function performCensusAnalysis(
  investors: PopularInvestor[], 
  onProgress?: ProgressCallback
): Promise<CensusAnalysis> {
  console.log(`Performing census analysis on ${investors.length} investors`);
  
  const updateProgress = (progress: number, message: string) => {
    console.log(`Progress: ${progress}% - ${message}`);
    if (onProgress) {
      onProgress(progress, message);
    }
  };
  
  updateProgress(5, 'Starting portfolio analysis...');
  
  const portfolioStats: PortfolioStats[] = [];
  const instrumentData: { [instrumentId: number]: { 
    holdersCount: number; 
    name: string;
    totalAllocation: number;
    allocations: number[];
  } } = {};
  
  let processedCount = 0;
  for (const investor of investors) {
    try {
      const portfolio = await getUserPortfolio(investor.userName);
      const stats = calculatePortfolioStats(investor, portfolio);
      portfolioStats.push(stats);
      
      Object.entries(stats.instruments).forEach(([instrumentId, percentage]) => {
        const id = parseInt(instrumentId);
        if (!instrumentData[id]) {
          instrumentData[id] = { 
            holdersCount: 0, 
            name: `Instrument ${id}`,
            totalAllocation: 0,
            allocations: []
          };
        }
        instrumentData[id].holdersCount++;
        instrumentData[id].totalAllocation += percentage;
        instrumentData[id].allocations.push(percentage);
      });
      
      processedCount++;
      const progressPercent = 5 + Math.round((processedCount / investors.length) * 70);
      updateProgress(progressPercent, `Processed ${processedCount}/${investors.length} portfolios...`);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error fetching portfolio for ${investor.userName}:`, error);
      processedCount++;
      const progressPercent = 5 + Math.round((processedCount / investors.length) * 70);
      updateProgress(progressPercent, `Processed ${processedCount}/${investors.length} portfolios...`);
    }
  }
  
  // Fetch instrument details for all unique instruments
  const allInstrumentIds = Object.keys(instrumentData).map(id => parseInt(id));
  updateProgress(80, `Fetching details for ${allInstrumentIds.length} unique instruments...`);
  
  const instrumentDetails = await getInstrumentDetails(allInstrumentIds);
  
  updateProgress(90, 'Processing instrument data...');
  
  // Update instrument names with real data
  Object.keys(instrumentData).forEach(instrumentIdStr => {
    const instrumentId = parseInt(instrumentIdStr);
    const details = instrumentDetails.get(instrumentId);
    if (details) {
      instrumentData[instrumentId].name = getInstrumentDisplayName(details);
    }
  });
  
  updateProgress(90, 'Fetching user avatars...');
  
  // Fetch user details for avatars using usernames (more reliable than customer IDs)
  const usernames = investors.map(investor => investor.userName);
  const userDetails = await getUsersDetailsByUsernames(usernames);
  
  updateProgress(95, 'Finalizing analysis...');
  
  const result = {
    fearGreedIndex: calculateFearGreedIndex(portfolioStats),
    averageUniqueInstruments: calculateAverageUniqueInstruments(portfolioStats),
    averageCashPercentage: calculateAverageCashPercentage(portfolioStats),
    uniqueInstrumentsDistribution: calculateUniqueInstrumentsDistribution(portfolioStats),
    cashPercentageDistribution: calculateCashPercentageDistribution(portfolioStats),
    topHoldings: calculateTopHoldings(instrumentData, instrumentDetails, investors.length),
    returnsDistribution: calculateReturnsDistribution(investors),
    riskScoreDistribution: calculateRiskScoreDistribution(investors),
    topPerformers: calculateTopPerformers(investors, portfolioStats, userDetails)
  };
  
  updateProgress(100, 'Analysis complete!');
  return result;
}

function calculatePortfolioStats(investor: PopularInvestor, portfolio: UserPortfolio): PortfolioStats {
  const instruments: { [instrumentId: number]: number } = {};
  let totalInvested = 0;
  let cashPercentage = 0;
  
  if (!portfolio.positions || portfolio.positions.length === 0) {
    // If no positions, assume 100% cash
    return {
      username: investor.userName,
      cashPercentage: 100,
      uniqueInstruments: 0,
      instruments: {}
    };
  }
  
  portfolio.positions.forEach(position => {
    const percentage = position.investmentPct || 0;
    totalInvested += percentage;
    
    if (position.instrumentId) {
      instruments[position.instrumentId] = (instruments[position.instrumentId] || 0) + percentage;
    }
  });
  
  cashPercentage = Math.max(0, 100 - totalInvested);
  
  return {
    username: investor.userName,
    cashPercentage,
    uniqueInstruments: Object.keys(instruments).length,
    totalGain: investor.gain,
    instruments
  };
}

function calculateFearGreedIndex(portfolioStats: PortfolioStats[]): number {
  if (portfolioStats.length === 0) return 50;
  
  const avgCashPercentage = portfolioStats.reduce((sum, stats) => sum + stats.cashPercentage, 0) / portfolioStats.length;
  
  // Map cash percentage to Fear & Greed index
  // Linear scale from 40% cash (0) to 0% cash (100)
  // 40%+ cash = 0 (Extreme Fear)
  // 0% cash = 100 (Extreme Greed)
  
  let fearGreedIndex: number;
  
  if (avgCashPercentage >= 40) {
    // 40% or more cash = 0 (extreme fear)
    fearGreedIndex = 0;
  } else {
    // Linear scale from 40% (0) to 0% (100)
    fearGreedIndex = ((40 - avgCashPercentage) / 40) * 100;
  }
  
  return Math.round(Math.max(0, Math.min(100, fearGreedIndex)));
}

function calculateAverageUniqueInstruments(portfolioStats: PortfolioStats[]): number {
  if (portfolioStats.length === 0) return 0;
  
  const total = portfolioStats.reduce((sum, stats) => sum + stats.uniqueInstruments, 0);
  return Math.round((total / portfolioStats.length) * 10) / 10;
}

function calculateAverageCashPercentage(portfolioStats: PortfolioStats[]): number {
  if (portfolioStats.length === 0) return 0;
  
  const total = portfolioStats.reduce((sum, stats) => sum + stats.cashPercentage, 0);
  return Math.round((total / portfolioStats.length) * 10) / 10;
}

function calculateUniqueInstrumentsDistribution(portfolioStats: PortfolioStats[]): { [range: string]: number } {
  const distribution: { [range: string]: number } = {
    '1-5': 0,
    '6-10': 0,
    '11-20': 0,
    '21-50': 0,
    '50+': 0
  };
  
  portfolioStats.forEach(stats => {
    const count = stats.uniqueInstruments;
    if (count <= 5) distribution['1-5']++;
    else if (count <= 10) distribution['6-10']++;
    else if (count <= 20) distribution['11-20']++;
    else if (count <= 50) distribution['21-50']++;
    else distribution['50+']++;
  });
  
  return distribution;
}

function calculateCashPercentageDistribution(portfolioStats: PortfolioStats[]): { [range: string]: number } {
  const distribution: { [range: string]: number } = {
    '0-10%': 0,
    '11-25%': 0,
    '26-50%': 0,
    '51-75%': 0,
    '76-100%': 0
  };
  
  portfolioStats.forEach(stats => {
    const percentage = stats.cashPercentage;
    if (percentage <= 10) distribution['0-10%']++;
    else if (percentage <= 25) distribution['11-25%']++;
    else if (percentage <= 50) distribution['26-50%']++;
    else if (percentage <= 75) distribution['51-75%']++;
    else distribution['76-100%']++;
  });
  
  return distribution;
}

function calculateTopHoldings(
  instrumentData: { [instrumentId: number]: { 
    holdersCount: number; 
    name: string;
    totalAllocation: number;
    allocations: number[];
  } },
  instrumentDetails?: Map<number, InstrumentDisplayData>,
  totalInvestors: number = 1
): InstrumentHolding[] {
  return Object.entries(instrumentData)
    .map(([instrumentId, data]) => {
      const id = parseInt(instrumentId);
      const details = instrumentDetails?.get(id);
      const averageAllocation = data.allocations.length > 0 
        ? data.totalAllocation / data.allocations.length 
        : 0;
      
      const instrumentName = details ? getInstrumentDisplayName(details) : data.name;
      const symbol = details ? getInstrumentSymbol(details) : data.name || `ID-${id}`;
      const imageUrl = details ? getInstrumentImageUrl(details) : undefined;
      
      console.log(`Instrument ${id}:`, {
        instrumentDisplayName: details?.instrumentDisplayName,
        symbolFull: details?.symbolFull,
        hasImages: !!details?.images,
        imageCount: details?.images?.length || 0,
        selectedImageUrl: imageUrl,
        finalName: instrumentName,
        finalSymbol: symbol
      });
      
      return {
        instrumentId: id,
        instrumentName: instrumentName,
        symbol: symbol,
        imageUrl: imageUrl,
        holdersCount: data.holdersCount,
        holdersPercentage: Math.round((data.holdersCount / totalInvestors) * 100 * 10) / 10,
        averageAllocation: Math.round(averageAllocation * 10) / 10,
        totalAllocation: Math.round(data.totalAllocation * 10) / 10
      };
    })
    .sort((a, b) => b.holdersCount - a.holdersCount)
; // No limit on holdings - pagination handled in UI
}

function calculateReturnsDistribution(investors: PopularInvestor[]): { [range: string]: number } {
  const distribution: { [range: string]: number } = {
    'Loss': 0,
    '0-10%': 0,
    '11-25%': 0,
    '26-50%': 0,
    '51-100%': 0,
    '100%+': 0
  };
  
  investors.forEach(investor => {
    const gain = investor.gain;
    if (gain < 0) distribution['Loss']++;
    else if (gain <= 10) distribution['0-10%']++;
    else if (gain <= 25) distribution['11-25%']++;
    else if (gain <= 50) distribution['26-50%']++;
    else if (gain <= 100) distribution['51-100%']++;
    else distribution['100%+']++;
  });
  
  return distribution;
}

function calculateRiskScoreDistribution(investors: PopularInvestor[]): { [range: string]: number } {
  const distribution: { [range: string]: number } = {
    'Conservative (1-3)': 0,
    'Moderate (4-5)': 0,
    'Aggressive (6-7)': 0,
    'Very High Risk (8-10)': 0
  };
  
  investors.forEach(investor => {
    const riskScore = investor.riskScore || 0;
    if (riskScore >= 1 && riskScore <= 3) {
      distribution['Conservative (1-3)']++;
    } else if (riskScore >= 4 && riskScore <= 5) {
      distribution['Moderate (4-5)']++;
    } else if (riskScore >= 6 && riskScore <= 7) {
      distribution['Aggressive (6-7)']++;
    } else if (riskScore >= 8 && riskScore <= 10) {
      distribution['Very High Risk (8-10)']++;
    }
  });
  
  return distribution;
}

function calculateTopPerformers(investors: PopularInvestor[], portfolioStats: PortfolioStats[], userDetails: Map<string, UserDetail>): PerformerStats[] {
  return investors
    .map(investor => {
      const portfolio = portfolioStats.find(p => p.username === investor.userName);
      const userDetail = userDetails.get(investor.userName);
      
      return {
        username: investor.userName || 'Unknown',
        fullName: investor.fullName || investor.userName || 'Unknown Investor',
        gain: investor.gain || 0,
        riskScore: investor.riskScore || 0,
        winRatio: investor.winRatio || 0,
        copiers: investor.copiers || 0,
        cashPercentage: portfolio?.cashPercentage || 0,
        avatarUrl: userDetail ? getUserAvatarUrl(userDetail) : investor.avatarUrl
      };
    })
    .filter(performer => performer.username !== 'Unknown') // Filter out completely unknown investors
    .sort((a, b) => b.copiers - a.copiers) // Sort by copiers descending
; // No limit on performers - pagination handled in UI
}

